/**
 * تست ساخت پیش‌نویس از لایهٔ سروری guide-admin (DASH)، بدون دیتابیس
 * واقعی و بدون شبکه: خواندن‌های PostgREST و فراخوان‌های داخلی ساختگی‌اند.
 * مسیرهای داخلی واقعی در این تست صدا زده نمی‌شوند؛ فقط منطق لایهٔ
 * سروری داشبورد بررسی می‌شود: کلید کار یکتا، بازاستفادهٔ سند و کار
 * ناتمام، رد کار در جریان، و رد سند منتشرشده.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
}));

vi.mock("@/lib/factory/tick/internal-api", () => ({
  dbConfig: () => ({ url: "https://supabase.test", serviceKey: "service-key" }),
  postgrestGet: getMock,
}));

import { createGuideDraft, createGuideUpdateDraft } from "@/lib/factory-dashboard/guide-admin";
import type { PublishPayload } from "@/lib/content-versioning";

process.env.INTERNAL_PUBLISH_TOKEN = "test-token";

const ORIGIN = "http://test.local";
const HASH = "a".repeat(64);

function payload(): PublishPayload {
  return {
    schema_version: "publish_payload_v1",
    slug: "test-guide",
    title: "راهنمای آزمون",
    h1: "راهنمای آزمون",
    published_at: null,
    excerpt: "خلاصهٔ آزمون",
    category: "تایلند",
    reading_minutes: 3,
    updated_fa: "۱۰ آبان ۱۴۰۵",
    sections: [
      { position: 1, heading: "بخش یک", paragraphs: ["پاراگراف یک."] },
    ],
    faqs: [],
    seo: {
      title: "عنوان سئو",
      description: "توضیح سئو",
      canonical_path: "/guide/test-guide",
    },
  };
}

function ok(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

interface FetchCall {
  url: string;
  body: unknown;
}

describe("createGuideDraft", () => {
  const fetchMock = vi.fn();
  let docRow: Record<string, unknown> | null;
  let docById: Record<string, unknown> | null;
  let wiRows: Record<string, unknown>[];
  let wiSequence: Record<string, unknown>[][] | null;
  let contentDocStatus: number;
  let workItemsStatus: number;

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    getMock.mockReset();
    docRow = null;
    docById = null;
    wiRows = [];
    wiSequence = null;
    contentDocStatus = 200;
    workItemsStatus = 200;

    getMock.mockImplementation(async (_cfg: unknown, path: string) => {
      if (path.startsWith("content_documents?slug=")) return docRow ? [docRow] : [];
      if (path.startsWith("content_documents?id=")) return docById ? [docById] : [];
      if (path.startsWith("factory_work_items?content_id=")) {
        if (wiSequence) return wiSequence.shift() ?? [];
        return wiRows;
      }
      return [];
    });

    fetchMock.mockImplementation(async (url: string, init?: { body?: string }) => {
      if (url.endsWith("/api/internal/content-documents")) {
        if (contentDocStatus === 409) return ok({ error: "slug already exists" }, 409);
        return ok({
          document: {
            id: "doc-new",
            slug: "test-guide",
            canonical_path: "/guide/test-guide",
            status: "draft",
          },
        });
      }
      if (url.endsWith("/api/internal/work-items")) {
        if (workItemsStatus === 409) return ok({ error: "work_key already exists" }, 409);
        return ok({ work_item: { id: "wi-new" } });
      }
      if (url.includes("/first-artifact")) {
        return ok({ artifact_id: "art-new", artifact_hash: HASH, existing: false });
      }
      if (url.includes("/update-artifact")) {
        return ok({ artifact_id: "art-new", artifact_hash: HASH, existing: false });
      }
      return ok({}, 404);
    });
  });

  function fetchCalls(): FetchCall[] {
    return fetchMock.mock.calls.map(([url, init]) => ({
      url: String(url),
      body: init?.body ? JSON.parse(String(init.body)) : null,
    }));
  }

  function baseDoc(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      id: "doc-1",
      slug: "test-guide",
      canonical_path: "/guide/test-guide",
      status: "draft",
      published_version_id: null,
      is_test_fixture: false,
      created_at: "2026-11-01T00:00:00Z",
      ...overrides,
    };
  }

  function baseWi(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      id: "wi-1",
      work_key: "guide-first-test-guide",
      title: "راهنمای آزمون",
      status: "queued",
      result_artifact_id: null,
      publication_id: null,
      created_at: "2026-11-01T00:00:00Z",
      updated_at: "2026-11-01T00:00:00Z",
      ...overrides,
    };
  }

  it("سند تازه: سند، کار با کلید پایه، و Artifact اول ساخته می‌شوند", async () => {
    const result = await createGuideDraft(ORIGIN, { slug: "test-guide", payload: payload() });
    expect(result.document.id).toBe("doc-new");
    expect(result.workItem.id).toBe("wi-new");
    expect(result.artifact.artifactHash).toBe(HASH);
    const wiCall = fetchCalls().find((c) => c.url.endsWith("/api/internal/work-items"));
    expect(wiCall).toBeDefined();
    expect((wiCall?.body as Record<string, unknown>).work_key).toBe("guide-first-test-guide");
    expect((wiCall?.body as Record<string, unknown>).work_type).toBe("update_content");
    const artifactCall = fetchCalls().find((c) => c.url.includes("/first-artifact"));
    expect(artifactCall?.url).toContain("wi-new");
  });

  it("slug نامعتبر، پیش از هر فراخوان رد می‌شود", async () => {
    await expect(
      createGuideDraft(ORIGIN, { slug: "Bad Slug", payload: payload() }),
    ).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("سند موجود با کار در جریان، ساخت تازه را رد می‌کند", async () => {
    contentDocStatus = 409;
    docRow = baseDoc();
    wiRows = [baseWi({ status: "awaiting_approval", result_artifact_id: "art-old" })];
    await expect(
      createGuideDraft(ORIGIN, { slug: "test-guide", payload: payload() }),
    ).rejects.toMatchObject({ status: 409 });
    expect(fetchCalls().some((c) => c.url.endsWith("/api/internal/work-items"))).toBe(false);
    expect(fetchCalls().some((c) => c.url.includes("/first-artifact"))).toBe(false);
  });

  it("سند موجود با کار ناتمام بدون Artifact، همان کار را ادامه می‌دهد", async () => {
    contentDocStatus = 409;
    docRow = baseDoc();
    wiRows = [baseWi({ id: "wi-pending", status: "queued", result_artifact_id: null })];
    const result = await createGuideDraft(ORIGIN, { slug: "test-guide", payload: payload() });
    expect(result.workItem.id).toBe("wi-pending");
    expect(fetchCalls().some((c) => c.url.endsWith("/api/internal/work-items"))).toBe(false);
    const artifactCall = fetchCalls().find((c) => c.url.includes("/first-artifact"));
    expect(artifactCall?.url).toContain("wi-pending");
  });

  it("پس از رد پیش‌نویس پیشین، کار تازه با کلید پسونددار ساخته می‌شود", async () => {
    contentDocStatus = 409;
    docRow = baseDoc();
    wiRows = [baseWi({ status: "blocked", result_artifact_id: "art-old" })];
    const result = await createGuideDraft(ORIGIN, { slug: "test-guide", payload: payload() });
    expect(result.workItem.id).toBe("wi-new");
    const wiCall = fetchCalls().find((c) => c.url.endsWith("/api/internal/work-items"));
    expect((wiCall?.body as Record<string, unknown>).work_key).toBe("guide-first-test-guide-2");
  });

  it("سند منتشرشده، پیش‌نویس تازه نمی‌گیرد", async () => {
    contentDocStatus = 409;
    docRow = baseDoc({ published_version_id: "version-1", status: "published" });
    wiRows = [];
    await expect(
      createGuideDraft(ORIGIN, { slug: "test-guide", payload: payload() }),
    ).rejects.toMatchObject({ status: 409 });
    expect(fetchCalls().some((c) => c.url.endsWith("/api/internal/work-items"))).toBe(false);
  });

  it("سند موجود بدون کار، کار تازه با کلید پایه می‌سازد (بازیابی پس از خرابی قدم کار)", async () => {
    contentDocStatus = 409;
    docRow = baseDoc();
    wiRows = [];
    const result = await createGuideDraft(ORIGIN, { slug: "test-guide", payload: payload() });
    expect(result.workItem.id).toBe("wi-new");
    const wiCall = fetchCalls().find((c) => c.url.endsWith("/api/internal/work-items"));
    expect((wiCall?.body as Record<string, unknown>).work_key).toBe("guide-first-test-guide");
  });

  it("مسابقهٔ ساخت کار (۴۰۹ کلید تکراری) کار ناتمام برنده را بازاستفاده می‌کند، نه کار تازه", async () => {
    wiSequence = [
      [],
      [baseWi({ id: "wi-pending", status: "queued", result_artifact_id: null })],
    ];
    workItemsStatus = 409;
    const result = await createGuideDraft(ORIGIN, { slug: "test-guide", payload: payload() });
    expect(result.document.id).toBe("doc-new");
    expect(result.workItem.id).toBe("wi-pending");
    expect(result.workItem.workKey).toBe("guide-first-test-guide");
    const artifactCall = fetchCalls().find((c) => c.url.includes("/first-artifact"));
    expect(artifactCall?.url).toContain("wi-pending");
  });

  describe("createGuideUpdateDraft", () => {
    function publishedDoc(): Record<string, unknown> {
      return baseDoc({ published_version_id: "version-1", status: "published" });
    }

    it("سند منتشرنشده، پیش‌نویس به‌روزرسانی نمی‌گیرد", async () => {
      docById = baseDoc();
      wiRows = [];
      await expect(
        createGuideUpdateDraft(ORIGIN, "doc-1", payload()),
      ).rejects.toMatchObject({ status: 409 });
      expect(fetchCalls().some((c) => c.url.endsWith("/api/internal/work-items"))).toBe(false);
      expect(fetchCalls().some((c) => c.url.includes("/update-artifact"))).toBe(false);
    });

    it("سند منتشرشده با کار ناتمام بدون Artifact، همان کار را ادامه می‌دهد", async () => {
      docById = publishedDoc();
      wiRows = [baseWi({ id: "wi-pending", work_key: "guide-update-test-guide", status: "queued", result_artifact_id: null })];
      const result = await createGuideUpdateDraft(ORIGIN, "doc-1", payload());
      expect(result.workItem.id).toBe("wi-pending");
      expect(fetchCalls().some((c) => c.url.endsWith("/api/internal/work-items"))).toBe(false);
      const artifactCall = fetchCalls().find((c) => c.url.includes("/update-artifact"));
      expect(artifactCall?.url).toContain("wi-pending");
    });

    it("خرابی پس از Artifact به‌روزرسانی: کار در جریان، ساخت تازه را رد می‌کند و چیزی تازه نمی‌سازد", async () => {
      docById = publishedDoc();
      wiRows = [baseWi({ id: "wi-active", work_key: "guide-update-test-guide", status: "awaiting_approval", result_artifact_id: "art-old" })];
      await expect(
        createGuideUpdateDraft(ORIGIN, "doc-1", payload()),
      ).rejects.toMatchObject({ status: 409 });
      expect(fetchCalls().some((c) => c.url.endsWith("/api/internal/work-items"))).toBe(false);
      expect(fetchCalls().some((c) => c.url.includes("/update-artifact"))).toBe(false);
    });

    it("پس از رد پیش‌نویس به‌روزرسانی پیشین، کار تازه با کلید پسونددار ساخته می‌شود", async () => {
      docById = publishedDoc();
      wiRows = [baseWi({ id: "wi-old", work_key: "guide-update-test-guide", status: "blocked", result_artifact_id: "art-old" })];
      const result = await createGuideUpdateDraft(ORIGIN, "doc-1", payload());
      expect(result.workItem.id).toBe("wi-new");
      const wiCall = fetchCalls().find((c) => c.url.endsWith("/api/internal/work-items"));
      expect((wiCall?.body as Record<string, unknown>).work_key).toBe("guide-update-test-guide-2");
    });

    it("مسابقهٔ ساخت کار (۴۰۹ کلید تکراری) کار ناتمام برنده را بازاستفاده می‌کند، نه کار تازه", async () => {
      docById = publishedDoc();
      wiSequence = [
        [],
        [baseWi({ id: "wi-pending", work_key: "guide-update-test-guide", status: "queued", result_artifact_id: null })],
      ];
      workItemsStatus = 409;
      const result = await createGuideUpdateDraft(ORIGIN, "doc-1", payload());
      expect(result.workItem.id).toBe("wi-pending");
      expect(result.workItem.workKey).toBe("guide-update-test-guide");
      const artifactCall = fetchCalls().find((c) => c.url.includes("/update-artifact"));
      expect(artifactCall?.url).toContain("wi-pending");
    });
  });
});
