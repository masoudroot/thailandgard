import type { MetadataRoute } from "next";
import { getSiteSettings } from "@/lib/db-content";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const s = await getSiteSettings();
  return {
    // دستور مسعود: ‎/dashboard‎ در گوگل ایندکس نشود.
    // RC (PRODUCTION-FINALIZE-01): ‎/dashboard‎ مسیر ‎/factory-dashboard‎
    // را prefix-match نمی‌کند، پس داشبورد تازه جداگانه disallow می‌شود.
    rules: [
      { userAgent: "*", allow: "/", disallow: "/dashboard" },
      { userAgent: "*", allow: "/", disallow: "/factory-dashboard" },
    ],
    // S-044 حسابرس (۲۰ مهر ۱۴۰۵): فقط نقشهٔ ریشه اعلام می‌شود؛
    // sitemap.xml همهٔ URLها را دارد و اعلام تکراری فرزندها خزش را پراکنده می‌کرد.
    sitemap: [`${s.SITE_URL}/sitemap.xml`],
  };
}
