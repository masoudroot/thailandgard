/**
 * تست رزولوشن منبع راهنما (CONTENT-FIRST):
 * - خطای نبودن سند یا فیکسچر بودن، به legacy برمی‌گردد؛ پیش‌نویس به draft.
 * - نکتهٔ کلیدی: خطا ممکن است هویت کلاسش را از دست داده باشد (عبور از
 *   مرز سریال‌سازی React در پیش‌رندر با "use cache" باعث می‌شود شیء خطا
 *   دیگر نمونهٔ VersionedReadError نباشد و فقط فیلد code را داشته باشد).
 *   رزولوشن باید روی code تصمیم بگیرد، نه روی instanceof.
 * - خطای ناشناخته یا بالادستی، fail-closed بالا می‌آید.
 *
 * بدون دیتابیس واقعی و بدون شبکه؛ fetchVersioned تزریق می‌شود.
 */
import { describe, expect, it, vi } from "vitest";
import {
  fetchVersionedGuide,
  resolveGuideSource,
  VersionedReadError,
  type VersionedGuideResult,
} from "../../lib/guide-versioned-read";

const VALID_PAYLOAD = {
  schema_version: "publish_payload_v1",
  slug: "thailand-transport-guide",
  title: "حمل‌ونقل در تایلند",
  h1: "حمل‌ونقل در تایلند",
  published_at: null,
  excerpt: "خلاصهٔ آزمون",
  category: "برنامه‌ریزی سفر",
  reading_minutes: 2,
  updated_fa: "۱۱ آبان ۱۴۰۵",
  sections: [{ position: 1, heading: "بخش یک", paragraphs: ["پاراگراف اول نسخهٔ تازه."] }],
  faqs: [{ position: 1, question: "سؤال؟", answer: "پاسخ." }],
  seo: {
    title: "حمل‌ونقل در تایلند",
    description: "توضیح سئو",
    canonical_path: "/guide/thailand-transport-guide",
  },
};

const CFG = { supabaseUrl: "https://test.supabase.co", serviceRoleKey: "test-key" };

/** fetchFn قالبی: ردیف سند و ردیف نسخه را بر اساس جدول URL برمی‌گرداند. */
function stubFetch(doc: Record<string, unknown>, version: Record<string, unknown> | null) {
  return (async (url: string) => {
    const rows = url.includes("content_documents")
      ? [doc]
      : url.includes("content_versions")
        ? version
          ? [version]
          : []
        : [];
    return { ok: true, json: async () => rows } as unknown as Response;
  }) as (url: string, init?: RequestInit) => Promise<Response>;
}

function docRow(overrides: Record<string, unknown>) {
  return {
    id: "doc-1",
    slug: "thailand-transport-guide",
    canonical_path: "/guide/thailand-transport-guide",
    published_version_id: "ver-1",
    is_test_fixture: false,
    status: "draft",
    ...overrides,
  };
}

function versionRow() {
  return {
    id: "ver-1",
    content_id: "doc-1",
    version_no: 1,
    payload: VALID_PAYLOAD,
    content_hash: "b".repeat(64),
  };
}

describe("fetchVersionedGuide (CUTOVER-FT-02 قدم ۳)", () => {
  it("سند draft با اشاره‌گر تنظیم‌شده، از content_versions رندر می‌شود", async () => {
    const result = await fetchVersionedGuide(
      "thailand-transport-guide",
      CFG,
      stubFetch(docRow({}), versionRow()),
    );
    expect(result.versionId).toBe("ver-1");
    expect(result.versionNo).toBe(1);
    expect(result.guide.slug).toBe("thailand-transport-guide");
  });

  it("سند published با اشاره‌گر، مثل قبل versioned می‌دهد", async () => {
    const result = await fetchVersionedGuide(
      "thailand-transport-guide",
      CFG,
      stubFetch(docRow({ status: "published" }), versionRow()),
    );
    expect(result.versionId).toBe("ver-1");
  });

  it("سند archived با اشاره‌گر، NOT_PUBLISHED می‌دهد تا صفحه و نقشه یکی بمانند", async () => {
    await expect(
      fetchVersionedGuide(
        "thailand-transport-guide",
        CFG,
        stubFetch(docRow({ status: "archived" }), versionRow()),
      ),
    ).rejects.toMatchObject({ code: "NOT_PUBLISHED" });
    const source = await resolveGuideSource("thailand-transport-guide", {
      mode: "versioned",
      config: CFG,
      fetchFn: stubFetch(docRow({ status: "archived" }), versionRow()),
    });
    expect(source).toEqual({ kind: "legacy" });
  });

  it("سند draft بدون اشاره‌گر، NO_PUBLISHED_VERSION می‌دهد", async () => {
    await expect(
      fetchVersionedGuide(
        "thailand-transport-guide",
        CFG,
        stubFetch(docRow({ published_version_id: null }), versionRow()),
      ),
    ).rejects.toMatchObject({ code: "NO_PUBLISHED_VERSION" });
  });

  it("اشاره‌گر به نسخهٔ پیدا‌نشده، fail-closed با VERSION_NOT_FOUND بالا می‌آید", async () => {
    await expect(
      fetchVersionedGuide(
        "thailand-transport-guide",
        CFG,
        stubFetch(docRow({}), null),
      ),
    ).rejects.toMatchObject({ code: "VERSION_NOT_FOUND" });
  });
});

