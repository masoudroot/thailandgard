/**
 * تست نسخه‌بندی محتوای R1 (بازسازی)، با runner پروژه (vitest).
 *
 * تطبیق‌یافته از تست آزمایشگاه (MVP01-M1): موردهای تست همان‌اند،
 * ولی payload کاملاً ساختگی و خنثی است و هیچ محتوای مصنوعی Staging
 * (نشان W2 و مانند آن) در آن نیست. ایمپورت بدون پسوند است تا با
 * moduleResolution نسخهٔ main سازگار باشد.
 */
import { describe, expect, it } from "vitest";
import {
  canonicalizeJson,
  computeContentHash,
  normalizeText,
  validatePublishPayload,
  type PublishPayload,
} from "./content-versioning";

function basePayload(): PublishPayload {
  return {
    schema_version: "publish_payload_v1",
    slug: "sample-guide",
    title: "راهنمای نمونه",
    h1: null,
    published_at: null,
    excerpt: "این متن ساختگی فقط برای تست تابع Hash است.",
    category: "برنامه‌ریزی سفر",
    reading_minutes: 6,
    updated_fa: "۶ آبان ۱۴۰۵",
    sections: [
      {
        position: 1,
        heading: "فصل‌های سفر",
        paragraphs: [
          "متن نمونه برای بخش اول.",
          "تایلند در سه فصل خلاصه می‌شود؛ فصل خنک و خشک، فصل گرم و فصل بارانی.",
        ],
      },
      { position: 2, heading: "بهترین ماه‌ها برای سفر", paragraphs: ["در این نمونه، بهترین ماه‌ها به‌صورت کلی آذر تا بهمن ذکر می‌شود."] },
    ],
    faqs: [
      { position: 1, question: "این راهنما از کجا خوانده می‌شود؟", answer: "از منبع دادهٔ سایت؛ این پاسخ فقط نمونهٔ تست است." },
    ],
    seo: {
      title: "راهنمای نمونه",
      description: "این متن ساختگی فقط برای تست تابع Hash است.",
      canonical_path: "/guide/sample-guide",
    },
  };
}

describe("content-versioning (R1)", () => {
  it("hash is deterministic for the same input", () => {
    const a = computeContentHash(basePayload());
    const b = computeContentHash(basePayload());
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("changing any hash-covered field changes the hash", () => {
    const original = computeContentHash(basePayload());
    const changedTitle = basePayload();
    changedTitle.title = "عنوان دیگر";
    expect(computeContentHash(changedTitle)).not.toBe(original);
    const changedParagraph = basePayload();
    changedParagraph.sections[0].paragraphs[0] = "متن دیگر";
    expect(computeContentHash(changedParagraph)).not.toBe(original);
    const changedFaq = basePayload();
    changedFaq.faqs[0].answer = "پاسخ دیگر";
    expect(computeContentHash(changedFaq)).not.toBe(original);
  });

  it("line ending differences do not change the hash after normalization", () => {
    const withCrlf = basePayload();
    withCrlf.sections[0].paragraphs[1] = "خط اول\r\nخط دوم";
    const withLf = basePayload();
    withLf.sections[0].paragraphs[1] = "خط اول\nخط دوم";
    expect(computeContentHash(withCrlf)).toBe(computeContentHash(withLf));
    expect(normalizeText("a\r\nb\rc")).toBe("a\nb\nc");
  });

  it("NFC normalization makes composed and decomposed forms hash alike", () => {
    const composed = basePayload();
    composed.title = "café";
    const decomposed = basePayload();
    decomposed.title = "cafe\u0301";
    expect(computeContentHash(composed)).toBe(computeContentHash(decomposed));
  });

  it("canonical JSON sorts object keys and keeps array order", () => {
    expect(canonicalizeJson({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
    expect(canonicalizeJson({ items: [3, 2, 1] })).toBe('{"items":[3,2,1]}');
  });

  it("validation rejects a bad schema version, a bad canonical path, and non-increasing positions", () => {
    const badSchema = basePayload() as unknown as Record<string, unknown>;
    badSchema.schema_version = "other";
    expect(() => validatePublishPayload(badSchema)).toThrow(/schema_version/);
    const badPath = basePayload();
    badPath.seo.canonical_path = "/guide/other";
    expect(() => validatePublishPayload(badPath)).toThrow(/canonical_path/);
    const badPositions = basePayload();
    badPositions.sections[1].position = 1;
    expect(() => validatePublishPayload(badPositions)).toThrow(/strictly increasing/);
    expect(() => validatePublishPayload(basePayload())).not.toThrow();
  });
});
