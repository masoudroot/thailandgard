/**
 * رزولور یکتا برای راهنماها (SINGLE-SOURCE، مأموریت THG-UNIFY-01).
 *
 * یک قرارداد صریح، یک اولویت، یک منبع حقیقت برای هر slug مشترک؛ مسیر
 * صفحه و مسیر نقشهٔ سایت هر دو همین تابع را می‌خوانند، پس نمی‌توانند
 * برای یک slug دو جواب متفاوت بدهند.
 *
 * قرارداد اولویت (بالا به پایین، اولین مورد موجود می‌برد):
 *   ۱) نسخهٔ منتشرشده (versioned): سند content_documents با وضعیت
 *      published، غیرفیکسچر، با اشاره‌گر published_version_id ناته، و
 *      نسخه‌ای که payload معتبرش با همان slug خوانده شود. فقط همین حالت
 *      «نسخه‌ای» است.
 *   ۲) ردیف legacy جدول guides.
 *   ۳) راهنمای فقط‌فایلی guides.ts (legacy-file): تا وقتی backfill نشده،
 *      صفحه‌اش زنده می‌ماند و نقشهٔ سایت هم باید همان را فهرست کند؛
 *      وگرنه صفحهٔ ۲۰۰ در نقشه غایب می‌ماند (همان شکاف ۲۳ راهنما).
 *   ۴) در غیر این صورت، عمومی نیست (not-public).
 *
 * دو قانون سلبی که عمدی‌اند و تغییر رفتار نسبت به حالت versioned قدیم
 * صفحه‌اند (آنجا سند پیش‌نویس، حتی با وجود ردیف legacy، صفحه را ۴۰۴
 * می‌کرد، در حالی که نقشهٔ سایت همان ردیف legacy را فهرست می‌کرد):
 *   - سند پیش‌نویس، آرشیوشده یا فیکسچر هرگز slug را تصاحب نمی‌کند؛ پس
 *     هرگز محتوای legacy/file زنده را با ۴۰۴ یا حذف از نقشه خاموش
 *     نمی‌کند. ساختن پیش‌نویس، انتشار زنده را بی‌صدا پایین نمی‌کشد.
 *   - پیش‌نویس، آرشیوشده و فیکسچر هرگز وارد نقشهٔ عمومی نمی‌شوند.
 *
 * lastmod هر منبع از همان محتوایی می‌آید که سرو می‌شود: نسخه‌ای از
 * updated_fa داخل payload نسخهٔ منتشرشده، legacy از updated_fa ردیف
 * جدول، file از updatedFa فایل.
 *
 * این فایل خالص است: هیچ خوانش شبکه، هیچ next/cache، هیچ env ندارد تا
 * در تست واحد بدون ران‌تایم نکست قابل import بماند. خوانش‌ها (جدول،
 * فایل، سند نسخه‌ای) بیرون ساخته می‌شوند و فقط ورودی این‌جا می‌آیند.
 * نگاشت سند خام به ورودی نسخه‌ای با versionedInputFromDocument است تا
 * قانون وضعیت/فیکسچر/اشاره‌گر فقط یک جا زندگی کند.
 */

/** وضعیت سند نسخه‌ای، پس از نگاشت؛ نه مقدار خام دیتابیس. */
export type VersionedState =
  | "published"
  | "draft"
  | "archived"
  | "fixture"
  | "dangling";

export interface VersionedInputPublished {
  state: "published";
  updatedFa: string;
  documentId?: string;
  versionId?: string;
}

export type VersionedInput =
  | VersionedInputPublished
  | { state: Exclude<VersionedState, "published"> };

export interface LegacyTableRowInput {
  slug: string;
  updatedFa: string;
}

export interface FileGuideRowInput {
  slug: string;
  updatedFa: string;
}

export interface GuideSourceInput {
  versioned: VersionedInput | null;
  legacyTable: LegacyTableRowInput | null;
  fileGuide: FileGuideRowInput | null;
}

export type NotPublicReason =
  | "draft"
  | "archived"
  | "fixture"
  | "dangling"
  | "absent";

export type GuidePublicSource =
  | {
      kind: "versioned";
      updatedFa: string;
      documentId?: string;
      versionId?: string;
    }
  | { kind: "legacy-table"; updatedFa: string }
  | { kind: "legacy-file"; updatedFa: string }
  | { kind: "not-public"; reason: NotPublicReason };

