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
    title: "ویزای تایلند | راهنمای کامل مدارک، هزینه و زمان صدور",
    description: "برای سفر به تایلند نیاز به ویزا دارید؟ مدارک لازم، هزینه و زمان صدور ویزای تایلند را اینجا بخوانید. راهنمای گام‌به‌گام برای درخواست موفق.",
  },
  "best-time-to-visit-thailand": {
    title: "بهترین زمان سفر به تایلند | راهنمای کامل فصل‌ها",
    description: "با راهنمای جامع ما بهترین زمان سفر به تایلند را بشناسید. آب و هوای هر فصل، جشنواره‌ها و نکات کاربردی برای سفری بی‌نقص را کشف کنید.",
  },
  "thailand-hotel-booking-guide": {
    title: "رزرو هتل در تایلند | راهنمای انتخاب اقامتگاه مناسب",
    description: "با راهنمای رزرو هتل در تایلند، از هاستل اقتصادی تا ویلای لوکس را بشناسید. مقایسه قیمت، نکات مهم و بهترین مناطق را اینجا بخوانید.",
  },
};

/** متای نهایی یک اسلاگ: ورودی اختصاصی، وگرنه همان مقادیر پیش‌فرض. */
export function resolveMeta(
  slug: string,
  fallback: MetaOverride,
): MetaOverride {
  return META_OVERRIDES[slug] ?? fallback;
}
