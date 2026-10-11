import type { MetadataRoute } from "next";
import { getSiteSettings } from "@/lib/db-content";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const s = await getSiteSettings();
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: `${s.SITE_URL}/sitemap.xml`,
  };
}
