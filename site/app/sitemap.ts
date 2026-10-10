import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { TOURS } from "@/lib/tours";
import { GUIDES } from "@/lib/guides";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = SITE_URL;
  const staticRoutes = ["", "/tours", "/guide", "/contact"].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.8,
  }));
  const tourRoutes = TOURS.map((t) => ({
    url: `${base}/tours/${t.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.9,
  }));
  const guideRoutes = GUIDES.map((g) => ({
    url: `${base}/guide/${g.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));
  return [...staticRoutes, ...tourRoutes, ...guideRoutes];
}
