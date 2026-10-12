import type { MetadataRoute } from "next";
import { getSiteSettings } from "@/lib/db-content";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const s = await getSiteSettings();
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: [
      `${s.SITE_URL}/sitemap.xml`,
      `${s.SITE_URL}/sitemaps/pages.xml`,
      `${s.SITE_URL}/sitemaps/tours.xml`,
      `${s.SITE_URL}/sitemaps/guides.xml`,
    ],
  };
}
