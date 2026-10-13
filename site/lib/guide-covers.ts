/**
 * نگاشت مشترک اسلاگ راهنما ← کاور کتابخانه (مانیفست MANIFEST-guides.md).
 * ماژول واحد برای فهرست راهنماها (app/guide/page.tsx) و قاب قهرمان صفحهٔ
 * جزئیات راهنما (app/guide/[slug]/page.tsx): نگاشت یک‌جا، نه کپی در دو فایل.
 * altها عیناً از مانیفست؛ حکم ۱۱ چشم‌ایرانی (۲۰ مهر ۱۴۰۵): alt راهنمای
 * best-time بدون دنبالهٔ سئویی («در فصل خوب سفر تایلند») است.
 * راهنمای بدون کاور، جای‌نگه‌دار هم‌شکل تایپوگرافیک می‌گیرد (عکس ناجور ممنوع).
 */
export interface GuideCover {
  src: string;
  alt: string;
  w: number;
  h: number;
}

export const GUIDE_COVERS: Record<string, GuideCover> = {
  "best-time-to-visit-thailand": {
    src: "/images/guide-best-time-to-visit-thailand.webp",
    alt: "ساحل آفتابی با نخل و دریای آرام",
    w: 1280,
    h: 854,
  },
  "thailand-visa-guide": {
    src: "/images/guide-thailand-visa-guide.webp",
    alt: "معبد وات آرون بانکوک در غروب طلایی",
    w: 1280,
    h: 946,
  },
  "phuket-vs-samui": {
    src: "/images/guide-phuket-vs-samui.webp",
    alt: "نمای هوایی ساحل استوایی با نخل",
    w: 1280,
    h: 720,
  },
  "compare-thailand-tours": {
    src: "/images/guide-compare-thailand-tours.webp",
    alt: "برنامه‌ریزی سفر روی نقشهٔ جهان با پاسپورت و قطب‌نما",
    w: 1280,
    h: 854,
  },
  "phuket-flight-routes": {
    src: "/images/guide-phuket-flight-routes.webp",
    alt: "بال هواپیما بر فراز ابرها در آسمان آبی",
    w: 1280,
    h: 720,
  },  "lastminute-thailand-guide": {
    src: "/images/generated/guide-lastminute-thailand-guide.webp",
    alt: "کارت راهنمای تور لحظه آخری تایلند",
    w: 1600,
    h: 1000,
  },
  "loy-krathong-2026-chiang-mai": {
    src: "/images/generated/guide-loy-krathong-2026-chiang-mai.webp",
    alt: "کارت راهنمای جشن لوی کراتنگ ۲۰۲۶",
    w: 1600,
    h: 1000,
  },
  "one-bangkok-second-anniversary": {
    src: "/images/generated/guide-one-bangkok-second-anniversary.webp",
    alt: "کارت خبری دومین سالگرد وان بانکوک",
    w: 1600,
    h: 1000,
  },
  "pattaya-fireworks-festival-azar": {
    src: "/images/generated/guide-pattaya-fireworks-festival-azar.webp",
    alt: "کارت راهنمای فستیوال آتش‌بازی پاتایا در آذر",
    w: 1600,
    h: 1000,
  },
  "baht-price-two-month-low": {
    src: "/images/generated/guide-baht-price-two-month-low.webp",
    alt: "کارت راهنمای قیمت بات تایلند در کف دوماهه",
    w: 1600,
    h: 1000,
  },
  "bangkok-world-best-city-2026": {
    src: "/images/generated/guide-bangkok-world-best-city-2026.webp",
    alt: "کارت خبری انتخاب بانکوک به‌عنوان بهترین شهر جهان در ۲۰۲۶",
    w: 1600,
    h: 1000,
  },
  "krabi-vs-phuket": {
    src: "/images/generated/guide-krabi-vs-phuket.webp",
    alt: "کارت مقایسهٔ کرابی و پوکت",
    w: 1600,
    h: 1000,
  },
  "thailand-trip-cost": {
    src: "/images/generated/guide-thailand-trip-cost.webp",
    alt: "کارت راهنمای هزینهٔ سفر به تایلند",
    w: 1600,
    h: 1000,
  },
  "phuket-safety-tips": {
    src: "/images/generated/guide-phuket-safety-tips.webp",
    alt: "کارت راهنمای نکات ایمنی سفر به پوکت",
    w: 1600,
    h: 1000,
  },
  "tehran-bangkok-direct-flight": {
    src: "/images/generated/guide-tehran-bangkok-direct-flight.webp",
    alt: "کارت راهنمای پرواز مستقیم تهران به بانکوک",
    w: 1600,
    h: 1000,
  },
  "flights-from-iran-to-thailand": {
    src: "/images/generated/guide-flights-from-iran-to-thailand.webp",
    alt: "کارت راهنمای مسیرهای پروازی ایران به تایلند",
    w: 1600,
    h: 1000,
  },
  "thailand-high-season-planning": {
    src: "/images/generated/guide-thailand-high-season-planning.webp",
    alt: "کارت راهنمای برنامه‌ریزی سفر در فصل پرگردشگر تایلند",
    w: 1600,
    h: 1000,
  },
  "diamond-resort-phuket-review": {
    src: "/images/generated/guide-diamond-resort-phuket-review.webp",
    alt: "کارت بررسی هتل دایموند ریزورت پوکت",
    w: 1600,
    h: 1000,
  },
};
