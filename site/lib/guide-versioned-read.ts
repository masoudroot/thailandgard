/**
 * خواندن نسخه‌ای راهنما پشت پرچم CONTENT_READ_MODE (R2-B).
 *
 * فقط سمت سرور است. مسیر legacy در db-content دست نخورده می‌ماند و این فایل
 * فقط برای دو slug در محدودهٔ Staging وارد مسیر صفحه می‌شود:
 * راهنمای واقعی best-time-to-visit-thailand و سند آزمایشی جدا r2b-test-doc.
 * بقیهٔ slugها همیشه از legacy خوانده می‌شوند.
 *
 * حالت‌ها (مقدار پیش‌فرض legacy است؛ نبودن یا نامعتبر بودن متغیر هم legacy
 * می‌شود تا Production با این تغییر هرگز از مسیر legacy خارج نشود):
 * - legacy: فقط خواندن قدیمی از جدول‌های guides و guide_sections و guide_faqs.
 * - versioned: فقط خواندن نسخه‌ای؛ نبودن document یا نسخهٔ منتشرشده، خطای
 *   صریح می‌دهد و هرگز بی‌صدا به legacy برنمی‌گردد.
 * - shadow_compare: صفحه با legacy رندر می‌شود و مقایسهٔ هر دو رندر، سمت
 *   سرور ثبت می‌شود؛ مقایسه هرگز چیزی را منتشر نمی‌کند.
 *
 * خواندن نسخه‌ای با کلید service_role انجام می‌شود، چون RLS جدول
 * content_versions برای anon فقط نسخهٔ منتشرشده را نشان می‌دهد و اثبات
 * جابه‌جایی اشاره‌گر (خواندن نسخهٔ غیرمنتشرشده) به دسترسی service_role نیاز
 * دارد. کلید فقط سمت سرور می‌ماند و هرگز در پاسخ یا لاگ نمی‌آید.
 */

import { createHash } from "node:crypto";
import { appendFileSync } from "node:fs";
import { validatePublishPayload, type PublishPayload } from "./content-versioning";
import type { Guide } from "./guides";
import { logger } from "./logger";

export type ContentReadMode = "legacy" | "versioned" | "shadow_compare";

/** slugهایی که خواندن نسخه‌ای برایشان باز است؛ بقیه همیشه legacy می‌مانند. */
export const VERSIONED_READ_SLUGS: readonly string[] = [
  "best-time-to-visit-thailand",
  "r2b-test-doc",
];

export function isVersionedReadSlug(slug: string): boolean {
  return VERSIONED_READ_SLUGS.includes(slug);
}

/** مقدار خام متغیر محیطی را به حالت معتبر تبدیل کن؛ نامعتبر یعنی legacy. */
export function resolveContentReadMode(raw: string | undefined | null): ContentReadMode {
  const value = (raw ?? "").trim().toLowerCase();
  if (value === "versioned" || value === "shadow_compare") return value;
  return "legacy";
}

/** حالت جاری را از متغیر محیطی سرور بخوان (هر درخواست، نه زمان بیلد). */
export function getContentReadMode(): ContentReadMode {
  return resolveContentReadMode(process.env.CONTENT_READ_MODE);
}

export type VersionedReadErrorCode =
  | "DOCUMENT_NOT_FOUND"
  | "VERSION_NOT_FOUND"
  | "VERSION_MISMATCH"
  | "UPSTREAM_ERROR"
  | "NOT_CONFIGURED";

/** خطای صریح خواندن نسخه‌ای؛ پیامش فقط slug و شناسه و وضعیت دارد، نه Secret. */
export class VersionedReadError extends Error {
  readonly code: VersionedReadErrorCode;
  constructor(code: VersionedReadErrorCode, message: string) {
    super(message);
    this.name = "VersionedReadError";
    this.code = code;
  }
}

interface DocumentRow {
  id: string;
  slug: string;
  canonical_path: string;
  published_version_id: string | null;
}

interface VersionRow {
  id: string;
  content_id: string;
  version_no: number;
  payload: unknown;
  content_hash: string;
}

export interface VersionedReadConfig {
  supabaseUrl: string;
  serviceRoleKey: string;
}

/** پیکربندی خواندن نسخه‌ای از متغیرهای سرور؛ نبودن هر کدام یعنی null. */
export function readVersionedReadConfig(): VersionedReadConfig | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return { supabaseUrl, serviceRoleKey };
}

type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;

