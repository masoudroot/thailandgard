import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { getSitemapRows } from "@/lib/db-content";

/**
 * نقشهٔ سایت حرفه‌ای: ایندکس + ۳ بخش (دستور مسعود، ۲۰ مهر ۱۴۰۵).
 *
 * - ‎/sitemap.xml‎ ایندکس است و به ۳ بخش اشاره می‌کند:
 *   ‎/sitemap/pages.xml‎ (مسیرهای ثابت) + ‎/sitemap/tours.xml‎ + ‎/sitemap/guides.xml‎
 * - هر ۳ بخش داینامیک‌اند: هر درخواست ربات ردیف‌ها را از دیتابیس زنده
 *   می‌خواند تا تور/راهنمای تازه بی‌درنگ در نقشه باشد (خودبه‌روزشونده؛
 *   وابسته به دپلوی نیست).
 *
 * نکتهٔ فنی (Next 16 با cacheComponents): پیکربندی‌های `dynamic`/`revalidate`
 * از قطعه خطای کامپایل می‌دهند؛ معادل سالم `connection()` (خروج از پیش‌رندر)
 * + خوانش DB بدون `'use cache'` است. ترافیک نقشهٔ سایت ناچیز است.
 */

/**
 * یافتهٔ S1 تیم سئو (۱۹ مهر ۱۴۰۵): lastmod هر مسیر پایدار و معنادار است،
 * نه «همین حالا»:
 * - راهنماها: از فیلد updated_fa رکورد («۱۹ مهر ۱۴۰۵») به میلادی برمی‌گردد.
 * - تورها و مسیرهای استاتیک: تاریخ ثابتِ مستند (رکوردهای tours در دیتابیس
 *   ستون updated_at ندارند؛ با اضافه شدنش، این ثابت‌ها با تاریخ واقعی رکورد
 *   جایگزین می‌شوند).
 *   استثنا: /phuket-october با lastmod واقعی انتشار خودش (۱۹ مهر ۱۴۰۵).
 */
const TOURS_LASTMOD = new Date("2026-10-10T00:00:00+03:30"); // زنده‌شدن سایت (۱۸ مهر ۱۴۰۵)
const STATIC_LASTMOD = new Date("2026-10-10T00:00:00+03:30"); // زنده‌شدن سایت (۱۸ مهر ۱۴۰۵)
const PHUKET_OCTOBER_LASTMOD = new Date("2026-10-11T00:00:00+03:30"); // انتشار لندینگ اکتبر (۱۹ مهر ۱۴۰۵)

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
    -355668 + 365 * jy + Math.floor(jy / 33) * 8 + Math.floor(((jy % 33) + 3) / 4 + jd +
    (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186));
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

export async function generateSitemaps() {
  return [{ id: "pages" }, { id: "tours" }, { id: "guides" }];
}

export default async function sitemap({
  id,
}: {
  id: string;
}): Promise<MetadataRoute.Sitemap> {
  await connection(); // پیش‌رندر همین‌جا متوقف می‌شود؛ خوانش زیر فقط در زمان درخواست
  const { base, guides, tours } = await getSitemapRows();

  if (id === "tours") {
    return tours.map((slug) => ({
      url: `${base}/tours/${slug}`,
      lastModified: TOURS_LASTMOD,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    }));
  }

  if (id === "guides") {
    return guides.map((g) => ({
      url: `${base}/guide/${g.slug}`,
      lastModified: guideLastMod(g.updatedFa),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));
  }

  // pages: مسیرهای ثابت
  return ["", "/tours", "/guide", "/contact", "/phuket-october"].map((path) => ({
    url: `${base}${path}`,
    lastModified: path === "/phuket-october" ? PHUKET_OCTOBER_LASTMOD : STATIC_LASTMOD,
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.8,
  }));
}
