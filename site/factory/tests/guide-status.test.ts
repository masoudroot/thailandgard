/**
 * تست بخش مدیریت راهنمای داشبورد (DASH):
 * - مشتق‌سازی وضعیت از ترکیب سند و Work Item و Publication
 * - اعتبارسنجی slug فرم
 * - غیرفعال بودن انتشار و Rollback در وضعیت‌های نامجاز
 * - مقایسهٔ پاراگرافی پیش‌نویس با نسخهٔ منتشرشده
 * - نشت نکردن توکن به سمت مرورگر: هیچ فایل مرورگری، لایهٔ سروری
 *   guide-admin را ایمپورت نمی‌کند و نام توکن در آن‌ها نیست.
 *
 * بدون دیتابیس واقعی و بدون شبکه؛ فقط منطق خالص و خواندن فایل.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  deriveGuideStatus,
  diffGuidePayload,
  isValidGuideSlug,
  rollbackAvailability,
} from "@/lib/factory-dashboard/guide-status";
import type { PublishPayload } from "@/lib/content-versioning";

const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

function read(rel: string): string {
  return readFileSync(resolve(siteRoot, rel), "utf8");
}

function payload(overrides: Partial<PublishPayload> = {}): PublishPayload {
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
      { position: 1, heading: "بخش یک", paragraphs: ["پاراگراف یک.", "پاراگراف دو."] },
    ],
    faqs: [{ position: 1, question: "سؤال؟", answer: "پاسخ." }],
    seo: {
      title: "عنوان سئو",
      description: "توضیح سئو",
      canonical_path: "/guide/test-guide",
    },
    ...overrides,
  };
}

describe("deriveGuideStatus", () => {
  it("بدون کار و بدون اشاره‌گر، پیش‌نویس است", () => {
    const result = deriveGuideStatus({
      documentStatus: "draft",
      publishedVersionId: null,
      workItemStatus: null,
      publicationStatus: null,
    });
    expect(result.status).toBe("draft");
    expect(result.canApprove).toBe(false);
    expect(result.canPublish).toBe(false);
    expect(result.canComplete).toBe(false);
  });

  it("کار در صف، پیش‌نویس است", () => {
    const result = deriveGuideStatus({
      documentStatus: "draft",
      publishedVersionId: null,
      workItemStatus: "queued",
      publicationStatus: null,
    });
    expect(result.status).toBe("draft");
  });

  it("کار در انتظار تأیید، فقط تأیید را فعال می‌کند", () => {
    const result = deriveGuideStatus({
      documentStatus: "draft",
      publishedVersionId: null,
      workItemStatus: "awaiting_approval",
      publicationStatus: null,
    });
    expect(result.status).toBe("awaiting_approval");
    expect(result.canApprove).toBe(true);
    expect(result.canPublish).toBe(false);
    expect(result.publishDisabledReason).toMatch("تأیید شده باشد");
  });

  it("کار تأییدشده، فقط انتشار را فعال می‌کند", () => {
    const result = deriveGuideStatus({
      documentStatus: "draft",
      publishedVersionId: null,
      workItemStatus: "approved",
      publicationStatus: null,
    });
    expect(result.status).toBe("approved");
    expect(result.canApprove).toBe(false);
    expect(result.canPublish).toBe(true);
    expect(result.canComplete).toBe(false);
  });

  it("کار در حال انتشار با Publication در حال راستی‌آزمایی، در حال انتشار است", () => {
    const result = deriveGuideStatus({
      documentStatus: "draft",
      publishedVersionId: null,
      workItemStatus: "publishing",
      publicationStatus: "verifying",
    });
    expect(result.status).toBe("publishing");
    expect(result.canComplete).toBe(true);
    expect(result.canPublish).toBe(false);
  });

  it("کار در حال انتشار با نسخهٔ ساخته‌شده، تلاش دوبارهٔ انتشار را فعال می‌کند", () => {
    const result = deriveGuideStatus({
      documentStatus: "draft",
      publishedVersionId: null,
      workItemStatus: "publishing",
      publicationStatus: "verifying",
      hasResultVersion: true,
    });
    expect(result.canPublish).toBe(true);
    expect(result.publishDisabledReason).toBe(null);
    expect(result.canComplete).toBe(true);
  });

  it("کار در حال انتشار بدون نسخه، تلاش دوبارهٔ انتشار را با دلیل رد می‌کند", () => {
    const result = deriveGuideStatus({
      documentStatus: "draft",
      publishedVersionId: null,
      workItemStatus: "publishing",
      publicationStatus: "verifying",
      hasResultVersion: false,
    });
    expect(result.canPublish).toBe(false);
    expect(result.publishDisabledReason).toMatch("نسخه ساخته شده باشد");
  });

  it("کار موفق با اشاره‌گر، منتشرشده است", () => {
    const result = deriveGuideStatus({
      documentStatus: "published",
      publishedVersionId: "version-1",
      workItemStatus: "succeeded",
      publicationStatus: "verified",
    });
    expect(result.status).toBe("published");
  });

  it("سند منتشرشده بدون کار، منتشرشده است", () => {
    const result = deriveGuideStatus({
      documentStatus: "published",
      publishedVersionId: "version-1",
      workItemStatus: null,
      publicationStatus: null,
    });
    expect(result.status).toBe("published");
  });

  it("کار مسدود، خطا است و هیچ کنشی فعال نیست", () => {
    const result = deriveGuideStatus({
      documentStatus: "draft",
      publishedVersionId: null,
      workItemStatus: "blocked",
      publicationStatus: null,
    });
    expect(result.status).toBe("error");
    expect(result.canApprove).toBe(false);
    expect(result.canPublish).toBe(false);
    expect(result.canComplete).toBe(false);
  });

  it("کار لغوشده، خطا است", () => {
    const result = deriveGuideStatus({
      documentStatus: "draft",
      publishedVersionId: null,
      workItemStatus: "cancelled",
      publicationStatus: null,
    });
    expect(result.status).toBe("error");
  });

  it("انتشار نیازمند مداخله، خطا است", () => {
    const result = deriveGuideStatus({
      documentStatus: "draft",
      publishedVersionId: null,
      workItemStatus: "publishing",
      publicationStatus: "needs_intervention",
    });
    expect(result.status).toBe("error");
  });

  it("کار موفق بدون اشاره‌گر، ناسازگار و خطا است", () => {
    const result = deriveGuideStatus({
      documentStatus: "draft",
      publishedVersionId: null,
      workItemStatus: "succeeded",
      publicationStatus: "verified",
    });
    expect(result.status).toBe("error");
  });

  it("سند بایگانی‌شده، خطا است", () => {
    const result = deriveGuideStatus({
      documentStatus: "archived",
      publishedVersionId: "version-1",
      workItemStatus: null,
      publicationStatus: null,
    });
    expect(result.status).toBe("error");
  });
});

describe("isValidGuideSlug", () => {
  it("slugهای معتبر را می‌پذیرد", () => {
    expect(isValidGuideSlug("thailand-visa")).toBe(true);
    expect(isValidGuideSlug("a")).toBe(true);
    expect(isValidGuideSlug("best-time-to-visit-thailand")).toBe(true);
    expect(isValidGuideSlug("tour-2026")).toBe(true);
  });

  it("slugهای نامعتبر را رد می‌کند", () => {
    expect(isValidGuideSlug("")).toBe(false);
    expect(isValidGuideSlug("Thailand")).toBe(false);
    expect(isValidGuideSlug("-leading")).toBe(false);
    expect(isValidGuideSlug("trailing-")).toBe(false);
    expect(isValidGuideSlug("double--dash")).toBe(false);
    expect(isValidGuideSlug("has space")).toBe(false);
    expect(isValidGuideSlug("فارسی")).toBe(false);
    expect(isValidGuideSlug("under_score")).toBe(false);
    expect(isValidGuideSlug("x".repeat(65))).toBe(false);
    expect(isValidGuideSlug(null)).toBe(false);
    expect(isValidGuideSlug(42)).toBe(false);
  });
});

describe("rollbackAvailability", () => {
  it("وقتی مرجع verified است و هدف هم verified دارد، فعال است", () => {
    expect(
      rollbackAvailability({
        publicationStatus: "verified",
        publicationKind: "publish",
        previousVersionId: "version-1",
        targetHasVerifiedPublication: true,
      }).canRollback,
    ).toBe(true);
  });

  it("مرجع verifiedنشده، غیرفعال با دلیل است", () => {
    const result = rollbackAvailability({
      publicationStatus: "verifying",
      publicationKind: "publish",
      previousVersionId: "version-1",
      targetHasVerifiedPublication: true,
    });
    expect(result.canRollback).toBe(false);
    expect(result.reason).toMatch("verified نشده است");
  });

  it("بدون نسخهٔ قبلی، غیرفعال است", () => {
    const result = rollbackAvailability({
      publicationStatus: "verified",
      publicationKind: "publish",
      previousVersionId: null,
      targetHasVerifiedPublication: false,
    });
    expect(result.canRollback).toBe(false);
    expect(result.reason).toMatch("نسخهٔ قبلی");
  });

  it("هدف بدون Publication با وضعیت verified، غیرفعال است", () => {
    const result = rollbackAvailability({
      publicationStatus: "verified",
      publicationKind: "publish",
      previousVersionId: "version-1",
      targetHasVerifiedPublication: false,
    });
    expect(result.canRollback).toBe(false);
    expect(result.reason).toMatch("verified ندارد");
  });

  it("انتشار از نوع rollback، خودش قابل Rollback نیست", () => {
    const result = rollbackAvailability({
      publicationStatus: "verified",
      publicationKind: "rollback",
      previousVersionId: "version-1",
      targetHasVerifiedPublication: true,
    });
    expect(result.canRollback).toBe(false);
  });

  it("بدون انتشار، غیرفعال است", () => {
    const result = rollbackAvailability({
      publicationStatus: null,
      publicationKind: null,
      previousVersionId: null,
      targetHasVerifiedPublication: false,
    });
    expect(result.canRollback).toBe(false);
  });
});

describe("diffGuidePayload", () => {
  it("بدون نسخهٔ منتشرشده، انتشار اول است", () => {
    const diff = diffGuidePayload(payload(), null);
    expect(diff.isFirstPublish).toBe(true);
    expect(diff.sections[0].state).toBe("added");
  });

  it("پاراگراف یکسان، همان است؛ پاراگراف عوض‌شده، changed است", () => {
    const published = payload();
    const draft = payload({
      sections: [
        { position: 1, heading: "بخش یک", paragraphs: ["پاراگراف یک.", "پاراگراف تازه."] },
      ],
    });
    const diff = diffGuidePayload(draft, published);
    expect(diff.isFirstPublish).toBe(false);
    expect(diff.sections[0].state).toBe("changed");
    expect(diff.sections[0].paragraphs[0].state).toBe("same");
    expect(diff.sections[0].paragraphs[1].state).toBe("changed");
  });

  it("پاراگراف اضافه و بخش حذف‌شده درست علامت می‌خورند", () => {
    const published = payload();
    const draft = payload({
      sections: [
        {
          position: 1,
          heading: "بخش یک",
          paragraphs: ["پاراگراف یک.", "پاراگراف دو.", "پاراگراف سه."],
        },
        { position: 2, heading: "بخش دو", paragraphs: ["تازه."] },
      ],
    });
    const removed = payload({
      sections: [
        { position: 1, heading: "بخش یک", paragraphs: ["پاراگراف یک."] },
        { position: 2, heading: "بخش حذف‌شونده", paragraphs: ["قدیمی."] },
      ],
    });
    const diff = diffGuidePayload(draft, published);
    expect(diff.sections[0].paragraphs[2].state).toBe("added");
    expect(diff.sections[1].state).toBe("added");
    const diffRemoved = diffGuidePayload(
      payload({
        sections: [{ position: 1, heading: "بخش یک", paragraphs: ["پاراگراف یک."] }],
      }),
      removed,
    );
    const removedSection = diffRemoved.sections.find((s) => s.heading === "بخش حذف‌شونده");
    expect(removedSection?.state).toBe("removed");
  });

  it("فیلدهای تغییرکرده همهٔ فیلدها را پوشش می‌دهند، نه فقط بخش‌ها", () => {
    const published = payload();
    const draft = payload({
      title: "عنوان تازه",
      excerpt: "خلاصهٔ تازه",
      category: "دستهٔ تازه",
      faqs: [{ position: 1, question: "سؤال؟", answer: "پاسخ تازه." }],
      seo: { title: "عنوان سئو", description: "توضیح تازه", canonical_path: "/guide/test-guide" },
    });
    const diff = diffGuidePayload(draft, published);
    expect(diff.changedFields).toEqual(["title", "excerpt", "category", "faqs", "seo"]);
    expect(diff.faqs[0].state).toBe("changed");
    expect(diff.faqs[0].answerChanged).toBe(true);
    expect(diff.seoChanged).toEqual({ title: false, description: true, canonicalPath: false });
  });

  it("پیش‌نویس دقیقاً همان محتوای منتشرشده، هیچ فیلد تغییرکرده‌ای ندارد", () => {
    const published = payload();
    const diff = diffGuidePayload(payload(), published);
    expect(diff.isFirstPublish).toBe(false);
    expect(diff.changedFields).toEqual([]);
    expect(diff.sections[0].state).toBe("same");
    expect(diff.faqs[0].state).toBe("same");
    expect(diff.seoChanged).toEqual({ title: false, description: false, canonicalPath: false });
  });

  it("سؤال حذف‌شده removed می‌خورد و در انتشار اول changedFields تهی است", () => {
    const published = payload({
      faqs: [
        { position: 1, question: "سؤال؟", answer: "پاسخ." },
        { position: 2, question: "سؤال حذف‌شونده؟", answer: "پاسخ قدیمی." },
      ],
    });
    const diff = diffGuidePayload(payload(), published);
    expect(diff.changedFields).toEqual(["faqs"]);
    const removedFaq = diff.faqs.find((f) => f.question === "سؤال حذف‌شونده؟");
    expect(removedFaq?.state).toBe("removed");
    const first = diffGuidePayload(payload(), null);
    expect(first.changedFields).toEqual([]);
    expect(first.faqs[0].state).toBe("added");
  });
});

describe("server layer does not leak to the client", () => {
  const clientFiles = [
    "app/dashboard/guide-section.tsx",
    "app/dashboard/dashboard-view.tsx",
    "app/dashboard/DashboardClient.tsx",
    "app/dashboard/page.tsx",
  ];

  it("هیچ فایل مرورگری، لایهٔ سروری guide-admin را ایمپورت نمی‌کند", () => {
    for (const file of clientFiles) {
      const content = read(file);
      expect(content).not.toMatch("guide-admin");
    }
  });

  it("نام توکن و کلید سرویس در هیچ فایل مرورگری نیست", () => {
    for (const file of clientFiles) {
      const content = read(file);
      expect(content).not.toMatch("INTERNAL_PUBLISH_TOKEN");
      expect(content).not.toMatch("x-internal-publish-token");
      expect(content).not.toMatch("SUPABASE_SERVICE_ROLE_KEY");
    }
  });

  it("مسیرهای داشبورد راهنما، از لایهٔ سروری استفاده می‌کنند", () => {
    const route = read("app/api/factory-dashboard/guides/route.ts");
    expect(route).toMatch("guide-admin");
    const detail = read("app/api/factory-dashboard/guides/[id]/route.ts");
    expect(detail).toMatch("guide-admin");
  });
});
