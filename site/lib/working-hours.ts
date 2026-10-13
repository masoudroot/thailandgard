/**
 * ساعت کاری تایلندگرد (منطقهٔ زمانی تهران): شنبه تا پنجشنبه، ۹ صبح تا ۹ شب.
 * جمعه تعطیل است. این منطقِ واحد هم در فرم درخواست تماس (CallbackForm) و هم
 * در رفتار خارج‌ساعتِ لینک‌های tel: (اسپک موبایل تور ترکیبی، قلم ۳) به کار
 * می‌رود تا «همان منطق isWithinWorkingHours فرم» در همه‌جا یکی باشد.
 *
 * حکم ۱۶ design-ir: قول تماس «روز معلوم» است، نه «روز کاری بعد»؛ نام روز با
 * همین منطق محاسبه می‌شود (جمعه‌شب ← شنبه؛ پنجشنبه‌شب ← شنبه).
 */

const FA_DAY_NAMES: Record<string, string> = {
  Sat: "شنبه",
  Sun: "یکشنبه",
  Mon: "دوشنبه",
  Tue: "سه‌شنبه",
  Wed: "چهارشنبه",
  Thu: "پنجشنبه",
  Fri: "جمعه",
};

// ترتیب هفته از شنبه (هم‌خوان با تقویم ایران)
const WEEK_ORDER = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"] as const;

function tehranParts(now: Date): { hour: number; weekday: string } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tehran",
    hour: "numeric",
    hourCycle: "h23",
    weekday: "short",
  }).formatToParts(now);
  return {
    hour: Number(parts.find((p) => p.type === "hour")?.value ?? "0"),
    weekday: parts.find((p) => p.type === "weekday")?.value ?? "Sat",
  };
}

/** داخل ساعت کاری هستیم؟ (شنبه تا پنجشنبه، ۹ تا ۲۱ به وقت تهران) */
export function isWithinWorkingHours(now: Date = new Date()): boolean {
  const { hour, weekday } = tehranParts(now);
  // جمعه = تعطیل؛ بقیهٔ روزها فقط ۹ تا ۲۱
  return weekday !== "Fri" && hour >= 9 && hour < 21;
}

/**
 * نام فارسی روزی که قول تماس برایش داده می‌شود (حکم ۱۶ design-ir).
 * فقط وقتی صدا زده می‌شود که خارج از ساعت کاری هستیم:
 * - جمعه (هر ساعتی) ← شنبه
 * - شبِ روزهای کاری (۲۱ به بعد) ← فردا؛ اگر فردا جمعه بود ← شنبه
 * - صبحِ زود روزهای کاری (قبل از ۹) ← همان امروز
 */
export function nextCallbackDayName(now: Date = new Date()): string {
  const { hour, weekday } = tehranParts(now);
  if (weekday === "Fri") return FA_DAY_NAMES.Sat;
  if (hour < 9) return FA_DAY_NAMES[weekday] ?? "شنبه";
  let next = WEEK_ORDER[(WEEK_ORDER.indexOf(weekday as (typeof WEEK_ORDER)[number]) + 1) % 7];
  if (next === "Fri") next = "Sat";
  return FA_DAY_NAMES[next];
}

/** برچسب بازهٔ «چه ساعتی با شما تماس بگیریم؟» فرم؛ پیش‌فرض «بین ۹ تا ۱۲». */
const SLOT_LABELS: Record<string, string> = {
  morning: "بین ۹ تا ۱۲",
  midday: "بین ۱۲ تا ۱۵",
  afternoon: "بین ۱۵ تا ۱۸",
  evening: "بین ۱۸ تا ۲۱",
};

export function callbackSlotLabel(callTime: string): string {
  return SLOT_LABELS[callTime] ?? "بین ۹ تا ۱۲";
}
