import type { MetadataRoute } from "next";
import { getSitemapRows } from "@/lib/db-content";
import { CATEGORY_SLUGS } from "@/lib/tour-categories";

/**
 * سازندهٔ مشترک بخش‌های نقشهٔ سایت (دستور مسعود، ۲۰ مهر ۱۴۰۵).
 *
 * سه بخش: pages (مسیرهای ثابت)، tours، guides. هر سه از دیتابیس زنده خوانده
 * می‌شوند (خودبه‌روزشونده؛ وابسته به دپلوی نیست).
 * مصرف‌کننده‌ها:
 * - ‎app/sitemap.ts‎ → نقشهٔ کامل تک‌فایل در ‎/sitemap.xml‎
 * - ‎app/sitemap/[section]/route.ts‎ → بخش جدا برای آمار تفکیکی سرچ کنسول
 */

/**
 * یافتهٔ S1 تیم سئو (۱۹ مهر ۱۴۰۵): lastmod هر مسیر پایدار و معنادار است،
 * نه «همین حالا»:
 * - راهنماها: از فیلد updated_fa رکورد («۱۹ مهر ۱۴۰۵») به میلادی برمی‌گردد.
 * - تورها: از price_updated_at رکورد (سینک ساعتی تورسنج)؛ تا وقتی null است،
 *   ثابت مستند TOURS_LASTMOD (تاریخ زنده‌شدن سایت). با آمدن ستون
 *   tours.updated_at (مایگریشن با مدیر/مسعود) همین‌جا جایگزین می‌شود.
 * - مسیرهای استاتیک: سقف تازگیِ محتوای DBای که همان صفحه نشان می‌دهد ؛
 *   خانه: تورها + راهنماها؛ /tours: تورها؛ /guide: راهنماها؛ /contact: ثابت
 *   (محتوای ثابت، تغییرش با دپلوی کد است)؛ /phuket-october: lastmod واقعی
 *   انتشار خودش (۱۹ مهر ۱۴۰۵).
 * رفع ریشه‌ای S-104/S-112 (۲۱ مهر ۱۴۰۵): دیگر lastmod یکسانِ کاذب در
 * tours.xml/pages.xml نیست؛ هر تاریخ از سیگنال واقعی می‌آید.
 */
const TOURS_LASTMOD = new Date("2026-10-10T00:00:00+03:30"); // زنده‌شدن سایت (۱۸ مهر ۱۴۰۵)
const STATIC_LASTMOD = new Date("2026-10-10T00:00:00+03:30"); // زنده‌شدن سایت (۱۸ مهر ۱۴۰۵)

const FA_MONTHS: Record<string, number> = {
  فروردین: 1,
  اردیبهشت: 2,
  خرداد: 3,
  تیر: 4,
  مرداد: 5,
  شهریور: 6,
  مهر: 7,
  آبان: 8,
  آذر: 9,
  دی: 10,
  بهمن: 11,
  اسفند: 12,
};

function faDigitsToEn(s: string): string {
  return s.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
}

