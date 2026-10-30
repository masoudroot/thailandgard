/**
 * نسخه‌بندی محتوای R1 (بازسازی)، فقط برای راهنما (guide) در این فاز.
 *
 * تطبیق‌یافته از آزمایشگاه (MVP01-M1) برای شاخهٔ rebuild/factory-r1 از main.
 * بدنهٔ کد بدون تغییر مانده تا قرارداد اثبات‌شده حفظ شود؛ تطبیق در سربرگ،
 * مستندسازی وضعیت dormant، و راستی‌آزمایی سازگاری با main است:
 * این فایل فقط سمت سرور است و هیچ وابستگی تازه‌ای ندارد
 * (SHA-256 از node:crypto می‌آید) و هیچ ایمپورتی از db-content ندارد،
 * پس db-content نسخهٔ main دست نخورده است.
 *
 * وضعیت در R1: DORMANT. هیچ مسیر عمومی‌ای این فایل را نمی‌خواند،
 * هیچ Pointer عمومی فعال نیست و مسیر خواندن فعلی از منبع قدیمی می‌خواند.
 * سیم‌کشی خواندن نسخه‌ای به فاز جداگانه با تأیید جداگانه موکول شده است.
 *
 * قرارداد publish_payload_v1:
 * - payload یک Snapshot کامل و قابل رندر است، نه diff.
 * - فیلدهای مشمول Hash دقیقاً همان فیلدهای همین آبجکت‌اند.
 * - متادیتای دیتابیس (id، created_at، content_hash خودش) جزء payload نیست.
 * - content_hash جداگانه در ستون content_versions.content_hash ذخیره می‌شود.
 * - همهٔ رشته‌ها پیش از Hash با Unicode NFC نرمال و Line Endingها با LF یکی می‌شوند.
 * - Canonical JSON: کلیدهای آبجکت به ترتیب الفبایی (مرتب‌سازی پیش‌فرض رشتهٔ JS)،
 *   آرایه‌ها ترتیب خودشان را نگه می‌دارند، بدون فاصلهٔ اضافه، جداکنندهٔ «,» و «:».
 */

import { createHash } from "node:crypto";

export interface PublishPayloadSection {
  position: number;
  heading: string;
  paragraphs: string[];
}

export interface PublishPayloadFaq {
  position: number;
  question: string;
  answer: string;
}

export interface PublishPayloadSeo {
  title: string;
  description: string;
  canonical_path: string;
}

export interface PublishPayload {
  schema_version: "publish_payload_v1";
  slug: string;
  title: string;
  h1: string | null;
  published_at: string | null;
  excerpt: string;
  category: string;
  reading_minutes: number;
  updated_fa: string;
  sections: PublishPayloadSection[];
  faqs: PublishPayloadFaq[];
  seo: PublishPayloadSeo;
}

/** رشته را به NFC ببر و Line Endingها را به LF یکی کن. */
export function normalizeText(text: string): string {
  return text.normalize("NFC").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

/** همهٔ رشته‌های یک مقدار (بازگشتی) را نرمال کن؛ ترتیب آرایه‌ها حفظ می‌شود. */
export function normalizeValue(value: unknown): unknown {
  if (typeof value === "string") return normalizeText(value);
  if (Array.isArray(value)) return value.map((item) => normalizeValue(item));
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      out[key] = normalizeValue(item);
    }
    return out;
  }
  return value;
}

/** Canonical JSON یک مقدار نرمال‌شده: کلیدها مرتب، بدون فاصلهٔ اضافه. */
export function canonicalizeJson(value: unknown): string {
  const normalized = normalizeValue(value);
  return canonicalizeNormalized(normalized);
}

