import type { MetadataRoute } from "next";
import { getSiteSettings, getTours, getGuides } from "@/lib/db-content";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const s = await getSiteSettings();
  const tours = await getTours();
  const guides = await getGuides();
  const base = s.SITE_URL;
  const staticRoutes = ["", "/tours", "/guide", "/contact"].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.8,
  }));
  const tourRoutes = tours.map((t) => ({
    url: `${base}/tours/${t.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.9,
  }));
  const guideRoutes = guides.map((g) => ({
    url: `${base}/guide/${g.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));
  return [...staticRoutes, ...tourRoutes, ...guideRoutes];
}