async function postgrestGet(
  cfg: VersionedReadConfig,
  table: string,
  query: string,
  fetchFn: FetchFn,
): Promise<unknown[]> {
  const res = await fetchFn(`${cfg.supabaseUrl}/rest/v1/${table}?${query}`, {
    headers: { apikey: cfg.serviceRoleKey, Authorization: `Bearer ${cfg.serviceRoleKey}` },
  });
  if (!res.ok) {
    throw new VersionedReadError(
      "UPSTREAM_ERROR",
      `versioned read: ${table} returned HTTP ${res.status}`,
    );
  }
  const data: unknown = await res.json().catch(() => null);
  if (!Array.isArray(data)) {
    throw new VersionedReadError(
      "UPSTREAM_ERROR",
      `versioned read: ${table} returned a non-array body`,
    );
  }
  return data;
}

export interface VersionedGuideResult {
  guide: Guide;
  documentId: string;
  versionId: string;
  versionNo: number;
  contentHash: string;
  canonicalPath: string;
}

/**
 * نسخهٔ منتشرشدهٔ یک slug را بخوان: document، بعد published_version_id، بعد
 * همان نسخه. هر گام خراب، خطای صریح با کد مشخص می‌دهد؛ fallback بی‌صدا نیست.
 * پارامتر fetchFn فقط برای تست است؛ در مسیر واقعی fetch سراسری می‌آید.
 */
export async function fetchVersionedGuide(
  slug: string,
  cfg: VersionedReadConfig | null,
  fetchFn: FetchFn = fetch,
): Promise<VersionedGuideResult> {
  if (!cfg) {
    throw new VersionedReadError(
      "NOT_CONFIGURED",
      "versioned read: SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL is not configured",
    );
  }
  const docs = (await postgrestGet(
    cfg,
    "content_documents",
    `content_type=eq.guide&slug=eq.${encodeURIComponent(slug)}&select=id,slug,canonical_path,published_version_id`,
    fetchFn,
  )) as DocumentRow[];
  const doc = docs[0];
  if (!doc) {
    throw new VersionedReadError(
      "DOCUMENT_NOT_FOUND",
      `versioned read: no content document for slug ${slug}`,
    );
  }
  if (!doc.published_version_id) {
    throw new VersionedReadError(
      "VERSION_NOT_FOUND",
      `versioned read: document ${slug} has no published version`,
    );
  }
  const versions = (await postgrestGet(
    cfg,
    "content_versions",
    `id=eq.${encodeURIComponent(doc.published_version_id)}&select=id,content_id,version_no,payload,content_hash`,
    fetchFn,
  )) as VersionRow[];
  const version = versions[0];
  if (!version) {
    throw new VersionedReadError(
      "VERSION_NOT_FOUND",
      `versioned read: published version ${doc.published_version_id} for slug ${slug} was not found`,
    );
  }
  if (version.content_id !== doc.id) {
    throw new VersionedReadError(
      "VERSION_MISMATCH",
      `versioned read: published version ${version.id} does not belong to document ${doc.id}`,
    );
  }
  validatePublishPayload(version.payload);
  const payload = version.payload as PublishPayload;
  if (payload.slug !== slug) {
    throw new VersionedReadError(
      "VERSION_MISMATCH",
      `versioned read: payload slug ${payload.slug} does not match requested slug ${slug}`,
    );
  }
  return {
    guide: payloadToGuide(payload),
    documentId: doc.id,
    versionId: version.id,
    versionNo: version.version_no,
    contentHash: version.content_hash,
    canonicalPath: doc.canonical_path,
  };
}

/** نگاشت خالص payload نسخه به مدل Guide صفحه (همان فیلدهای legacy). */
export function payloadToGuide(payload: PublishPayload): Guide {
  return {
    slug: payload.slug,
    title: payload.title,
    h1: payload.h1,
    publishedAt: payload.published_at,
    excerpt: payload.excerpt,
    category: payload.category,
    readingMinutes: payload.reading_minutes,
    updatedFa: payload.updated_fa,
    sections: payload.sections.map((s) => ({ heading: s.heading, paragraphs: s.paragraphs })),
    faqs: payload.faqs.map((f) => ({ question: f.question, answer: f.answer })),
  };
}