function canonicalizeNormalized(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("canonicalizeJson: number must be finite");
    return JSON.stringify(value);
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalizeNormalized(item)).join(",")}]`;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a < b ? -1 : a > b ? 1 : 0,
    );
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonicalizeNormalized(item)}`).join(",")}}`;
  }
  throw new Error("canonicalizeJson: unsupported value type");
}

/** SHA-256 هگز از Canonical JSON payload. ورودی اول اعتبارسنجی می‌شود. */
export function computeContentHash(payload: PublishPayload): string {
  validatePublishPayload(payload);
  const canonical = canonicalizeJson(payload);
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requireNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`validatePublishPayload: ${field} must be a non-empty string`);
  }
  return value;
}

function requireNullableString(value: unknown, field: string): string | null {
  if (value === null) return null;
  if (typeof value !== "string") {
    throw new Error(`validatePublishPayload: ${field} must be a string or null`);
  }
  return value;
}

function requirePositionsStrictlyIncreasing(positions: number[], field: string): void {
  for (let i = 1; i < positions.length; i++) {
    if (positions[i] <= positions[i - 1]) {
      throw new Error(`validatePublishPayload: ${field} positions must be strictly increasing`);
    }
  }
}

/**
 * اعتبارسنجی ساختار publish_payload_v1. در اولین تخلف خطا می‌دهد؛
 * هیچ مقدار نامعتبری بی‌سروصدا اصلاح نمی‌شود.
 */
export function validatePublishPayload(value: unknown): asserts value is PublishPayload {
  if (!isRecord(value)) throw new Error("validatePublishPayload: payload must be an object");
  if (value.schema_version !== "publish_payload_v1") {
    throw new Error('validatePublishPayload: schema_version must be "publish_payload_v1"');
  }
  const slug = requireNonEmptyString(value.slug, "slug");
  requireNonEmptyString(value.title, "title");
  requireNullableString(value.h1, "h1");
  requireNullableString(value.published_at, "published_at");
  requireNonEmptyString(value.excerpt, "excerpt");
  requireNonEmptyString(value.category, "category");
  if (typeof value.reading_minutes !== "number" || !Number.isInteger(value.reading_minutes) || value.reading_minutes <= 0) {
    throw new Error("validatePublishPayload: reading_minutes must be a positive integer");
  }
  requireNonEmptyString(value.updated_fa, "updated_fa");
  if (!Array.isArray(value.sections)) {
    throw new Error("validatePublishPayload: sections must be an array");
  }
  const sectionPositions: number[] = [];
  for (const section of value.sections as unknown[]) {
    if (!isRecord(section)) throw new Error("validatePublishPayload: section must be an object");
    if (typeof section.position !== "number" || !Number.isInteger(section.position) || section.position < 1) {
      throw new Error("validatePublishPayload: section.position must be a positive integer");
    }
    sectionPositions.push(section.position);
    requireNonEmptyString(section.heading, "section.heading");
    if (!Array.isArray(section.paragraphs) || section.paragraphs.some((p) => typeof p !== "string")) {
      throw new Error("validatePublishPayload: section.paragraphs must be an array of strings");
    }
  }
  requirePositionsStrictlyIncreasing(sectionPositions, "sections");
  if (!Array.isArray(value.faqs)) {
    throw new Error("validatePublishPayload: faqs must be an array");
  }
  const faqPositions: number[] = [];
  for (const faq of value.faqs as unknown[]) {
    if (!isRecord(faq)) throw new Error("validatePublishPayload: faq must be an object");
    if (typeof faq.position !== "number" || !Number.isInteger(faq.position) || faq.position < 1) {
      throw new Error("validatePublishPayload: faq.position must be a positive integer");
    }
    faqPositions.push(faq.position);
    requireNonEmptyString(faq.question, "faq.question");
    requireNonEmptyString(faq.answer, "faq.answer");
  }
  requirePositionsStrictlyIncreasing(faqPositions, "faqs");
  if (!isRecord(value.seo)) throw new Error("validatePublishPayload: seo must be an object");
  requireNonEmptyString(value.seo.title, "seo.title");
  requireNonEmptyString(value.seo.description, "seo.description");
  const canonicalPath = requireNonEmptyString(value.seo.canonical_path, "seo.canonical_path");
  if (canonicalPath !== `/guide/${slug}`) {
    throw new Error("validatePublishPayload: seo.canonical_path must equal /guide/<slug>");
  }
}
