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
  "bangkok-pattaya-8-days": {
    title: "تور بانکوک و پاتایا ۸ روزه؛ برنامه سفر و اطلاعات کامل",
    description: "تور بانکوک و پاتایا ۸ روزه با لیدر فارسی. شامل برنامه روزانه، جاذبه‌های اصلی، هزینه‌های تقریبی و نکات سفر. برای تورهای گروهی و خصوصی.",
  },

  "best-time-to-visit-thailand": {
    title: "بهترین زمان سفر به تایلند؛ راهنمای کامل فصل‌ها و شرایط",
    description: "در این راهنمای کامل بهترین زمان سفر به تایلند، شرایط هر فصل، توصیه‌های مرتبط و نکات کاربردی را بررسی می‌کنیم تا سفرتان به این کشور را بدون مشکل برنامه‌ریزی کنید.",
  },
};

/** متای نهایی یک اسلاگ: ورودی اختصاصی، وگرنه همان مقادیر پیش‌فرض. */
export function resolveMeta(
  slug: string,
  fallback: MetaOverride,
): MetaOverride {
  return META_OVERRIDES[slug] ?? fallback;
}
