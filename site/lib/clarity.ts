/**
 * رویدادهای سفارشی کلریتی برای قیف «درخواست تماس» (بستهٔ تحلیل ۱۷ مهر ۱۴۰۵).
 *
 * همهٔ رویدادها با سه بُعد جدا می‌شوند: page (مسیر صفحه)، device (mobile/desktop)
 * و در صورت وجود tour_slug. اگر اسنیپت کلریتی هنوز لود نشده باشد، تابع صف‌دار
 * window.clarity خودش تماس‌ها را نگه می‌دارد؛ اگر کلریتی کلاً نباشد، هیچ‌کاری نمی‌کنیم.
 */

declare global {
  interface Window {
    clarity?: (...args: unknown[]) => void;
  }
}

function deviceKind(): string {
  if (typeof window === "undefined") return "unknown";
  try {
    return window.matchMedia("(pointer: coarse)").matches ? "mobile" : "desktop";
  } catch {
    return "unknown";
  }
}

/**
 * ثبت یک رویداد سفارشی کلریتی با ابعاد استاندارد قیف.
 * نام‌های معتبر (از سند analytics/DROP-OFF-CALLBACK-2026-10-11-17.md):
 * callback_view | callback_field_start | callback_validation_fail |
 * callback_submit_attempt | callback_submit_success | callback_server_error |
 * tel_fallback_click
 */
export function clarityEvent(name: string, extra?: { field?: string; code?: string; tourSlug?: string }): void {
  if (typeof window === "undefined") return;
  const c = window.clarity;
  if (typeof c !== "function") return;
  const page = window.location.pathname;
  c("event", name);
  c("set", "page", page);
  c("set", "device", deviceKind());
  if (extra?.tourSlug) c("set", "tour_slug", extra.tourSlug);
  if (extra?.field) c("set", "field", extra.field);
  if (extra?.code) c("set", "code", extra.code);
}