/** تبدیل تاریخ شمسی به میلادی (الگوریتم استاندارد تقویم جلالی) */
function jalaliToGregorian(jy: number, jm: number, jd: number): Date {
  jy += 1595;
  let days =
    -355668 + 365 * jy + Math.floor(jy / 33) * 8 + Math.floor(((jy % 33) + 3) / 4) + jd +
    (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);
  let gy = 400 * Math.floor(days / 146097);
  days %= 146097;
  if (days > 36524) {
    days--;
    gy += 100 * Math.floor(days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let gd = days + 1;
  const leap = gy % 4 === 0 && (gy % 100 !== 0 || gy % 400 === 0);
  const monthLen = [0, 31, leap ? 29 : 28, 31, 30, 31, 30, 31, 30, 31, 30, 31, 30, 31];
  let gm = 0;
  while (gm < 13 && gd > monthLen[gm]) {
    gd -= monthLen[gm];
    gm++;
  }
  return new Date(Date.UTC(gy, gm - 1, gd));
}

/** «۱۹ مهر ۱۴۰۵» -> Date؛ اگر قالب نخورد، همان ثابت استاتیک */
function guideLastMod(updatedFa: string): Date {
  const m = faDigitsToEn(updatedFa).trim().match(/^(\d{1,2})\s+(\S+)\s+(\d{4})$/);
  if (!m) return STATIC_LASTMOD;
  const jm = FA_MONTHS[m[2]];
  if (!jm) return STATIC_LASTMOD;
  return jalaliToGregorian(Number(m[3]), jm, Number(m[1]));
}

export interface SitemapSections {
  base: string;
  pages: MetadataRoute.Sitemap;
  tours: MetadataRoute.Sitemap;
  guides: MetadataRoute.Sitemap;
}

/**
 * ردیف راهنمای نسخه‌ای منتشرشده برای نقشهٔ سایت: فقط slug و تاریخ
 * شمسی به‌روزرسانی از payload نسخهٔ منتشرشده.
 */
export interface PublishedVersionedGuideRow {
  slug: string;
  updatedFa: string;
}

/**
 * اجتماع راهنماهای legacy و نسخه‌ای برای نقشهٔ سایت (CONTENT-FIRST):
 * برخورد slug، legacy می‌برد، چون صفحهٔ زنده در حالت legacy همان محتوای
 * legacy را نشان می‌دهد و lastmod باید با محتوای سرو‌شده بخواند.
 * راهنمای فقط‌نسخه‌ای (بدون سطر legacy) با lastmod نسخهٔ منتشرشده‌اش
 * اضافه می‌شود. این تابع خالص است و فیلتر وضعیت را انجام نمی‌دهد؛
 * فیلتر (published و اشاره‌گر ناته و غیرفیکسچر) در خوانش زیر است.
 */
export function mergeSitemapGuides(
  legacy: PublishedVersionedGuideRow[],
  versioned: PublishedVersionedGuideRow[],
): PublishedVersionedGuideRow[] {
  const seen = new Set(legacy.map((g) => g.slug));
  const merged = [...legacy];
  for (const guide of versioned) {
    if (!seen.has(guide.slug)) {
      seen.add(guide.slug);
      merged.push(guide);
    }
  }
  return merged;
}

type SitemapFetchFn = (url: string, init?: RequestInit) => Promise<Response>;

interface VersionedDocRow {
  id: string;
  slug: string;
  published_version_id: string;
}

interface VersionedVersionRow {
  id: string;
  payload: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * راهنماهای نسخه‌ای منتشرشده را با کلید anon می‌خواند (همان الگوی
 * getSitemapRows): فقط content_documents با status برابر published و
 * اشاره‌گر ناته و غیرفیکسچر؛ بعد payload نسخهٔ منتشرشدهٔ همان‌ها.
 * RLS نسخه‌ها برای anon فقط نسخهٔ منتشرشده را نشان می‌دهد، پس سطر
 * نسخهٔ پیش‌نویس هرگز این‌جا دیده نمی‌شود. سندی که نسخهٔ اشاره‌شده‌اش
 * پیدا نشد (اشاره‌گر آویزان) از نقشه می‌افتد، چون صفحه‌اش هم در حالت
 * versioned خطا می‌دهد و نباید تبلیغ شود. هر خرابی خوانش یا نبودن
 * env، فهرست تهی می‌دهد تا نقشهٔ سایت با همان legacy به کارش ادامه
 * دهد؛ پیش‌نویس، آرشیوشده یا منتشرنشده هرگز وارد نمی‌شود.
 */
export async function fetchPublishedVersionedGuides(
  fetchFn: SitemapFetchFn = fetch,
): Promise<PublishedVersionedGuideRow[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return [];
  try {
    const docsRes = await fetchFn(
      `${url}/rest/v1/content_documents?content_type=eq.guide&status=eq.published&published_version_id=not.is.null&is_test_fixture=is.false&select=id,slug,published_version_id`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } },
    );
    if (!docsRes.ok) return [];
    const docsRaw: unknown = await docsRes.json().catch(() => null);
    if (!Array.isArray(docsRaw)) return [];
    const docs = docsRaw.filter(
      (d): d is VersionedDocRow =>
        isRecord(d) &&
        typeof d.id === "string" &&
        typeof d.slug === "string" &&
        d.slug.length > 0 &&
        typeof d.published_version_id === "string",
    );
    if (docs.length === 0) return [];
    const ids = docs.map((d) => d.id).join(",");
    const versionsRes = await fetchFn(
      `${url}/rest/v1/content_versions?id=in.(${ids})&select=id,payload`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } },
    );
    if (!versionsRes.ok) return [];
    const versionsRaw: unknown = await versionsRes.json().catch(() => null);
    if (!Array.isArray(versionsRaw)) return [];
    const payloadById = new Map<string, unknown>();
    for (const v of versionsRaw) {
      if (isRecord(v) && typeof v.id === "string") payloadById.set(v.id, v.payload);
    }
    const rows: PublishedVersionedGuideRow[] = [];
    for (const doc of docs) {
      const payload = payloadById.get(doc.published_version_id);
      if (!isRecord(payload)) continue;
      const updatedFa = typeof payload.updated_fa === "string" ? payload.updated_fa : "";
      rows.push({ slug: doc.slug, updatedFa });
    }
    return rows;
  } catch {
    return [];
  }
}

