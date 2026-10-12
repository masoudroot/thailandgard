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
  },
};
