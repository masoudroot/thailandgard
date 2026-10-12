import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BookOpenText, CalendarDays, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { getGuides } from "@/lib/db-content";
import { SITE_URL } from "@/lib/site";
import { pageSeo, displayTitle } from "@/lib/og";
import { GUIDE_COVERS } from "@/lib/guide-covers";
import { fa } from "@/lib/utils";
import { CoverImage } from "@/components/site/CoverImage";

export const metadata: Metadata = pageSeo({
  // ماتریس OG (هندآف seocontent ۱۷:۰۰؛ S-006/S-019): og:url و locale و type
  // از هلپر مشترک می‌آیند؛ دستی‌نویسی بلوک openGraph ممنوع.
  title: "راهنمای سفر تایلند؛ ویزا، بهترین زمان و مقایسهٔ مقصدها؛ تایلندگرد",
  description:
    "راهنماهای کاربردی سفر به تایلند؛ بهترین زمان سفر، ویزا و مدارک، مقایسهٔ مقصدها. تیم محتوای تایلندگرد این صفحه را با راهنماهای تازه به‌روز نگه می‌دارد.",
  canonical: "/guide",
  type: "website",
});

export default async function GuideIndexPage() {
  const guides = await getGuides();
  // قانون ۳۷ اسکیما: کارت‌ها با عنوان و خلاصه رندر می‌شوند؛ ItemList فقط همان
  // آیتم‌های نمایشی را دارد (نه بیشتر، نه کمتر)؛ از همان getGuides() صفحه.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "راهنمای سفر تایلند",
    itemListElement: guides.map((guide, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: guide.title,
      url: `${SITE_URL}/guide/${guide.slug}`,
    })),
  };
  // بردکرامب (S-009 حسابرس): آینهٔ بصری (nav با aria-label «مسیر») + JSON-LD؛
  // آیتم «خانه» بدون اسلش انتهایی تا با کنونیکال یکی باشد (S-005).
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "خانه", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "راهنمای سفر تایلند", item: `${SITE_URL}/guide` },
    ],
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="mx-auto max-w-5xl px-6 py-12">
      <Breadcrumb
        className="mb-6"
        items={[{ label: "خانه", href: "/" }, { label: "راهنمای سفر تایلند" }]}
      />
      <header className="max-w-2xl">
        <p className="inline-flex items-center gap-2 rounded-full bg-brand/15 px-3 py-1 text-xs font-semibold text-brand-foreground">
          <BookOpenText className="size-4" />
          راهنمای سفر
        </p>
        <h1 className="mt-3 text-3xl md:text-4xl">راهنمای سفر تایلند</h1>
        <p className="mt-4 text-base leading-[1.8] text-muted-foreground">
          این‌جا را تیم محتوا با راهنماهای تازه به‌روز نگه می‌دارد. هر چه برای تصمیم گرفتن
          دربارهٔ سفر تایلند لازم داری، این‌جا پیدا می‌کنی؛ ساده، به‌روز و بدون حاشیه.
        </p>
      </header>

      {/* S-013 (هندآف seocontent ۱۹:۰۰): h2 میانی تا پرش h1←h3 نماند؛
          بصری پنهان چون کارت‌ها خودشان تیتر دارند */}
      <h2 className="sr-only">فهرست راهنماها</h2>
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {guides.map((guide) => {
          const cover = GUIDE_COVERS[guide.slug];
          return (
          <Link key={guide.slug} href={`/guide/${guide.slug}`} className="group block">
            <Card className="flex h-full flex-col overflow-hidden transition-colors group-hover:border-brand/60">
              {/* اسلات تصویری S5: قاب ۱۶:۱۰ + ماسک graphite-soft از پایین
                  (سقف ۷۰٪، حکم ۶)؛ تیتر راهنما روی ماسک */}
              <div className="relative aspect-[16/10] overflow-hidden border-b border-border">
                {cover ? (
                  <CoverImage
                    src={cover.src}
                    alt={cover.alt}
                    width={cover.w}
                    height={cover.h}
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
                  />
                ) : (
                  // جای‌نگه‌دار هم‌شکل تایپوگرافیک (راهنمای بدون کاور)
                  <div className="flex size-full items-center justify-center bg-secondary/50 p-6 text-center">
                    <span className="font-display text-lg text-foreground/70">{displayTitle(guide.title)}</span>
                  </div>
                )}
                <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-background/70 via-background/25 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <Badge variant="brand">{guide.category}</Badge>
                  <CardTitle className="mt-2 text-xl">{displayTitle(guide.title)}</CardTitle>
                </div>
              </div>
              <CardContent className="flex flex-1 flex-col gap-4 p-5">
                <p className="text-sm leading-7 text-muted-foreground">{guide.excerpt}</p>
                <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-4 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="size-3.5" />
                    {fa(guide.readingMinutes)} دقیقه مطالعه
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="size-3.5" />
                    به‌روزرسانی: {guide.updatedFa}
                  </span>
                </div>
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                  خواندن راهنما
                  <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
                </span>
              </CardContent>
            </Card>
          </Link>
          );
        })}
      </div>
      </main>
    </>
  );
}
