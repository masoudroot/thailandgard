import { SiteChrome } from "@/components/site/SiteChrome";
import { getSiteSettings, getTours } from "@/lib/db-content";

/**
 * لی‌اوت گروه (site): پوستهٔ کامل سایت (هدر/فوتر/اسکریپت‌ها) فقط برای
 * مسیرهای سایت. /dashboard و /login در ریشه‌اند و این پوسته را نمی‌گیرند.
 */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const s = await getSiteSettings();
  const tours = await getTours();

  return <SiteChrome settings={s} tours={tours}>{children}</SiteChrome>;
}