export async function getSitemapSections(): Promise<SitemapSections> {
  const [{ base, guides, tours }, versionedGuides] = await Promise.all([
    getSitemapRows(),
    fetchPublishedVersionedGuides(),
  ]);
  // اجتماع legacy و نسخه‌ای؛ برخورد، legacy می‌برد (نگاه به mergeSitemapGuides).
  const allGuides = mergeSitemapGuides(guides, versionedGuides);

  // سیگنال‌های واقعی تازگی (S-104/S-112): تاریخ نامعتبر نادیده گرفته می‌شود.
  const tourPriceDates = tours
    .map((t) => (t.priceUpdatedAt ? new Date(t.priceUpdatedAt) : null))
    .filter((d): d is Date => d !== null && !Number.isNaN(d.getTime()));
  const guideDates = allGuides.map((g) => guideLastMod(g.updatedFa));
  const newest = (baseline: Date, dates: Date[]) =>
    dates.reduce((m, d) => (d > m ? d : m), baseline);

  // lastmod هر مسیر استاتیک = تازه‌ترین محتوای DBای که همان صفحه نشان می‌دهد.
  const pageLastMod = (path: string): Date => {
    if (path === "/tours") return newest(TOURS_LASTMOD, tourPriceDates);
    if (path === "/guide") return newest(STATIC_LASTMOD, guideDates);
    if (path === "") return newest(STATIC_LASTMOD, [...guideDates, ...tourPriceDates]);
    return STATIC_LASTMOD; // /contact و /about: محتوای ثابت
  };

  // S-107 (۲۱ مهر ۱۴۰۵، اجرای ۰۸): ‎/phuket-october‎ از سایت‌مپ حذف شد؛
  // مسیر ۳۰۸ است (ریدایرکت به راهنمای زنده) و سایت‌مپ فقط URLهای ۲۰۰ و
  // کنونیکال را فهرست می‌کند.
  const pages: MetadataRoute.Sitemap = ["", "/tours", "/guide", "/contact", "/about"].map(
    (path) => ({
      url: `${base}${path}`,
      lastModified: pageLastMod(path),
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1 : 0.8,
    })
  );
  const tourEntries: MetadataRoute.Sitemap = tours.map((t) => ({
    url: `${base}/tours/${t.slug}`,
    lastModified:
      t.priceUpdatedAt && !Number.isNaN(new Date(t.priceUpdatedAt).getTime())
        ? new Date(t.priceUpdatedAt)
        : TOURS_LASTMOD,
    changeFrequency: "weekly" as const,
    priority: 0.9,
  }));
  const guideEntries: MetadataRoute.Sitemap = allGuides.map((g) => ({
    url: `${base}/guide/${g.slug}`,
    lastModified: guideLastMod(g.updatedFa),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));
  // صفحات دسته‌بندی تور (فاز ۱ معماری صفحات، ۲۵ مهر ۱۴۰۵): مسیرهای استاتیک
  // با محتوای DBای؛ lastmod = تازه‌ترین قیمت تورها.
  const categoryEntries: MetadataRoute.Sitemap = CATEGORY_SLUGS.map((slug) => ({
    url: `${base}/tours/${slug}`,
    lastModified: newest(TOURS_LASTMOD, tourPriceDates),
    changeFrequency: "weekly" as const,
    priority: 0.85,
  }));
  return { base, pages, tours: [...tourEntries, ...categoryEntries], guides: guideEntries };
}
