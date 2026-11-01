/**
 * تست‌های قابلیت CONTENT-FIRST-PUBLICATION (خالص و واحد):
 * اعتبارسنجی slug، رزولوشن خواندن نسخه‌ای، و اجتماع نقشهٔ سایت.
 * بدون دیتابیس واقعی و بدون شبکه؛ خوانش‌ها ساختگی‌اند.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildContentDocumentInsert,
  canonicalPathForGuideSlug,
  isValidGuideSlug,
} from "@/lib/factory/content-documents";
import {
  resolveGuideSource,
  VersionedReadError,
  type VersionedGuideResult,
} from "@/lib/guide-versioned-read";
import {
  fetchPublishedVersionedGuides,
  mergeSitemapGuides,
} from "@/lib/sitemap-sections";

const GUIDE = {
  slug: "thailand-visa-guide",
  title: "راهنمای ویزای تایلند",
  h1: null,
  publishedAt: null,
  excerpt: "لید راهنما",
  category: "راهنما",
  readingMinutes: 5,
  updatedFa: "۱۰ آبان ۱۴۰۵",
  sections: [],
  faqs: [],
};

const VERSIONED_RESULT: VersionedGuideResult = {
  guide: GUIDE,
  documentId: "doc-1",
  versionId: "ver-1",
  versionNo: 1,
  contentHash: "a".repeat(64),
  canonicalPath: "/guide/thailand-visa-guide",
};

const CFG = { supabaseUrl: "https://supabase.test", serviceRoleKey: "service-key" };

describe("isValidGuideSlug", () => {
  it("slug ساده و چندبخشی با رقم را می‌پذیرد", () => {
    expect(isValidGuideSlug("thailand-visa-guide")).toBe(true);
    expect(isValidGuideSlug("a")).toBe(true);
    expect(isValidGuideSlug("abc-123-def")).toBe(true);
  });

  it("حروف بزرگ، فاصله، خط تیرهٔ لبه، خط تیرهٔ دوتایی و غیرلاتین را رد می‌کند", () => {
    expect(isValidGuideSlug("")).toBe(false);
    expect(isValidGuideSlug("Thailand-Visa")).toBe(false);
    expect(isValidGuideSlug("has space")).toBe(false);
    expect(isValidGuideSlug("-lead")).toBe(false);
    expect(isValidGuideSlug("trail-")).toBe(false);
    expect(isValidGuideSlug("double--dash")).toBe(false);
    expect(isValidGuideSlug("under_score")).toBe(false);
    expect(isValidGuideSlug("راهنما")).toBe(false);
    expect(isValidGuideSlug("a/b")).toBe(false);
    expect(isValidGuideSlug(42)).toBe(false);
    expect(isValidGuideSlug(null)).toBe(false);
  });
});

describe("canonicalPathForGuideSlug و buildContentDocumentInsert", () => {
  it("مسیر کنونیکال از روی slug ساخته می‌شود", () => {
    expect(canonicalPathForGuideSlug("thailand-visa-guide")).toBe("/guide/thailand-visa-guide");
  });

  it("سطر درج، draft و غیرفیکسچر و بدون اشاره‌گر است", () => {
    expect(buildContentDocumentInsert("thailand-visa-guide")).toEqual({
      slug: "thailand-visa-guide",
      content_type: "guide",
      status: "draft",
      canonical_path: "/guide/thailand-visa-guide",
      published_version_id: null,
      is_test_fixture: false,
    });
  });
});

describe("resolveGuideSource", () => {
  it("در حالت legacy همیشه legacy می‌دهد و خواندن نسخه‌ای را صدا نمی‌زند", async () => {
    const fetchVersioned = vi.fn();
    const source = await resolveGuideSource("thailand-visa-guide", {
      mode: "legacy",
      config: CFG,
      fetchVersioned: fetchVersioned as never,
    });
    expect(source).toEqual({ kind: "legacy" });
    expect(fetchVersioned).not.toHaveBeenCalled();
  });

  it("در حالت shadow_compare هم legacy می‌دهد (مقایسه با صفحه است)", async () => {
    const fetchVersioned = vi.fn();
    const source = await resolveGuideSource("thailand-visa-guide", {
      mode: "shadow_compare",
      config: CFG,
      fetchVersioned: fetchVersioned as never,
    });
    expect(source).toEqual({ kind: "legacy" });
    expect(fetchVersioned).not.toHaveBeenCalled();
  });

  it("در حالت versioned با سند و نسخه، versioned می‌دهد", async () => {
    const source = await resolveGuideSource("thailand-visa-guide", {
      mode: "versioned",
      config: CFG,
      fetchVersioned: async () => VERSIONED_RESULT,
    });
    expect(source).toEqual({ kind: "versioned", result: VERSIONED_RESULT });
  });

  it("در حالت versioned با نبودن سند، legacy می‌دهد", async () => {
    const source = await resolveGuideSource("thailand-visa-guide", {
      mode: "versioned",
      config: CFG,
      fetchVersioned: async () => {
        throw new VersionedReadError("DOCUMENT_NOT_FOUND", "no document");
      },
    });
    expect(source).toEqual({ kind: "legacy" });
  });

  it("در حالت versioned با سند فیکسچر، legacy می‌دهد", async () => {
    const source = await resolveGuideSource("thailand-visa-guide", {
      mode: "versioned",
      config: CFG,
      fetchVersioned: async () => {
        throw new VersionedReadError("TEST_FIXTURE", "fixture");
      },
    });
    expect(source).toEqual({ kind: "legacy" });
  });

  it("در حالت versioned با سند بدون نسخه، draft می‌دهد", async () => {
    const source = await resolveGuideSource("thailand-visa-guide", {
      mode: "versioned",
      config: CFG,
      fetchVersioned: async () => {
        throw new VersionedReadError("NO_PUBLISHED_VERSION", "no pointer");
      },
    });
    expect(source).toEqual({ kind: "draft" });
  });

  it.each(["UPSTREAM_ERROR", "VERSION_NOT_FOUND", "VERSION_MISMATCH", "NOT_CONFIGURED"] as const)(
    "در حالت versioned با خطای %s، خطا fail-closed بالا می‌آید",
    async (code) => {
      await expect(
        resolveGuideSource("thailand-visa-guide", {
          mode: "versioned",
          config: CFG,
          fetchVersioned: async () => {
            throw new VersionedReadError(code, "fail-closed");
          },
        }),
      ).rejects.toMatchObject({ code });
    },
  );

  it("خطای غیرنسخه‌ای هم بالا می‌آید", async () => {
    await expect(
      resolveGuideSource("thailand-visa-guide", {
        mode: "versioned",
        config: CFG,
        fetchVersioned: async () => {
          throw new Error("boom");
        },
      }),
    ).rejects.toThrow("boom");
  });
});

describe("mergeSitemapGuides", () => {
  const legacy = [
    { slug: "best-time-to-visit-thailand", updatedFa: "۱۹ مهر ۱۴۰۵" },
    { slug: "thailand-tour-complete-guide", updatedFa: "۱۸ مهر ۱۴۰۵" },
  ];

  it("برخورد slug، legacy می‌برد و lastmod زنده عوض نمی‌شود", () => {
    const merged = mergeSitemapGuides(legacy, [
      { slug: "best-time-to-visit-thailand", updatedFa: "۱۰ آبان ۱۴۰۵" },
    ]);
    expect(merged).toEqual(legacy);
  });

  it("راهنمای فقط‌نسخه‌ای به انتها اضافه می‌شود", () => {
    const merged = mergeSitemapGuides(legacy, [
      { slug: "thailand-visa-guide", updatedFa: "۱۰ آبان ۱۴۰۵" },
    ]);
    expect(merged).toEqual([
      ...legacy,
      { slug: "thailand-visa-guide", updatedFa: "۱۰ آبان ۱۴۰۵" },
    ]);
  });

  it("فهرست نسخه‌ای تهی، legacy را دست‌نخورده برمی‌گرداند", () => {
    expect(mergeSitemapGuides(legacy, [])).toEqual(legacy);
  });
});

describe("fetchPublishedVersionedGuides با fetch ساختگی", () => {
  const savedEnv = {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.test";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
  });

  afterEach(() => {
    if (savedEnv.url === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = savedEnv.url;
    if (savedEnv.key === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = savedEnv.key;
  });

  function stubFetch(docs: unknown[], versions: unknown[]) {
    const requested: string[] = [];
    const fetchFn = (async (url: string) => {
      requested.push(url);
      const body = url.includes("content_documents") ? docs : versions;
      return { ok: true, json: async () => body };
    }) as unknown as (url: string, init?: RequestInit) => Promise<Response>;
    return { fetchFn, requested };
  }

  it("سند منتشرشده با نسخهٔ منتشرشده، با updatedFa از payload می‌آید", async () => {
    const { fetchFn } = stubFetch(
      [{ id: "doc-1", slug: "thailand-visa-guide", published_version_id: "ver-1" }],
      [{ id: "ver-1", payload: { updated_fa: "۱۰ آبان ۱۴۰۵" } }],
    );
    await expect(fetchPublishedVersionedGuides(fetchFn)).resolves.toEqual([
      { slug: "thailand-visa-guide", updatedFa: "۱۰ آبان ۱۴۰۵" },
    ]);
  });

  it("فیلتر خوانش، فقط published و اشاره‌گر ناته و غیرفیکسچر را می‌خواهد", async () => {
    const { fetchFn, requested } = stubFetch([], []);
    await fetchPublishedVersionedGuides(fetchFn);
    const docsUrl = requested.find((u) => u.includes("content_documents")) ?? "";
    expect(docsUrl).toContain("status=eq.published");
    expect(docsUrl).toContain("published_version_id=not.is.null");
    expect(docsUrl).toContain("is_test_fixture=is.false");
  });

  it("سند با اشاره‌گر آویزان از نقشه می‌افتد", async () => {
    const { fetchFn } = stubFetch(
      [{ id: "doc-1", slug: "thailand-visa-guide", published_version_id: "ver-missing" }],
      [],
    );
    await expect(fetchPublishedVersionedGuides(fetchFn)).resolves.toEqual([]);
  });

  it("نبودن env، فهرست تهی می‌دهد تا نقشه با legacy ادامه دهد", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    const { fetchFn } = stubFetch([], []);
    await expect(fetchPublishedVersionedGuides(fetchFn)).resolves.toEqual([]);
  });

  it("پاسخ ناموفق بالادست، فهرست تهی می‌دهد", async () => {
    const failing = (async () => ({ ok: false, json: async () => null })) as unknown as (
      url: string,
      init?: RequestInit,
    ) => Promise<Response>;
    await expect(fetchPublishedVersionedGuides(failing)).resolves.toEqual([]);
  });
});
