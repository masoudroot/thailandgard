/**
 * تست‌های رزولور یکتا (SINGLE-SOURCE، THG-UNIFY-01).
 *
 * خالص و بدون دیتابیس و بدون شبکه: ورودی‌ها ساخته می‌شوند و قرارداد
 * اولویت بررسی می‌شود. همچنین باگ پرس‌وجوی نسخه در
 * fetchPublishedVersionedGuides (خواندن نسخه با id سند به‌جای
 * published_version_id) این‌جا با assert روی URL گرفته می‌شود؛ تست
 * قدیمی آن را نمی‌گرفت چون fetch ساختگی‌اش به URL نگاه نمی‌کرد.
 */
import { describe, expect, it } from "vitest";
import {
  resolveGuidePublicSource,
  resolveSitemapGuideRows,
  versionedInputFromDocument,
  type GuideSourceInput,
} from "@/lib/guide-source-resolver";
import { fetchPublishedVersionedGuides } from "@/lib/sitemap-sections";

const LEGACY = { slug: "thailand-visa-guide", updatedFa: "۱۹ مهر ۱۴۰۵" };
const FILE = { slug: "thailand-visa-guide", updatedFa: "۱۸ مهر ۱۴۰۵" };

function input(partial: Partial<GuideSourceInput>): GuideSourceInput {
  return { versioned: null, legacyTable: null, fileGuide: null, ...partial };
}

describe("قرارداد اولویت رزولور یکتا", () => {
  it("نسخهٔ منتشرشده، هم legacy و هم file را می‌برد و lastmod نسخه را می‌دهد", () => {
    const source = resolveGuidePublicSource(
      input({
        versioned: { state: "published", updatedFa: "۱۰ آبان ۱۴۰۵" },
        legacyTable: LEGACY,
        fileGuide: FILE,
      }),
    );
    expect(source).toEqual({
      kind: "versioned",
      updatedFa: "۱۰ آبان ۱۴۰۵",
      documentId: undefined,
      versionId: undefined,
    });
  });

  it("بدون نسخهٔ منتشرشده، ردیف جدول legacy بر file می‌برد", () => {
    expect(
      resolveGuidePublicSource(input({ legacyTable: LEGACY, fileGuide: FILE })),
    ).toEqual({ kind: "legacy-table", updatedFa: "۱۹ مهر ۱۴۰۵" });
  });

  it("راهنمای فقط‌فایلی، عمومی است (شکاف ۲۳ راهنما بسته می‌شود)", () => {
    expect(resolveGuidePublicSource(input({ fileGuide: FILE }))).toEqual({
      kind: "legacy-file",
      updatedFa: "۱۸ مهر ۱۴۰۵",
    });
  });

  it("پیش‌نویس، legacy زنده را خاموش نمی‌کند (نه ۴۰۴، نه حذف از نقشه)", () => {
    expect(
      resolveGuidePublicSource(
        input({ versioned: { state: "draft" }, legacyTable: LEGACY }),
      ),
    ).toEqual({ kind: "legacy-table", updatedFa: "۱۹ مهر ۱۴۰۵" });
  });

  it("آرشیوشده و فیکسچر هم slug را تصاحب نمی‌کنند", () => {
    expect(
      resolveGuidePublicSource(
        input({ versioned: { state: "archived" }, fileGuide: FILE }),
      ),
    ).toEqual({ kind: "legacy-file", updatedFa: "۱۸ مهر ۱۴۰۵" });
    expect(
      resolveGuidePublicSource(
        input({ versioned: { state: "fixture" }, legacyTable: LEGACY }),
      ),
    ).toEqual({ kind: "legacy-table", updatedFa: "۱۹ مهر ۱۴۰۵" });
  });

  it("پیش‌نویسِ تنها، آرشیوِ تنها، فیکسچرِ تنها و اشاره‌گر آویزان، عمومی نیستند", () => {
    expect(resolveGuidePublicSource(input({ versioned: { state: "draft" } }))).toEqual({
      kind: "not-public",
      reason: "draft",
    });
    expect(resolveGuidePublicSource(input({ versioned: { state: "archived" } }))).toEqual({
      kind: "not-public",
      reason: "archived",
    });
    expect(resolveGuidePublicSource(input({ versioned: { state: "fixture" } }))).toEqual({
      kind: "not-public",
      reason: "fixture",
    });
    expect(resolveGuidePublicSource(input({ versioned: { state: "dangling" } }))).toEqual({
      kind: "not-public",
      reason: "dangling",
    });
    expect(resolveGuidePublicSource(input({}))).toEqual({
      kind: "not-public",
      reason: "absent",
    });
  });

  it("صفحه و نقشه یک جواب می‌دهند: رزولوشن دسته‌ای فقط عمومی‌ها را برمی‌گرداند", () => {
    const rows = resolveSitemapGuideRows([
      {
        slug: "a",
        versioned: { state: "published", updatedFa: "۱۰ آبان ۱۴۰۵" },
        legacyTable: { slug: "a", updatedFa: "۱۹ مهر ۱۴۰۵" },
        fileGuide: null,
      },
      { slug: "b", versioned: { state: "draft" }, legacyTable: null, fileGuide: null },
      {
        slug: "c",
        versioned: null,
        legacyTable: null,
        fileGuide: { slug: "c", updatedFa: "۱۸ مهر ۱۴۰۵" },
      },
      { slug: "d", versioned: { state: "fixture" }, legacyTable: null, fileGuide: null },
    ]);
    expect(rows).toEqual([
      { slug: "a", updatedFa: "۱۰ آبان ۱۴۰۵" },
      { slug: "c", updatedFa: "۱۸ مهر ۱۴۰۵" },
    ]);
  });
});

