import { connection } from "next/server";
import { getSitemapSections } from "@/lib/sitemap-sections";

/**
 * بخش‌های جدای نقشهٔ سایت: ‎/sitemaps/pages.xml‎، ‎/sitemaps/tours.xml‎،
 * ‎/sitemaps/guides.xml‎ — برای آمار تفکیکی در سرچ کنسول.
 * داینامیک و خودبه‌روزشونده از دیتابیس زنده.
 *
 * نکته (۲۰ مهر ۱۴۰۵): زیر ‎/sitemap/‎ نمی‌شود گذاشت — سیستم متاروت نکست
 * در نکست ۱۶.۴ آن فضا را گرفته و route دستی ۴۰۴ می‌دهد؛ پس جمع «sitemaps».
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ section: string }> }
): Promise<Response> {
  await connection();
  const { section } = await ctx.params;
  // section مقدارش «pages.xml» است (با پسوند)؛ پسوند را می‌گیریم
  const name = section.replace(/\.xml$/, "");
  const sections = await getSitemapSections();
  const entries =
    name === "pages" ? sections.pages : name === "tours" ? sections.tours : name === "guides" ? sections.guides : null;
  if (!entries) {
    return new Response("Not Found", { status: 404 });
  }
  const urls = entries
    .map((e) => {
      const lastmod = e.lastModified instanceof Date ? e.lastModified.toISOString() : e.lastModified;
      return (
        `  <url>\n    <loc>${e.url}</loc>\n    <lastmod>${lastmod}</lastmod>\n` +
        `    <changefreq>${e.changeFrequency}</changefreq>\n    <priority>${e.priority}</priority>\n  </url>`
      );
    })
    .join("\n");
  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `${urls}\n</urlset>`;
  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
