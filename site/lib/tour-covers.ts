/**
 * نگاشت مشترک اسلاگ تور ← کاور کتابخانه (اسپک زبان عکس §۵؛ ابعاد از PHOTO-LIBRARY.md).
 * ماژول واحد برای TourCard و قاب قهرمان صفحهٔ جزئیات تور (پیشنهاد F-B6 ممیزی
 * وایب‌فارسی، ۲۰ مهر ۱۴۰۵): نگاشت یک‌جا نگه‌داری می‌شود، نه کپی در دو فایل.
 * کاور تور ترکیبی (bangkok-phuket-8-days) هنوز تأمین نشده؛ کاور
 * tour-bangkok-pattaya-8-days مال تور دیگری است و این‌جا نمی‌آید.
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
};
