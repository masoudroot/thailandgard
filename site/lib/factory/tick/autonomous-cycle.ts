/**
 * انتخاب‌های خالص چرخهٔ خودمختار روزانه (THG-AUTO-01).
 *
 * این فایل هیچ دسترسی دیتابیسی ندارد؛ مسیر
 * /api/internal/autonomous-cycle، فهرست‌های خام را می‌خواند و
 * همین توابع، تصمیم می‌گیرند:
 * - موضوع تازه: نخستین موضوع فهرست CONTENT که slug آن در
 *   content_documents نیست (وضعیت، مهم نیست)؛
 * - بازنویسی: کهنه‌ترین راهنمای منتشرشدهٔ واجد شرایط؛ واجد
 *   شرایط یعنی faqs صفر (پرسش ندارد) یا sections زیر ۲ (تک‌بخش).
 *   کهنگی از updated_fa (رشتهٔ «روز ماه سال» شمسی با ارقام
 *   فارسی) خوانده می‌شود؛ رشتهٔ ناواضح، آخر صف می‌ایستد، نه این‌که
 *   حدس زده شود. تساوی، با slug حل می‌شود تا انتخاب، قطعی باشد.
 */

/** فهرست موضوع‌های پیشنهادی تیم CONTENT (فعلاً همین فهرست است؛ وقتی PRODUCT-LEADER آمد، اولویت‌بندی را او می‌دهد). */
export interface SeedTopic {
  slug: string;
  title: string;
}

export const AUTO_SEED_TOPICS: SeedTopic[] = [
  { slug: "thailand-food-guide", title: "غذاهای تایلند؛ راهنمای کامل برای مسافر ایرانی" },
  { slug: "thailand-shopping-guide", title: "خرید در تایلند؛ راهنمای کامل برای مسافر ایرانی" },
  { slug: "thailand-sim-internet-guide", title: "سیم‌کارت و اینترنت در تایلند؛ راهنمای کامل برای مسافر ایرانی" },
  { slug: "thailand-currency-exchange-guide", title: "تبدیل ارز و پرداخت در تایلند؛ راهنمای کامل برای مسافر ایرانی" },
  { slug: "thailand-children-travel-guide", title: "سفر به تایلند با کودک؛ راهنمای کامل برای خانوادهٔ ایرانی" },
  { slug: "chiang-mai-guide", title: "چیانگ‌مای؛ راهنمای کامل برای مسافر ایرانی" },
  { slug: "thailand-travel-checklist", title: "چک‌لیست سفر به تایلند؛ راهنمای کامل برای مسافر ایرانی" },
  { slug: "thailand-accommodation-guide", title: "اقامت در تایلند؛ راهنمای کامل برای مسافر ایرانی" },
  { slug: "thailand-festivals-guide", title: "جشنواره‌های تایلند؛ راهنمای کامل برای مسافر ایرانی" },
  { slug: "bangkok-guide", title: "بانکوک؛ راهنمای کامل برای مسافر ایرانی" },
];

export function pickFreshTopic(
  seedTopics: readonly SeedTopic[],
  existingSlugs: ReadonlySet<string>,
): SeedTopic | null {
  return seedTopics.find((topic) => !existingSlugs.has(topic.slug)) ?? null;
}

const PERSIAN_DIGITS: Record<string, string> = {
  "۰": "0",
  "۱": "1",
  "۲": "2",
  "۳": "3",
  "۴": "4",
  "۵": "5",
  "۶": "6",
  "۷": "7",
  "۸": "8",
  "۹": "9",
  "٠": "0",
  "١": "1",
  "٢": "2",
  "٣": "3",
  "٤": "4",
  "٥": "5",
  "٦": "6",
  "٧": "7",
  "٨": "8",
  "٩": "9",
};

const JALALI_MONTHS: Record<string, number> = {
  "فروردین": 1,
  "اردیبهشت": 2,
  "خرداد": 3,
  "تیر": 4,
  "مرداد": 5,
  "شهریور": 6,
  "مهر": 7,
  "آبان": 8,
  "آذر": 9,
  "دی": 10,
  "بهمن": 11,
  "اسفند": 12,
};

function latinDigits(value: string): string {
  return value.replace(/[۰-۹٠-٩]/g, (digit) => PERSIAN_DIGITS[digit] ?? digit);
}

/** «روز ماه سال» شمسی را به عدد قابل‌مقایسه تبدیل می‌کند؛ ناواضح یعنی null. */
export function parseUpdatedFa(value: string | null | undefined): number | null {
  if (!value) return null;
  const parts = latinDigits(value.trim()).split(/\s+/);
  if (parts.length !== 3) return null;
  const day = Number(parts[0]);
  const month = JALALI_MONTHS[parts[1]];
  const year = Number(parts[2]);
  if (!Number.isInteger(day) || !month || !Number.isInteger(year)) return null;
  if (day < 1 || day > 31) return null;
  return year * 10000 + month * 100 + day;
}

export interface RewriteCandidate {
  slug: string;
  title: string;
  contentId: string;
  versionNo: number;
  sections: number;
  faqs: number;
  updatedFa: string | null;
}

export function isRewriteQualified(candidate: RewriteCandidate): boolean {
  return candidate.faqs === 0 || candidate.sections < 2;
}

export function pickRewriteCandidate(
  candidates: readonly RewriteCandidate[],
): RewriteCandidate | null {
  const qualified = candidates.filter(isRewriteQualified);
  if (qualified.length === 0) return null;
  const sorted = [...qualified].sort((a, b) => {
    const dateA = parseUpdatedFa(a.updatedFa);
    const dateB = parseUpdatedFa(b.updatedFa);
    if (dateA !== null && dateB !== null && dateA !== dateB) return dateA - dateB;
    if (dateA === null && dateB !== null) return 1;
    if (dateA !== null && dateB === null) return -1;
    if (a.sections !== b.sections) return a.sections - b.sections;
    if (a.faqs !== b.faqs) return a.faqs - b.faqs;
    return a.slug.localeCompare(b.slug);
  });
  return sorted[0];
}