describe("versionedInputFromDocument", () => {
  it("published + اشاره‌گر + نسخه، published است", () => {
    expect(
      versionedInputFromDocument(
        { status: "published", publishedVersionId: "ver-1", documentId: "doc-1" },
        "۱۰ آبان ۱۴۰۵",
      ),
    ).toEqual({
      state: "published",
      updatedFa: "۱۰ آبان ۱۴۰۵",
      documentId: "doc-1",
      versionId: "ver-1",
    });
  });

  it("فیکسچر پیش از وضعیت می‌برد", () => {
    expect(
      versionedInputFromDocument(
        { status: "published", isTestFixture: true, publishedVersionId: "ver-1" },
        "۱۰ آبان ۱۴۰۵",
      ),
    ).toEqual({ state: "fixture" });
  });

  it("published + اشاره‌گر ولی نسخهٔ پیدا‌نشده، dangling است نه draft", () => {
    expect(
      versionedInputFromDocument(
        { status: "published", publishedVersionId: "ver-missing" },
        null,
      ),
    ).toEqual({ state: "dangling" });
  });

  it("archived، archived است و draft و وضعیت ناشناخته، draft", () => {
    expect(versionedInputFromDocument({ status: "archived" }, null)).toEqual({
      state: "archived",
    });
    expect(versionedInputFromDocument({ status: "draft" }, null)).toEqual({
      state: "draft",
    });
    expect(versionedInputFromDocument({}, null)).toEqual({ state: "draft" });
  });
});

describe("fetchPublishedVersionedGuides: پرس‌وجوی نسخه با published_version_id", () => {
  const savedEnv = {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };

  it("URL نسخه‌ها، شناسهٔ نسخه را می‌برد نه شناسهٔ سند را", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.test";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    try {
      const requested: string[] = [];
      const fetchFn = (async (url: string) => {
        requested.push(url);
        if (url.includes("content_documents")) {
          return {
            ok: true,
            json: async () => [
              { id: "doc-1", slug: "thailand-visa-guide", published_version_id: "ver-1" },
              { id: "doc-2", slug: "phuket-vs-samui", published_version_id: "ver-2" },
            ],
          };
        }
        return {
          ok: true,
          json: async () => [
            { id: "ver-1", payload: { updated_fa: "۱۰ آبان ۱۴۰۵" } },
            { id: "ver-2", payload: { updated_fa: "۹ آبان ۱۴۰۵" } },
          ],
        };
      }) as unknown as (url: string, init?: RequestInit) => Promise<Response>;
      await expect(fetchPublishedVersionedGuides(fetchFn)).resolves.toEqual([
        { slug: "thailand-visa-guide", updatedFa: "۱۰ آبان ۱۴۰۵" },
        { slug: "phuket-vs-samui", updatedFa: "۹ آبان ۱۴۰۵" },
      ]);
      const versionsUrl = requested.find((u) => u.includes("content_versions")) ?? "";
      expect(versionsUrl).toContain("id=in.(ver-1,ver-2)");
      expect(versionsUrl).not.toContain("doc-1");
      expect(versionsUrl).not.toContain("doc-2");
    } finally {
      if (savedEnv.url === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      else process.env.NEXT_PUBLIC_SUPABASE_URL = savedEnv.url;
      if (savedEnv.key === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = savedEnv.key;
    }
  });
});
