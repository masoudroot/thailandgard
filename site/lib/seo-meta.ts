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
    title: "ویزای تایلند؛ شرایط دریافت، مدارک و هزینه‌های صدور",
    description: "آشنایی با مراحل دریافت ویزای تایلند برای ایرانیان، مدارک مورد نیاز، هزینه‌های جاری و مدت زمان لازم برای بررسی و صدور روادید در سال جدید.",
  },
  "best-time-to-visit-thailand": {
    title: "بهترین زمان سفر به تایلند و بررسی آب‌وهوا",
    description: "بررسی شرایط اقلیمی و ماه‌های مختلف سال برای برنامه‌ریزی سفر به تایلند بر اساس وضعیت بارش و دمای هوا.",
  },
  "phuket-vs-samui": {
    title: "پوکت یا سامویی؛ مقایسه کامل جزایر تایلند برای سفر",
    description: "بررسی تفاوت‌های پوکت و سامویی در امکانات، سواحل و هزینه‌ها به شما کمک می‌کند تا مناسب‌ترین جزیره تایلند را برای تعطیلات خود انتخاب کنید.",
  },
};

/** متای نهایی یک اسلاگ: ورودی اختصاصی، وگرنه همان مقادیر پیش‌فرض. */
export function resolveMeta(
  slug: string,
  fallback: MetaOverride,
): MetaOverride {
  return META_OVERRIDES[slug] ?? fallback;
}
