/**
 * محدودکنندهٔ نرخ فرم‌های عمومی (Q4-04).
 *
 * چرا جدا از `lib/dashboard/rate-limit.ts`: آن ماژول سیاست «۵ تلاش ناموفق ←
 * بلاک» را برای ورود ادمین پیاده می‌کند. فرم تماس و فرم درخواست تماس نه
 * «تلاش ناموفق» دارند و نه باید شمارنده‌شان با لاگین قاطی شود؛ سیاستشان
 * «سقف ارسال در بازه» است.
 *
 * پنجره لغزان است، نه ثابت: هر ارسال یک مهر زمانی می‌گذارد و فقط ارسال‌های
 * داخل پنجره شمرده می‌شوند. پس کاربری که ۱۰ دقیقه صبر می‌کند قفل نمی‌ماند.
 *
 * محدودیت معماری: شمارنده درون‌حافظه‌ای است. روی یک نمونهٔ دائمی Node درست
 * کار می‌کند؛ در محیط چندنمونه‌ای هر نمونه سهم خودش را می‌شمارد. برای فرم
 * عمومی این سطح کافی است و همان فرض `lib/dashboard/rate-limit.ts` است.
 */

export interface RateLimitPolicy {
  /** بیشترین ارسال مجاز در هر پنجره. */
  max: number;
  /** طول پنجره به میلی‌ثانیه. */
  windowMs: number;
}

/** ۵ ارسال در ۱۰ دقیقه از هر IP برای هر مسیر. */
export const FORM_LIMIT: RateLimitPolicy = { max: 5, windowMs: 10 * 60 * 1000 };

const hits = new Map<string, number[]>();

let lastSweep = 0;
function sweep(now: number, policy: RateLimitPolicy): void {
  if (now - lastSweep < policy.windowMs) return;
  lastSweep = now;
  for (const [key, stamps] of hits) {
    const alive = stamps.filter((at) => now - at < policy.windowMs);
    if (alive.length === 0) hits.delete(key);
    else hits.set(key, alive);
  }
}

export interface RateLimitVerdict {
  allowed: boolean;
  /** ثانیه تا آزاد شدن سهم بعدی؛ صفر وقتی مجاز است. */
  retryAfterSeconds: number;
  /** تعداد ارسال‌های باقی‌مانده در همین پنجره. */
  remaining: number;
}

/**
 * یک ارسال را ثبت و اجازه/رد را برمی‌گرداند. `now` برای تست تزریق می‌شود.
 */
export function allowSubmission(
  key: string,
  now: number = Date.now(),
  policy: RateLimitPolicy = FORM_LIMIT,
): RateLimitVerdict {
  sweep(now, policy);

  const recent = (hits.get(key) ?? []).filter((at) => now - at < policy.windowMs);
  if (recent.length >= policy.max) {
    const oldest = recent[0];
    const waitMs = Math.max(0, oldest + policy.windowMs - now);
    hits.set(key, recent);
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil(waitMs / 1000)),
      remaining: 0,
    };
  }

  recent.push(now);
  hits.set(key, recent);
  return { allowed: true, retryAfterSeconds: 0, remaining: policy.max - recent.length };
}

/** پاک‌کردن کامل شمارنده‌ها؛ فقط برای تست. */
export function resetRateLimits(): void {
  hits.clear();
  lastSweep = 0;
}
