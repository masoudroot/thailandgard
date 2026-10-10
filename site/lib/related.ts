/**
 * لینک‌های داخلی پیشنهادی تیم سئومحتوا (نگاشت ۱۹ مهر ۱۴۰۵).
 * جمله‌ها با انکر فارسی طبیعی نوشته شده‌اند؛ خودِ متن لینک، عنوان واقعی صفحهٔ مقصد است.
 */
export interface InlineLinkBlock {
  /** شروع جمله، پیش از لینک‌ها */
  lead: string;
  /** اسلاگ‌های صفحه‌های مقصد */
  slugs: string[];
  /** پایان جمله، پس از لینک‌ها */
  trail: string;
}

/** هر راهنما -> تورهای مرتبط */
export const GUIDE_TO_TOURS: Record<string, InlineLinkBlock> = {
  "thailand-visa-guide": {
    lead: "اگر مدارک را آماده کردید،",
    slugs: ["phuket-7-days", "bangkok-pattaya-8-days"],
    trail: "را ببینید.",
  },
  "phuket-vs-samui": {
    lead: "مقایسه را که خواندید، جزئیات",
    slugs: ["phuket-7-days", "samui-7-days"],
    trail: "این‌جاست.",
  },
  "best-time-to-visit-thailand": {
    lead: "در همین فصل،",
    slugs: ["phuket-7-days", "bangkok-pattaya-8-days", "samui-7-days", "krabi-6-days"],
    trail: "را داریم.",
  },
};

/** هر تور -> راهنماهای مرتبط (برای هر ۴ تور، راهنمای ویزا) */
export const TOUR_TO_GUIDES: Record<string, InlineLinkBlock> = {
  "phuket-7-days": {
    lead: "پیش از رزرو،",
    slugs: ["thailand-visa-guide"],
    trail: "را بخوانید.",
  },
  "bangkok-pattaya-8-days": {
    lead: "پیش از رزرو،",
    slugs: ["thailand-visa-guide"],
    trail: "را بخوانید.",
  },
  "samui-7-days": {
    lead: "پیش از رزرو،",
    slugs: ["thailand-visa-guide"],
    trail: "را بخوانید.",
  },
  "krabi-6-days": {
    lead: "پیش از رزرو،",
    slugs: ["thailand-visa-guide"],
    trail: "را بخوانید.",
  },
};
