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
  resolveGuideSource,
  VersionedReadError,
  type VersionedGuideResult,
} from "../../lib/guide-versioned-read";

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
