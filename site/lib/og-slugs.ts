import { existsSync } from "node:fs";
import { join } from "node:path";

/**
 * نقشهٔ سراسری slug ← {file, alt} برای og:image (S-003؛ اسپک og-per-slug-exec).
 *
 * قاعده: هر صفحه که فایل اختصاصی ندارد، همان پیش‌فرض سراسری og.ts می‌ماند؛
 * با نشستن فایل در مسیر جدول، همان صفحه خودکار تصویر مرتبط می‌گیرد و کد
 * دست نمی‌خورد. بررسی وجود فایل در زمان بیلد (generateMetadata) انجام می‌شود.
 * ابعاد همهٔ کارت‌ها: ۱۲۰۰×۶۳۰.
 */
const OG_SLUG_MAP: Record<string, { file: string; alt: string }> = {
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
  "krabi-vs-phuket": {
    // S-003 (۲۰ مهر ۱۴۰۵): تصویر کرابی موجود از کتابخانه؛
    // فایل og-krabi-vs-phuket.webp وجود نداشت و به پیش‌فرض خانه می‌افتاد.
    file: "images/og-krabi-6-days.webp",
    alt: "مقایسهٔ کرابی و پوکت؛ ساحل صخره‌ای آهکی کرابی",
  },
  "bangkok-world-best-city-2026": {
    file: "images/og-bangkok-world-best-city-2026.webp",
    alt: "چراغ‌های شبانهٔ بانکوک؛ بانکوک بهترین شهر جهان ۲۰۲۶",
  },
  // S-048 (۲۰ مهر ۱۴۰۵): گزینهٔ موقت تا ساخت تصویر اختصاصی تور ترکیبی
  // (سیلوئت وات‌آرون بانکوک؛ دست‌کم چهرهٔ بانکوک را دارد).
  "bangkok-phuket-8-days": {
    file: "images/tour-bangkok-pattaya-8-days.webp",
    alt: "تور ترکیبی بانکوک و پوکت؛ معبد وات‌آرون بانکوک و ساحل پوکت",
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
  return { url: `${siteUrl}/${entry.file}`, width: 1200, height: 630, alt: entry.alt };
}
