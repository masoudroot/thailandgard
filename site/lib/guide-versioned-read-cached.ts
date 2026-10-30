import { cacheTag } from "next/cache";
import {
  fetchVersionedGuide,
  readVersionedReadConfig,
  type VersionedGuideResult,
} from "@/lib/guide-versioned-read";

/**
 * R2-B: پوستهٔ کش‌دار دور خواندن نسخه‌ای. در cacheComponents با
 * ensureStatic = "navigation" (ریشهٔ layout)، دادهٔ بی‌کش در صفحه یا متادیتا
 * خطای بیلد می‌دهد؛ پس خواندن نسخه‌ای فقط با "use cache" پیش‌رندر می‌شود.
 * کلید کش، slug است؛ حالت خواندن متغیر محیطی زمان بیلد است و هر بیلد کش
 * خودش را دارد، پس جابه‌جایی اشاره‌گر فقط با بیلد تازه (با کش پاک‌شده)
 * دیده می‌شود. این فایل از lib نسخه‌ای جداست تا آن lib در تست واحد بدون
 * ران‌تایم نکست قابل import بماند.
 */
export async function getVersionedGuideCached(slug: string): Promise<VersionedGuideResult> {
  "use cache";
  cacheTag("versioned-guides");
  return fetchVersionedGuide(slug, readVersionedReadConfig());
}
