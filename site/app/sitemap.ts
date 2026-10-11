import type { MetadataRoute } from "next";
import { getSiteSettings, getTours, getGuides } from "@/lib/db-content";

/**
 * یافتهٔ S1 تیم سئو (۱۹ مهر ۱۴۰۵): قبلاً همهٔ مسیرها lastModified: new Date()
 * می‌گرفتند؛ یعنی در هر بیلد همهٔ lastmodها «همین حالا» می‌شد و گوگل دیگر
 * نمی‌فهمید چه چیزی واقعاً تغییر کرده. از این به بعد lastmod هر مسیر پایدار
 * و معنادار است:
 * - راهنماها: از فیلد updated_fa رکورد («۱۹ مهر ۱۴۰۵») به میلادی برمی‌گردد.
 * - تورها و مسیرهای استاتیک: تاریخ ثابتِ مستند (رکوردهای tours در دیتابیس
 *   ستون updated_at ندارند؛ با اضافه شدنش، این ثابت‌ها با تاریخ واقعی رکورد
 *   جایگزین می‌شوند).
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
  const monthLen = [0, 31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const s = await getSiteSettings();
  const tours = await getTours();
  const guides = await getGuides();
  const base = s.SITE_URL;
  const staticRoutes = ["", "/tours", "/guide", "/contact"].map((path) => ({
    url: `${base}${path}`,
    lastModified: STATIC_LASTMOD,
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.8,
  }));
  const tourRoutes = tours.map((t) => ({
    url: `${base}/tours/${t.slug}`,
    lastModified: TOURS_LASTMOD,
    changeFrequency: "weekly" as const,
    priority: 0.9,
  }));
  const guideRoutes = guides.map((g) => ({
    url: `${base}/guide/${g.slug}`,
    lastModified: guideLastMod(g.updatedFa),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));
  return [...staticRoutes, ...tourRoutes, ...guideRoutes];
}