/**
 * نگاشت سند خام content_documents + نتیجهٔ خوانش نسخه به ورودی نسخه‌ای.
 * - فیکسچر، پیش از هر چیز، fixture است (حتی با اشاره‌گر).
 * - وضعیت published + اشاره‌گر ناته + updatedFa نسخه، published است.
 * - وضعیت published + اشاره‌گر ناته ولی نسخه پیدا نشد، dangling است
 *   (خرابی داده، نه پیش‌نویس).
 * - وضعیت archived، archived است؛ هر وضعیت دیگر (draft، null، ناشناخته)
 *   draft حساب می‌شود، چون «منتشرشده» نیست.
 */
export function versionedInputFromDocument(
  doc: {
    status?: string | null;
    isTestFixture?: boolean;
    publishedVersionId?: string | null;
    documentId?: string;
  },
  versionUpdatedFa: string | null,
): VersionedInput {
  if (doc.isTestFixture) return { state: "fixture" };
  if (doc.status === "archived") return { state: "archived" };
  if (doc.status === "published" && doc.publishedVersionId) {
    if (versionUpdatedFa !== null) {
      return {
        state: "published",
        updatedFa: versionUpdatedFa,
        documentId: doc.documentId,
        versionId: doc.publishedVersionId,
      };
    }
    return { state: "dangling" };
  }
  return { state: "draft" };
}

/** رزولوشن یک slug با همان اولویت قرارداد بالا. */
export function resolveGuidePublicSource(
  input: GuideSourceInput,
): GuidePublicSource {
  const { versioned, legacyTable, fileGuide } = input;
  if (versioned && versioned.state === "published") {
    return {
      kind: "versioned",
      updatedFa: versioned.updatedFa,
      documentId: versioned.documentId,
      versionId: versioned.versionId,
    };
  }
  if (legacyTable) {
    return { kind: "legacy-table", updatedFa: legacyTable.updatedFa };
  }
  if (fileGuide) {
    return { kind: "legacy-file", updatedFa: fileGuide.updatedFa };
  }
  if (!versioned) return { kind: "not-public", reason: "absent" };
  switch (versioned.state) {
    case "fixture":
      return { kind: "not-public", reason: "fixture" };
    case "archived":
      return { kind: "not-public", reason: "archived" };
    case "dangling":
      return { kind: "not-public", reason: "dangling" };
    default:
      return { kind: "not-public", reason: "draft" };
  }
}

/** آیا این منبع در نقشهٔ عمومی می‌آید؟ فقط not-public نمی‌آید. */
export function isPublicGuideSource(source: GuidePublicSource): boolean {
  return source.kind !== "not-public";
}

/** ردیف نقشهٔ سایت برای یک منبع؛ not-public یعنی null (حذف از نقشه). */
export function sitemapRowForGuide(
  slug: string,
  source: GuidePublicSource,
): { slug: string; updatedFa: string } | null {
  if (source.kind === "not-public") return null;
  return { slug, updatedFa: source.updatedFa };
}

export interface SitemapGuideEntry {
  slug: string;
  versioned: VersionedInput | null;
  legacyTable: LegacyTableRowInput | null;
  fileGuide: FileGuideRowInput | null;
}

/**
 * رزولوشن دسته‌ای برای نقشهٔ سایت: فقط منابع عمومی برمی‌گردند، با همان
 * ترتیبی که slugها داده شده‌اند. ترتیب ورودی، ترتیب خروجی است.
 */
export function resolveSitemapGuideRows(
  entries: SitemapGuideEntry[],
): { slug: string; updatedFa: string }[] {
  const rows: { slug: string; updatedFa: string }[] = [];
  for (const entry of entries) {
    const row = sitemapRowForGuide(
      entry.slug,
      resolveGuidePublicSource({
        versioned: entry.versioned,
        legacyTable: entry.legacyTable,
        fileGuide: entry.fileGuide,
      }),
    );
    if (row) rows.push(row);
  }
  return rows;
}

/* ------------------------------------------------------------------ */
/* مالکیت نوشتن (write ownership): نسخه‌ای در برابر legacy            */
/* ------------------------------------------------------------------ */

/**
 * عملیات‌های راهنما در روت content-sync که زیر گارد مالکیت‌اند. فقط
 * همین‌ها؛ عملیات تور، تنظیمات و lead_alert دست نمی‌خورند.
 */
