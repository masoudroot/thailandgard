import { cacheTag } from "next/cache";
import {
  VERSIONED_GUIDES_CACHE_TAG,
  fetchVersionedGuide,
  readVersionedReadConfig,
  type VersionedFetchOutcome,
} from "@/lib/guide-versioned-read";

/**
 * R2-B: پوستهٔ کش‌دار دور خواندن نسخه‌ای. در cacheComponents با
 * ensureStatic = "navigation" (ریشهٔ layout)، دادهٔ بی‌کش در صفحه یا متادیتا
 * خطای بیلد می‌دهد؛ پس خواندن نسخه‌ای فقط با "use cache" پیش‌رندر می‌شود.
 * کلید کش، slug است؛ حالت خواندن متغیر محیطی زمان بیلد است و هر بیلد کش
 * خودش را دارد. جابه‌جایی اشاره‌گر با باطل‌سازی همین تگ در Dispatch
 * انتشار (process-outbox، با expire: 0) دیده می‌شود و بیلد تازه
 * نمی‌خواهد. این فایل از lib نسخه‌ای جداست تا آن lib در تست واحد بدون
 * ران‌تایم نکست قابل import بماند.
 *
 * نکتهٔ حیاتی: حالت‌های موردانتظار (سند نیست، فیکسچر است، پیش‌نویس است)
 * این‌جا به مقدار تبدیل می‌شوند، نه خطا. خطا در فاز گرم‌کردن کش، مقدار
 * کش‌پذیر نمی‌سازد و فاز نهایی پیش‌رندر با «Unexpected cache miss»
 * می‌شکند و بیلد قرمز می‌شود. فقط خرابی واقعی بالا می‌آید.
 */
export async function getVersionedGuideCached(
  slug: string,
): Promise<VersionedFetchOutcome> {
  "use cache";
  cacheTag(VERSIONED_GUIDES_CACHE_TAG);
  try {
    return await fetchVersionedGuide(slug, readVersionedReadConfig());
  } catch (err) {
    const code = (err as { code?: unknown } | null)?.code;
    if (code === "DOCUMENT_NOT_FOUND" || code === "TEST_FIXTURE") {
      return null;
    }
    if (code === "NO_PUBLISHED_VERSION") return { kind: "draft" };
    throw err;
  }
}
