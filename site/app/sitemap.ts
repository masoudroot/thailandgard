import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { getSitemapSections } from "@/lib/sitemap-sections";

/**
 * نقشهٔ سایت کامل تک‌فایل در ‎/sitemap.xml‎ (دستور مسعود، ۲۰ مهر ۱۴۰۵).
 *
 * داینامیک: هر درخواست ربات ردیف‌ها را از دیتابیس زنده می‌خواند تا تور یا
 * راهنمای تازه بی‌درنگ در نقشه باشد (خودبه‌روزشونده؛ وابسته به دپلوی نیست).
 * بخش‌های جدا برای آمار تفکیکی سرچ کنسول: ‎/sitemap/pages.xml‎،
 * ‎/sitemap/tours.xml‎، ‎/sitemap/guides.xml‎.
 *
 * نکتهٔ فنی (Next 16 با cacheComponents): پیکربندی‌های `dynamic`/`revalidate`
 * از قطعه خطای کامپایل می‌دهند؛ معادل سالم `connection()` (خروج از پیش‌رندر)
 * + خوانش DB بدون `'use cache'` است. ترافیک نقشهٔ سایت ناچیز است.
 *
 * درس ۲۰ مهر ۱۴۰۵: generateSitemaps در نکست ۱۶.۴ قابل‌اعتماد نیست —
 * لودر داخلی id را به‌صورت Promise می‌دهد و ایندکس ‎/sitemap.xml‎ اصلاً تولید
 * نمی‌شود (۴۰۴). پس بخش‌ها route دستی‌اند و ایندکسی در کار نیست.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection(); // پیش‌رندر همین‌جا متوقف می‌شود؛ خوانش زیر فقط در زمان درخواست
  const { pages, tours, guides } = await getSitemapSections();
  return [...pages, ...tours, ...guides];
}
