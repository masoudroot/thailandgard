/**
 * قانون تک‌قانونی h1 (بریف seo، ۲۱ مهر ۱۴۰۵؛ یافتهٔ seocontent/content):
 * «h1 هیچ صفحه‌ای نباید کپی تایتل منهای پسوند برند باشد.»
 * تایتل برای کلیک در SERP است، h1 برای کلمهٔ کلیدی صفحه.
 *
 * ترتیب حل (resolveH1):
 * ۱. ستون h1 دیتابیس (مالکیت متن: content؛ تازه‌ترین مرجع)؛
 * ۲. نگاشت H1_OVERRIDES همین فایل (متن‌های نهایی تأییدشدهٔ seocontent،
 *    اجرای ۲۱ مهر ۱۴۰۵؛ تا وقتی ستون h1 با مایگریشن نیامده، همین‌ها می‌نشینند)؛
 * ۳. قاعدهٔ مشتق‌سازی از title: حذف عبارت کلیکی انتهایی بعد از «؛»
 *    (مثلاً «تور ترکیبی ... ۸ روزه؛ شهر و جزیره در یک سفر» ← «تور ترکیبی ... ۸ روزه»).
 *
 * وقتی به قاعدهٔ ۳ رسیدیم، در لاگ بیلد هشدار می‌دهیم تا content ستون h1 را پر کند.
 */

/** متن‌های نهایی h1 (seocontent، اجرای ۲۱ مهر ۱۴۰۵؛ راستی‌آزمایی: کلمهٔ عیناً + ≠ تایتل + ≤۶۰ نویسه + فارسی تمیز) */
const H1_OVERRIDES: Record<string, string> = {
  // تورها
  "bangkok-phuket-8-days": "تور ترکیبی بانکوک و پوکت؛ ۸ روز شهر و ساحل",
  // راهنماها
  "baht-price-two-month-low": "قیمت بات تایلند",
  "pattaya-fireworks-festival-azar": "فستیوال آتش‌بازی پاتایا",
  "thailand-visa-guide": "ویزای تایلند برای ایرانیان",
  "thailand-high-season-planning": "سفر به تایلند در پاییز",
  "phuket-flight-routes": "پرواز از ایران به پوکت",
  "one-bangkok-second-anniversary": "دومین سالگرد وان بانکوک؛ جشنوارهٔ خرید پاییزی",
  "tehran-bangkok-direct-flight": "پرواز مستقیم تهران بانکوک؛ تنها مسیر بی‌توقف",
  "flights-from-iran-to-thailand": "مسیرهای پروازی ایران به تایلند؛ راهنمای کامل",
  "lastminute-thailand-guide": "تور لحظه آخری تایلند؛ تله‌های رایج و خرید هوشمند",
  // درفت‌های تازه (h1 از همان ابتدا مستقل از تایتل)
  "suvarnabhumi-baggage-third-handler": "چمدان سووارنابومی؛ اپراتور سوم آمد، مسافر ایرانی چه کار کند",
  "thailand-travel-azar-dey-1405": "تایلند بعد از تعطیلات آسیایی؛ آذر و دی، فصل خلوت سفر ایرانی",
  "eurovision-asia-bangkok-2026": "نخستین یوروویژن آسیا در بانکوک؛ ۲۳ آبان در سالن آیدیا‌لایو",
  // درفت ۴۶ (بریف on-page seocontent، اجرای ۰۷): h1 پیشنهادی ۵۳ کاراکتری؛
  // چون ژنراتور h1 را کپی تایتل می‌کند (کلاس S-012)، تمایز از ابتدا ثبت شد.
  "pattaya-jazz-festival-2026": "فستیوال جاز پاتایا؛ کنسرت رایگان ساحل در آغاز فصل اوج",
  // درفت ۴۷ (بریف on-page seocontent، دور دوم اجرای ۱۲:۰۰): h1 جدا از تایتل،
  // ۳۴ کاراکتری؛ تا آمدن ستون h1 (مایگریشن ۰۰۸) همین می‌نشیند.
  "thailand-winter-2026-new-flight-routes": "پروازهای تازهٔ تایلند؛ زمستان ۲۰۲۶",

  // سئو (اجرای خودکار): h1 مستقل برای اسلاگ‌های تازه
  "samui-7-days": "طرح تور ۷ روزه به جزیره سامویی",

  // سئو (اجرای خودکار): h1 مستقل برای اسلاگ‌های تازه
  "bangkok-travel-guide": "راهنمای سفر به بانکوک: هزینه‌ها، جاهای دیدنی و نکات سفر",

  // سئو (اجرای خودکار): h1 مستقل برای اسلاگ‌های تازه
  "thailand-hotel-booking-guide": "رزرو هتل در تایلند؛ راهنمای گام‌به‌گام انتخاب اقامتگاه",

  // ترمیم خودکار: ورودی‌های گم‌شدهٔ پچ‌های needs_review (مشکل ۲)
  "best-time-to-visit-thailand": "بهترین زمان سفر به تایلند بر اساس آب و هوا و جشنواره‌ها",
  "compare-thailand-tours": "مقایسه تورهای تایلند و راهنمای انتخاب بهترین سفر",
  "phuket-vs-samui": "مقایسه پوکت و سامویی: راهنمای انتخاب مقصد مناسب شما",

  // سئو (اجرای خودکار): h1 مستقل برای اسلاگ‌های تازه
  "iran-to-thailand-guide": "راهنمای سفر به تایلند؛ هزینه‌ها و نکات ضروری",
};

/** قاعدهٔ مشتق‌سازی: h1 هرگز دقیقاً برابر title منهای پسوند برند نیست. */
function deriveH1(title: string): string {
  const t = title.trim();
  const cut = t.indexOf("؛");
  const base = (cut > 0 ? t.slice(0, cut) : t).trim();
  return base || t;
}

export function resolveH1(slug: string, title: string, dbH1?: string | null): string {
  const fromDb = dbH1?.trim();
  if (fromDb) return fromDb;
  const curated = H1_OVERRIDES[slug];
  if (curated) return curated;
  // قانون بریف: خالی بودن headline در لاگ بیلد گزارش می‌شود تا content پرش کند.
  if (typeof process !== "undefined" && process.env) {
    console.warn(`[h1] ستون h1 خالی و نگاشت ندارد (slug=${slug})؛ از قاعدهٔ مشتق‌سازی استفاده شد.`);
  }
  return deriveH1(title);
}
