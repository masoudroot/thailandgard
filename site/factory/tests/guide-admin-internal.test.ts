/**
 * تست فراخوان داخلی guide-admin زیر سقف محافظت Vercel:
 * - خطای شیئی لبه (مثل پاسخ Protection) باید با پیام خوانا برگردد، نه
 *   «[object Object]».
 * - کوکی درخواست ورودی باید به فراخوان داخلی همان مبدا برسد تا سد
 *   محافظت Preview، فراخوان سروربه‌سرور را نبندد.
 * بدون دیتابیس واقعی و بدون شبکه؛ fetch و headers ساختگی‌اند.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getMock, headersMock, cookieValue } = vi.hoisted(() => ({
  getMock: vi.fn(),
  headersMock: vi.fn(),
  cookieValue: { current: null as string | null },
}));

vi.mock("@/lib/factory/tick/internal-api", () => ({
  dbConfig: () => ({ url: "https://supabase.test", serviceKey: "service-key" }),
  postgrestGet: getMock,
}));

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

import { createGuideDraft } from "@/lib/factory-dashboard/guide-admin";
import type { PublishPayload } from "@/lib/content-versioning";

process.env.INTERNAL_PUBLISH_TOKEN = "test-internal-token";

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
    sections: [{ position: 1, heading: "بخش یک", paragraphs: ["پاراگراف یک."] }],
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

describe("callInternal زیر محافظت Preview", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    getMock.mockReset();
    cookieValue.current = null;
    headersMock.mockImplementation(async () => ({
      get: (name: string) => (name === "cookie" ? cookieValue.current : null),
    }));
    getMock.mockImplementation(async () => []);
    fetchMock.mockImplementation(async (url: string) => {
      if (url.endsWith("/api/internal/content-documents")) {
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
        return ok({ work_item: { id: "wi-new" } });
      }
      if (url.includes("/first-artifact")) {
        return ok({ artifact_id: "art-new", artifact_hash: HASH, existing: false });
      }
      return ok({}, 404);
    });
  });

  it("خطای شیئی Protection با پیام خوانا و قدم internal برمی‌گردد", async () => {
    fetchMock.mockImplementationOnce(async () =>
      ok(
        {
          error: { code: "401", message: "Protected deployment" },
          message: "Protected by Vercel Authentication",
        },
        401,
      ),
    );
    try {
      await createGuideDraft(ORIGIN, { slug: "test-guide", payload: payload() });
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      expect(err).toMatchObject({ status: 401, step: "internal" });
      expect((err as Error).message).toBe("Protected deployment");
      expect((err as Error).message).not.toContain("[object Object]");
    }
  });

  it("خطای شیئی بدون message به JSON برمی‌گردد، نه [object Object]", async () => {
    fetchMock.mockImplementationOnce(async () => ok({ error: { code: "500" } }, 500));
    try {
      await createGuideDraft(ORIGIN, { slug: "test-guide", payload: payload() });
      expect.unreachable();
    } catch (err) {
      expect((err as Error).message).toContain("500");
      expect((err as Error).message).not.toContain("[object Object]");
    }
  });

  it("کوکی درخواست ورودی به فراخوان داخلی می‌رسد", async () => {
    cookieValue.current = "vercel-auth=abc; tg-admin=xyz";
    const result = await createGuideDraft(ORIGIN, { slug: "test-guide", payload: payload() });
    expect(result.document.id).toBe("doc-new");
    const firstCall = fetchMock.mock.calls[0];
    const headers = firstCall[1]?.headers as Record<string, string>;
    expect(headers.cookie).toBe("vercel-auth=abc; tg-admin=xyz");
    expect(headers["x-internal-publish-token"]).toBe("test-internal-token");
  });

  it("بدون کوکی، هدر cookie فرستاده نمی‌شود", async () => {
    cookieValue.current = null;
    await createGuideDraft(ORIGIN, { slug: "test-guide", payload: payload() });
    const firstCall = fetchMock.mock.calls[0];
    const headers = firstCall[1]?.headers as Record<string, string>;
    expect("cookie" in headers).toBe(false);
  });
});
