/**
 * نگاشت مشترک اسلاگ تور ← کاور کتابخانه (اسپک زبان عکس §۵؛ ابعاد از PHOTO-LIBRARY.md).
 * ماژول واحد برای TourCard و قاب قهرمان صفحهٔ جزئیات تور (پیشنهاد F-B6 ممیزی
 * وایب‌فارسی، ۲۰ مهر ۱۴۰۵): نگاشت یک‌جا نگه‌داری می‌شود، نه کپی در دو فایل.
 * کاور تور ترکیبی (اسپک mount کلاژ ۱۶:۱۰، ۲۱ مهر ۱۴۰۵، چرخهٔ ۱۰): کلاژ ۵۰/۵۰
 * اختصاصی (راست: معبد وات‌آرون بانکوک، چپ: ساحل پوکت؛ ۱۲۰۰×۷۵۰) جایگزین
 * hero-phuket-sunset.webp موقت شد؛ مانیفست در
 * agents/design/ASSETS/tour-bangkok-phuket-8-days-SOURCES.md.
 */
export interface TourCover {
  src: string;
  alt: string;
  w: number;
  h: number;
}

export const TOUR_COVERS: Record<string, TourCover> = {
  "phuket-7-days": {
    src: "/images/tour-phuket-7-days.webp",
    alt: "قایق دم‌بلند روی آب فیروزه‌ای پوکت در برابر صخره‌های ساحلی",
    w: 1280,
    h: 853,
  },
  "bangkok-pattaya-8-days": {
    src: "/images/tour-bangkok-pattaya-8-days.webp",
    alt: "سیلوئت معبد وات‌آرون هنگام غروب بر کرانهٔ رود چائوپرایا",
    w: 1600,
    h: 1067,
  },
  "samui-7-days": {
    src: "/images/tour-samui-7-days.webp",
    alt: "خلیج آرام سامویی با نخل و تپه‌های سبز",
    w: 1280,
    h: 853,
  },
  "krabi-6-days": {
    src: "/images/tour-krabi-6-days.webp",
    alt: "ساحل آرام کرابی با جزیرهٔ صخره‌ای آهکی",
    w: 1280,
    h: 853,
  },
  "bangkok-phuket-8-days": {
    src: "/images/tour-bangkok-phuket-8-days-cover.webp",
    alt: "تور ترکیبی بانکوک و پوکت؛ معبد وات‌آرون بانکوک و ساحل پوکت",
    w: 1200,
    h: 750,
  },
};

/**
 * اسلات تصویری بدنهٔ صفحهٔ تور (MOB-S2، اسپک موبایل ۲۱ مهر ۱۴۰۵؛ تکمیل
 * اجرای ۲۱ مهر ساعت ۰۴): بین «دربارهٔ تور» و «برنامهٔ روزبه‌روز» می‌نشیند و
 * فقط با عکس واقعی رندر می‌شود؛ فعلاً برای هیچ توری عکسی نیست (S-002 باز).
 */
export const TOUR_BODY_IMAGES: Record<string, TourCover> = {};