/** متن قابل‌مشاهدهٔ یک راهنما: تیتر و لید و بخش‌ها و سؤال‌ها، به همان ترتیب. */
export function visibleTextOf(guide: Guide): string {
  return [
    guide.title,
    guide.excerpt,
    ...guide.sections.flatMap((s) => [s.heading, ...s.paragraphs]),
    ...guide.faqs.flatMap((f) => [f.question, f.answer]),
  ].join("\n");
}

/** SHA-256 هگز از متن قابل‌مشاهده؛ همان متن، همان Hash. */
export function visibleTextHash(guide: Guide): string {
  return createHash("sha256").update(visibleTextOf(guide), "utf8").digest("hex");
}

/** نمایی از یک رندر برای مقایسه: متادیتا و کنونیکال و بخش‌ها و FAQ و Hash. */
export interface RenderSnapshot {
  title: string;
  description: string;
  canonical: string;
  sectionHeadings: string[];
  sectionCount: number;
  faqQuestions: string[];
  faqCount: number;
  visibleHash: string;
}

export function snapshotOf(guide: Guide): RenderSnapshot {
  return {
    title: guide.title,
    description: guide.excerpt,
    canonical: `/guide/${guide.slug}`,
    sectionHeadings: guide.sections.map((s) => s.heading),
    sectionCount: guide.sections.length,
    faqQuestions: guide.faqs.map((f) => f.question),
    faqCount: guide.faqs.length,
    visibleHash: visibleTextHash(guide),
  };
}

export interface GuideComparison {
  slug: string;
  equal: boolean;
  differences: string[];
  legacy: RenderSnapshot;
  versioned: RenderSnapshot;
}

/** مقایسهٔ دو رندر؛ differences فقط نام میدان‌های نابرابر را می‌برد. */
export function compareGuideRenders(
  slug: string,
  legacyGuide: Guide,
  versionedGuide: Guide,
): GuideComparison {
  const legacy = snapshotOf(legacyGuide);
  const versioned = snapshotOf(versionedGuide);
  const differences: string[] = [];
  if (legacy.title !== versioned.title) differences.push("title");
  if (legacy.description !== versioned.description) differences.push("description");
  if (legacy.canonical !== versioned.canonical) differences.push("canonical");
  if (
    JSON.stringify(legacyGuide.sections) !== JSON.stringify(versionedGuide.sections)
  ) {
    differences.push("sections");
  }
  if (JSON.stringify(legacyGuide.faqs) !== JSON.stringify(versionedGuide.faqs)) {
    differences.push("faqs");
  }
  if (legacy.visibleHash !== versioned.visibleHash) differences.push("visibleHash");
  return { slug, equal: differences.length === 0, differences, legacy, versioned };
}

export type ShadowCompareRecord =
  | {
      slug: string;
      mode: "shadow_compare";
      available: true;
      comparison: GuideComparison;
      versionId: string;
      versionNo: number;
      contentHash: string;
    }
  | {
      slug: string;
      mode: "shadow_compare";
      available: false;
      error: string;
    };

/**
 * ثبت مقایسه: اگر SHADOW_COMPARE_LOG_PATH ست شده باشد، یک خط JSON به همان
 * فایل الصاق می‌شود. خط لاگ فقط در فاز بیلد می‌آید: مهر زمانی logger بیرون
 * از فاز بیلد، رندر استاتیک درخواستی را مسموم می‌کند (bailout) حتی وقتی خط
 * نوشته شده باشد؛ پس بیرون از بیلد، لاگ اصلاً صدا زده نمی‌شود و فایل تنها
 * شاهد است. این محدودیت logger مخزن است نه این ماژول. رکورد عمداً مهر
 * زمانی ندارد و زمان ثبت را از مهر خط لاگ (در بیلد) و mtime فایل می‌خوانند.
 * رندر صفحه دو بار اجرا می‌شود (HTML و RSC) و هر دو بار همان خط را
 * می‌نویسند؛ دو خط یکسان، یک رویداد است نه دو رویداد. مقایسه هرگز چیزی
 * منتشر نمی‌کند.
 */
export function recordShadowCompare(record: ShadowCompareRecord): void {
  const path = process.env.SHADOW_COMPARE_LOG_PATH;
  if (path) {
    try {
      appendFileSync(path, `${JSON.stringify(record)}\n`, "utf8");
    } catch {
      // ثبت، بهترین تلاش است؛ خرابی فایل صفحه را نمی‌شکند.
    }
  }
  if (process.env.NEXT_PHASE === "phase-production-build") {
    logger.info(`[r2b shadow_compare] ${JSON.stringify(record)}`);
  }
}
