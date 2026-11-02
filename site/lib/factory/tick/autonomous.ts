/**
 * کمک‌های خالص مسیر خودمختار محتوا (THG-AUTO-01).
 *
 * این فایل هیچ دسترسی دیتابیسی و هیچ Secret ندارد؛ فقط ثابت‌ها و
 * سازنده‌های پیام که قدم‌های تیک از آن‌ها استفاده می‌کنند، این‌جا
 * پین شده‌اند تا تست واحد بتواند آن‌ها را بگیرد:
 * - هویت تأیید سیستمی: همیشه system:autonomous، هرگز هویت انسان؛
 * - پیام بازنویسی: بار جاری راهنما به‌عنوان JSON در پیام کاربر؛
 * - چک sitemap برای قدم verify_publication.
 */

/** هویت ثبت‌کنندهٔ تأیید سیستمی؛ عمداً انسان نیست. */
export const SYSTEM_APPROVER_ID = "system:autonomous";

/** دلیل ثبت‌شدهٔ تأیید سیستمی؛ دستور مدیر پروژه را نام می‌برد. */
export const AUTO_APPROVAL_REASON =
  "انتشار خودمختار طبق دستور مدیر پروژه (اصلاحیهٔ ۲ Fast-Track)؛ جایگزین تأیید انسانی، Verify خودکار + Rollback خودکار است.";

/**
 * پیام کاربر برای بازنویسی: همان slug و عنوان، با بار جاری راهنما
 * به‌صورت JSON. بار، همان‌طور که هست رشته می‌شود؛ کوتاه‌سازی،
 * JSON را ناقص می‌کرد و مدل را به حدس می‌انداخت.
 */
export function buildRewriteUserMessage(
  slug: string,
  title: string,
  currentPayload: unknown,
): string {
  return (
    `راهنمای موجود با slug «${slug}» و عنوان «${title}» را بازنویسی کن. ` +
    `بار جاری راهنما (JSON) این است: ${JSON.stringify(currentPayload)}.`
  );
}

/**
 * آیا نقشهٔ سایت، مسیر متعارف راهنما را دارد؟ مقایسه، رشته‌ای است؛
 * مسیر با اسلش آغاز می‌شود و در XML نقشه، همان‌طور می‌آید.
 */
export function sitemapContainsSlug(sitemapXml: string, canonicalPath: string): boolean {
  return sitemapXml.includes(canonicalPath);
}