const stubResult: VersionedGuideResult = {
  guide: {
    slug: "best-time-to-visit-thailand",
    title: "بهترین زمان سفر به تایلند",
    excerpt: "لید آزمون",
    category: "آزمون",
    readingMinutes: 1,
    updatedFa: "۱۴۰۵",
    sections: [],
    faqs: [],
  },
  documentId: "doc-1",
  versionId: "ver-1",
  versionNo: 1,
  contentHash: "a".repeat(64),
  canonicalPath: "/guide/best-time-to-visit-thailand",
};

/** خطای ساده‌شده مثل خطای سریال‌شدهٔ React: فقط message و code دارد. */
function plainCodedError(code: string): Error {
  const err = new Error(`versioned read: ${code}`) as Error & { code: string };
  err.code = code;
  return err;
}

describe("resolveGuideSource", () => {
  it("در حالت legacy بدون فراخوان خواندن نسخه‌ای، legacy برمی‌گرداند", async () => {
    const fetchVersioned = vi.fn();
    const source = await resolveGuideSource("best-time-to-visit-thailand", {
      mode: "legacy",
      fetchVersioned,
    });
    expect(source).toEqual({ kind: "legacy" });
    expect(fetchVersioned).not.toHaveBeenCalled();
  });

  it("موفقیت خواندن نسخه‌ای، versioned برمی‌گرداند", async () => {
    const source = await resolveGuideSource("best-time-to-visit-thailand", {
      mode: "versioned",
      fetchVersioned: async () => stubResult,
    });
    expect(source).toEqual({ kind: "versioned", result: stubResult });
  });

  it("نتیجهٔ null از مرز کش (سند نیست یا فیکسچر است) به legacy برمی‌گردد", async () => {
    const source = await resolveGuideSource("best-time-to-visit-thailand", {
      mode: "versioned",
      fetchVersioned: async () => null,
    });
    expect(source).toEqual({ kind: "legacy" });
  });

  it("نشان draft از مرز کش به draft برمی‌گردد", async () => {
    const source = await resolveGuideSource("best-time-to-visit-thailand", {
      mode: "versioned",
      fetchVersioned: async () => ({ kind: "draft" }),
    });
    expect(source).toEqual({ kind: "draft" });
  });

  it("خطای واقعی DOCUMENT_NOT_FOUND به legacy برمی‌گردد", async () => {
    const source = await resolveGuideSource("best-time-to-visit-thailand", {
      mode: "versioned",
      fetchVersioned: async () => {
        throw new VersionedReadError(
          "DOCUMENT_NOT_FOUND",
          "versioned read: no content document",
        );
      },
    });
    expect(source).toEqual({ kind: "legacy" });
  });

  it("خطای ساده‌شده با code برابر DOCUMENT_NOT_FOUND به legacy برمی‌گردد", async () => {
    const source = await resolveGuideSource("best-time-to-visit-thailand", {
      mode: "versioned",
      fetchVersioned: async () => {
        throw plainCodedError("DOCUMENT_NOT_FOUND");
      },
    });
    expect(source).toEqual({ kind: "legacy" });
  });

  it("خطای ساده‌شده با code برابر TEST_FIXTURE به legacy برمی‌گردد", async () => {
    const source = await resolveGuideSource("best-time-to-visit-thailand", {
      mode: "versioned",
      fetchVersioned: async () => {
        throw plainCodedError("TEST_FIXTURE");
      },
    });
    expect(source).toEqual({ kind: "legacy" });
  });

  it("خطای ساده‌شده با code برابر NO_PUBLISHED_VERSION به draft برمی‌گردد", async () => {
    const source = await resolveGuideSource("best-time-to-visit-thailand", {
      mode: "versioned",
      fetchVersioned: async () => {
        throw plainCodedError("NO_PUBLISHED_VERSION");
      },
    });
    expect(source).toEqual({ kind: "draft" });
  });

  it("خطای بالادستی fail-closed بالا می‌آید", async () => {
    await expect(
      resolveGuideSource("best-time-to-visit-thailand", {
        mode: "versioned",
        fetchVersioned: async () => {
          throw plainCodedError("UPSTREAM_ERROR");
        },
      }),
    ).rejects.toThrow("UPSTREAM_ERROR");
  });

  it("خطای بدون code بالا می‌آید", async () => {
    await expect(
      resolveGuideSource("best-time-to-visit-thailand", {
        mode: "versioned",
        fetchVersioned: async () => {
          throw new Error("boom");
        },
      }),
    ).rejects.toThrow("boom");
  });
});
