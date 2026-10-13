import type { MetadataRoute } from "next";
import { getSitemapRows } from "@/lib/db-content";

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
 * - مسیرهای استاتیک: سقف تازگیِ محتوای DBای که همان صفحه نشان می‌دهد —
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

export async function getSitemapSections(): Promise<SitemapSections> {
  const { base, guides, tours } = await getSitemapRows();

  // سیگنال‌های واقعی تازگی (S-104/S-112): تاریخ نامعتبر نادیده گرفته می‌شود.
  const tourPriceDates = tours
    .map((t) => (t.priceUpdatedAt ? new Date(t.priceUpdatedAt) : null))
    .filter((d): d is Date => d !== null && !Number.isNaN(d.getTime()));
  const guideDates = guides.map((g) => guideLastMod(g.updatedFa));
  const newest = (baseline: Date, dates: Date[]) =>
    dates.reduce((m, d) => (d > m ? d : m), baseline);

  // lastmod هر مسیر استاتیک = تازه‌ترین محتوای DBای که همان صفحه نشان می‌دهد.
  const pageLastMod = (path: string): Date => {
    if (path === "/tours") return newest(TOURS_LASTMOD, tourPriceDates);
    if (path === "/guide") return newest(STATIC_LASTMOD, guideDates);
    if (path === "") return newest(STATIC_LASTMOD, [...guideDates, ...tourPriceDates]);
    return STATIC_LASTMOD; // /contact: محتوای ثابت
  };

  // S-107 (۲۱ مهر ۱۴۰۵، اجرای ۰۸): ‎/phuket-october‎ از سایت‌مپ حذف شد؛
  // مسیر ۳۰۸ است (ریدایرکت به راهنمای زنده) و سایت‌مپ فقط URLهای ۲۰۰ و
  // کنونیکال را فهرست می‌کند.
  const pages: MetadataRoute.Sitemap = ["", "/tours", "/guide", "/contact"].map(
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
  const guideEntries: MetadataRoute.Sitemap = guides.map((g) => ({
    url: `${base}/guide/${g.slug}`,
    lastModified: guideLastMod(g.updatedFa),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));
  return { base, pages, tours: tourEntries, guides: guideEntries };
}
