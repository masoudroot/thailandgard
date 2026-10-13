import { existsSync } from "node:fs";
import { join } from "node:path";

/**
 * نقشهٔ سراسری slug ← {file, alt} برای og:image (S-003؛ اسپک og-per-slug-exec).
 *
 * قاعده: هر صفحه که فایل اختصاصی ندارد، همان پیش‌فرض سراسری og.ts می‌ماند؛
 * با نشستن فایل در مسیر جدول، همان صفحه خودکار تصویر مرتبط می‌گیرد و کد
 * دست نمی‌خورد. بررسی وجود فایل در زمان بیلد (generateMetadata) انجام می‌شود.
 * ابعاد پیش‌فرض ۱۲۰۰×۶۳۰ است؛ ورودی‌هایی که کارت/کاورشان ابعاد دیگری دارد
 * w و h خودشان را می‌آورند.
 */
const OG_SLUG_MAP: Record<string, { file: string; alt: string; w?: number; h?: number }> = {
  "phuket-7-days": {
    file: "images/og-phuket-7-days.webp",
    alt: "ساحل پاتونگ پوکت در غروب؛ تور پوکت تایلندگرد",
  },
  "samui-7-days": {
    // S-003 (۲۰ مهر ۱۴۰۵): کاور رسمی تور سامویی از کتابخانه (Pexels، مجوز تجاری)
    file: "images/tour-samui-7-days.webp",
    alt: "تور سامویی؛ خلیج آرام با نخل‌های ساحلی",
  },
  "bangkok-pattaya-8-days": {
    file: "images/og-bangkok-pattaya-8-days.webp",
    alt: "خط افق بانکوک در شب؛ تور بانکوک و پاتایا تایلندگرد",
  },
  "krabi-6-days": {
    file: "images/og-krabi-6-days.webp",
    alt: "قایق دم‌بلند در دریای آندامان کرابی؛ تور کرابی تایلندگرد",
  },
  // بستهٔ ۲ هندآف ۰۳:۳۵ (۲۱ مهر ۱۴۰۵): کارت اختصاصی generated/ نشست؛
  // جایگزین تصویر موقت کتابخانه شد.
  "krabi-vs-phuket": {
    file: "images/generated/guide-krabi-vs-phuket.webp",
    alt: "کارت مقایسهٔ کرابی و پوکت",
    w: 1600,
    h: 1000,
  },
  // بستهٔ ۲ هندآف ۰۳:۳۵ (۲۱ مهر ۱۴۰۵): کارت اختصاصی generated/ نشست.
  "bangkok-world-best-city-2026": {
    file: "images/generated/guide-bangkok-world-best-city-2026.webp",
    alt: "کارت خبری انتخاب بانکوک به‌عنوان بهترین شهر جهان در ۲۰۲۶",
    w: 1600,
    h: 1000,
  },
  // S-048 (۲۱ مهر ۱۴۰۵): تصویر اختصاصی تور ترکیبی رسید
  // (منشأ: Pexels، مانیفست agents/design/ASSETS/tour-bangkok-phuket-8-days-SOURCES.md)؛
  // جایگزین موقت tour-bangkok-pattaya-8-days.webp شد.
  "bangkok-phuket-8-days": {
    file: "images/tour-bangkok-phuket-8-days.webp",
    alt: "تور ترکیبی بانکوک و پوکت؛ معبد وات‌آرون بانکوک و ساحل پوکت",
  },
  // --- کارت‌های اختصاصی راهنماها (بستهٔ ۲ هندآف ۰۳:۳۵، ۲۱ مهر ۱۴۰۵؛
  // همه ۱۶۰۰×۱۰۰۰، بازبینی بصری نمونه انجام شده) ---
  "baht-price-two-month-low": {
    file: "images/generated/guide-baht-price-two-month-low.webp",
    alt: "کارت راهنمای قیمت بات تایلند در کف دوماهه",
    w: 1600,
    h: 1000,
  },
  "diamond-resort-phuket-review": {
    file: "images/generated/guide-diamond-resort-phuket-review.webp",
    alt: "کارت بررسی هتل دایموند ریزورت پوکت",
    w: 1600,
    h: 1000,
  },
  "flights-from-iran-to-thailand": {
    file: "images/generated/guide-flights-from-iran-to-thailand.webp",
    alt: "کارت راهنمای مسیرهای پروازی ایران به تایلند",
    w: 1600,
    h: 1000,
  },
  "lastminute-thailand-guide": {
    file: "images/generated/guide-lastminute-thailand-guide.webp",
    alt: "کارت راهنمای تور لحظه آخری تایلند",
    w: 1600,
    h: 1000,
  },
  "loy-krathong-2026-chiang-mai": {
    file: "images/generated/guide-loy-krathong-2026-chiang-mai.webp",
    alt: "کارت راهنمای جشن لوی کراتنگ ۲۰۲۶",
    w: 1600,
    h: 1000,
  },
  "one-bangkok-second-anniversary": {
    file: "images/generated/guide-one-bangkok-second-anniversary.webp",
    alt: "کارت خبری دومین سالگرد وان بانکوک",
    w: 1600,
    h: 1000,
  },
  "pattaya-fireworks-festival-azar": {
    file: "images/generated/guide-pattaya-fireworks-festival-azar.webp",
    alt: "کارت راهنمای فستیوال آتش‌بازی پاتایا در آذر",
    w: 1600,
    h: 1000,
  },
  "phuket-safety-tips": {
    file: "images/generated/guide-phuket-safety-tips.webp",
    alt: "کارت راهنمای نکات ایمنی سفر به پوکت",
    w: 1600,
    h: 1000,
  },
  "tehran-bangkok-direct-flight": {
    file: "images/generated/guide-tehran-bangkok-direct-flight.webp",
    alt: "کارت راهنمای پرواز مستقیم تهران به بانکوک",
    w: 1600,
    h: 1000,
  },
  "thailand-high-season-planning": {
    file: "images/generated/guide-thailand-high-season-planning.webp",
    alt: "کارت راهنمای برنامه‌ریزی سفر پاییزی به تایلند",
    w: 1600,
    h: 1000,
  },
  "thailand-trip-cost": {
    file: "images/generated/guide-thailand-trip-cost.webp",
    alt: "کارت راهنمای هزینهٔ سفر به تایلند",
    w: 1600,
    h: 1000,
  },
  // --- کاورهای عکسی راهنماها (ریشهٔ images/؛ همان نگاشت guide-covers.ts؛
  // altها عین مانیفست، بدون دم سئویی) ---
  "best-time-to-visit-thailand": {
    file: "images/guide-best-time-to-visit-thailand.webp",
    alt: "ساحل آفتابی با نخل و دریای آرام",
    w: 1280,
    h: 854,
  },
  "thailand-visa-guide": {
    file: "images/guide-thailand-visa-guide.webp",
    alt: "معبد وات آرون بانکوک در غروب طلایی",
    w: 1280,
    h: 946,
  },
  "phuket-vs-samui": {
    file: "images/guide-phuket-vs-samui.webp",
    alt: "نمای هوایی ساحل استوایی با نخل",
    w: 1280,
    h: 720,
  },
  "compare-thailand-tours": {
    file: "images/guide-compare-thailand-tours.webp",
    alt: "برنامه‌ریزی سفر روی نقشهٔ جهان با پاسپورت و قطب‌نما",
    w: 1280,
    h: 854,
  },
  "phuket-flight-routes": {
    file: "images/guide-phuket-flight-routes.webp",
    alt: "بال هواپیما بر فراز ابرها در آسمان آبی",
    w: 1280,
    h: 720,
  },
};

export interface SlugOgImage {
  url: string;
  width: number;
  height: number;
  alt: string;
}

/**
 * اگر برای این اسلاگ فایل og اختصاصی در public/images هست، آبجکت تصویر
 * را برمی‌گرداند؛ وگرنه null (یعنی پیش‌فرض سراسری بماند). فقط در
 * generateMetadata (زمان بیلد/رندر سرور) صدا بزن.
 */
export function ogImageForSlug(siteUrl: string, slug: string): SlugOgImage | null {
  const entry = OG_SLUG_MAP[slug];
  if (!entry) return null;
  if (!existsSync(join(process.cwd(), "public", entry.file))) return null;
  return {
    url: `${siteUrl}/${entry.file}`,
    width: entry.w ?? 1200,
    height: entry.h ?? 630,
    alt: entry.alt,
  };
}
