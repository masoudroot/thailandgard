/**
 * نگاشت سراسری slug ← متا تایتل/دیسکریپشن بهینه (تولید تیم seo).
 *
 * قاعده: هر صفحه که ورودی اختصاصی ندارد، همان تایتل/دیسکریپشن مشتق از
 * محتوای دیتابیس می‌ماند؛ با نشستن ورودی در این جدول، همان صفحه خودکار
 * متای بهینه می‌گیرد و کد دست نمی‌خورد.
 *
 * اتصال (یک خط در generateMetadata هر صفحه):
 *   import { resolveMeta } from "@/lib/seo-meta";
 *   const meta = resolveMeta(slug, { title: fallbackTitle, description: fallbackDescription });
 *
 * قراردادها (داوری خودکار تیم seo):
 * - تایتل ۵۰ تا ۶۰ نویسه، با کلمهٔ کلیدی در ابتدا؛ پسوند برند «| تایلندگرد» جدا می‌نشیند
 * - دیسکریپشن ۱۲۰ تا ۱۶۰ نویسه، فارسی طبیعی، با فراخوان عمل ملایم
 * - خط تیرهٔ بلند (U+2014) مطلقاً ممنوع
 */

export interface MetaOverride {
  title: string;
  description: string;
}

const META_OVERRIDES: Record<string, MetaOverride> = {
  "thailand-visa-guide": {
    title: "ویزای تایلند برای ایرانیان؛ مدارک، هزینه و زمان صدور",
    description: "راهنمای کامل ویزای تایلند برای ایرانیان: مدارک مورد نیاز، هزینه‌ها و زمان صدور ویزا. اطلاعات دقیق و به‌روز برای سفر به تایلند، بدون تأخیر یا اشتباه.",
  },
  "thailand-hotel-booking-guide": {
    title: "راهنمای رزرو هتل در تایلند: هاستل اقتصادی تا لوکس",
    description: "راهنمای کامل برای رزرو هتل در تایلند، شامل انتخاب انواع هاستل‌های اقتصادی، هتل‌های استاندارد و اقامتگاه‌های لوکس با توجه به موقعیت، بودجه و نیازهای خاص مسافران.",
  },
};

/** متای نهایی یک اسلاگ: ورودی اختصاصی، وگرنه همان مقادیر پیش‌فرض. */
export function resolveMeta(
  slug: string,
  fallback: MetaOverride,
): MetaOverride {
  return META_OVERRIDES[slug] ?? fallback;
}