export const GUIDE_CONTENT_SYNC_OPS: ReadonlySet<string> = new Set([
  "guide.insert",
  "guide.set_excerpt",
  "guide.set_title",
  "guide.set_h1",
  "guide_section.insert",
  "guide_section.set_paragraphs",
  "guide_section.set_title",
  "guide_section.move",
  "guide_section.set_position",
  "guide_faq.update",
  "guide_faq.insert",
]);

export interface ContentSyncOpLike {
  op: unknown;
  slug?: unknown;
  guide_slug?: unknown;
}

/**
 * slug اثرگرفتهٔ یک op راهنما؛ برای غیرراهنما null. guide.insert از
 * فیلد slug می‌آید، بقیه از guide_slug.
 */
export function guideSlugOfOp(op: ContentSyncOpLike): string | null {
  if (typeof op.op !== "string" || !GUIDE_CONTENT_SYNC_OPS.has(op.op)) {
    return null;
  }
  const slug = op.op === "guide.insert" ? op.slug : op.guide_slug;
  return typeof slug === "string" && slug.length > 0 ? slug : null;
}

/** پیام صریح مسدودشدن؛ همیشه slug و مسیر درست را نام می‌برد، نه خطای مبهم. */
export function ownershipErrorForSlug(slug: string): string {
  return (
    `مالکیت نسخه‌ای: راهنمای ${slug} سند محتوایی نسخه‌ای (غیرفیکسچر) دارد؛ ` +
    `نوشتن از مسیر legacy مسدود است. تغییر باید از مسیر نسخه‌ای انجام شود.`
  );
}

/** پیام صریح خرابیِ خودِ بررسی مالکیت؛ fail-closed، نه عبور بی‌صدا. */
export function ownershipCheckFailedError(): string {
  return (
    "مالکیت نسخه‌ای: بررسی سند نسخه‌ای ناموفق بود؛ نوشتن راهنما از مسیر " +
    "legacy تا وقتی مالکیت روشن نشود مسدود است."
  );
}

export interface VersionedDocumentLike {
  slug: string;
  isTestFixture?: boolean;
}

/**
 * slugهایی که مالک نسخه‌ای دارند: سندی غیرفیکسچر با همان slug. فیکسچر
 * دادهٔ آزمون است و مالکیت نمی‌سازد؛ slug بدون سند هم آزاد است.
 */
export function versionedOwnedSlugs(
  documents: VersionedDocumentLike[],
  slugs: string[],
): Set<string> {
  const wanted = new Set(slugs);
  const owned = new Set<string>();
  for (const doc of documents) {
    if (wanted.has(doc.slug) && !doc.isTestFixture) owned.add(doc.slug);
  }
  return owned;
}

export interface OwnershipDecision {
  op: string;
  slug: string | null;
  blocked: boolean;
  error: string | null;
}

/**
 * تصمیم مالکیت برای یک بچ عملیات، از روی یک عکس لحظه‌ای از اسناد
 * نسخه‌ای. تصمیم، تابعی خالص از همان عکس است؛ پس دو نویسندهٔ هم‌زمان
 * که یک عکس را ببینند، هر دو همان تصمیم را می‌گیرند: مالک نسخه‌ای
 * می‌برد و مسیر قدیمی با خطای صریح می‌ایستد، هرگز بی‌صدا رد نمی‌شود.
 * خرابی بررسی (lookupFailed) همهٔ opهای راهنما را مسدود می‌کند؛
 * opهای غیرراهنما هرگز مسدود نمی‌شوند.
 */
export function classifyContentSyncOwnership(
  ops: ContentSyncOpLike[],
  documents: VersionedDocumentLike[],
  lookupFailed: boolean,
): OwnershipDecision[] {
  const guideSlugs = ops
    .map((op) => guideSlugOfOp(op))
    .filter((s): s is string => s !== null);
  const owned = lookupFailed
    ? new Set<string>()
    : versionedOwnedSlugs(documents, guideSlugs);
  return ops.map((op) => {
    const slug = guideSlugOfOp(op);
    if (slug === null) {
      return { op: String(op.op), slug: null, blocked: false, error: null };
    }
    if (lookupFailed) {
      return { op: String(op.op), slug, blocked: true, error: ownershipCheckFailedError() };
    }
    if (owned.has(slug)) {
      return { op: String(op.op), slug, blocked: true, error: ownershipErrorForSlug(slug) };
    }
    return { op: String(op.op), slug, blocked: false, error: null };
  });
}
