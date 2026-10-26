/**
 * قرارداد منبع سه‌بخشی «کانال|صفحه|کمپین» (SOURCE-TRACKING.md).
 *
 * بخش «صفحه» باید در همهٔ رویدادهای یک مسیر یکی باشد، وگرنه گزارش تبدیل
 * لید را از کلیک جدا می‌شمارد. باگ #230 دقیقاً همین بود: فرم، مسیر را دستی
 * `tour/<slug>` می‌ساخت ولی ردیاب تماس مسیر واقعی صفحه را `tours/<slug>`
 * می‌خواند. از این پس هر دو از همین دو تابع استفاده می‌کنند.
 */

/** پیشوند مسیر واقعی صفحه‌های تور در App Router. */
export const TOUR_ROUTE_PREFIX = "tours";

/** بخش صفحه برای یک صفحهٔ تور، از اسلاگ. */
export function tourPagePart(slug: string): string {
  return `${TOUR_ROUTE_PREFIX}/${slug.replace(/^\/+/, "")}`;
}

/** بخش صفحه برای هر مسیر دیگر؛ `pathname` دقیقاً همان چیزی است که مرورگر دارد. */
export function pathnamePagePart(pathname: string): string {
  return pathname.replace(/^\/+/, "") || "home";
}
