/**
 * قرارداد ساخت سند راهنما برای انتشار اول (CONTENT-FIRST-PUBLICATION).
 *
 * slug فقط حروف کوچک لاتین، رقم و خط تیرهٔ میانی است؛ با خط تیره شروع
 * یا تمام نمی‌شود و دو خط تیرهٔ پیاپی ندارد. canonical_path همیشه از
 * روی همان slug ساخته می‌شود تا مسیر صفحه با سند یکی بماند.
 * سند تازه با وضعیت draft ساخته می‌شود تا پیش از انتشار، عمومی و قابل
 * ایندکس نباشد؛ وضعیت published فقط از مسیر انتشار رسمی می‌آید، نه از
 * این‌جا. is_test_fixture همیشه false است؛ فیکسچر آزمایشی از این مسیر
 * ساخته نمی‌شود.
 */

export const GUIDE_SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** slug معتبر راهنماست یا نه (نوع ورودی هم بررسی می‌شود). */
export function isValidGuideSlug(slug: unknown): slug is string {
  return typeof slug === "string" && GUIDE_SLUG_PATTERN.test(slug);
}

/** مسیر کنونیکال صفحهٔ یک راهنما از روی slug آن. */
export function canonicalPathForGuideSlug(slug: string): string {
  return `/guide/${slug}`;
}

/** سطر درج سند راهنمای تازه؛ published_version_id تهی یعنی هنوز منتشر نشده است. */
export function buildContentDocumentInsert(slug: string): Record<string, unknown> {
  return {
    slug,
    content_type: "guide",
    status: "draft",
    canonical_path: canonicalPathForGuideSlug(slug),
    published_version_id: null,
    is_test_fixture: false,
  };
}
