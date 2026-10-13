import type { Metadata } from "next";
import { Fragment } from "react";
import Link from "next/link";
import { getTours, getSiteSettings } from "@/lib/db-content";
import { SITE_URL } from "@/lib/site";
import { pageSeo, displayTitle } from "@/lib/og";
import { fa } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { TourCard } from "@/components/site/TourCard";
import { TourBanner } from "@/components/site/TourBanner";
import { SeasonBanner } from "@/components/site/SeasonBanner";
import { CtaBlock } from "@/components/blocks/cta";
import { Breadcrumb } from "@/components/ui/breadcrumb";

export const metadata: Metadata = pageSeo({
  // ماتریس OG (هندآف seocontent ۱۷:۰۰؛ S-006/S-014): هر سه صفحهٔ استاتیک
  // از هلپر مشترک می‌آیند تا og:title/url/locale/type هیچ‌وقت جا نماند.
  // S-050/S-049 (۲۰ مهر ۱۴۰۵): نسخهٔ پسا-غیرفعال‌سازی سامویی/کرابی؛
  // فقط ۳ تور فعال نام برده می‌شوند.
  title: "تورهای تایلند؛ مقایسه و انتخاب تور؛ تایلندگرد",
  description:
    "همهٔ تورهای تایلندگرد را مقایسه کنید؛ پوکت، بانکوک و پاتایا و بانکوک و پوکت. قیمت‌ها «قیمت پایه» و تقریبی‌اند؛ رزرو فقط با تماس تلفنی.",
  canonical: "/tours",
  type: "website",
});

export default async function ToursPage() {
  const tours = await getTours();
  const s = await getSiteSettings();
  // S-020 (هندآف seocontent ۱۹:۰۰): تور «منتخب این هفته» بنر از گرید حذف
  // می‌شود تا هدینگ تکراری (h2 بنر + h3 کارت با متن یکسان) نماند.
  const [featuredTour, ...gridTours] = tours;
  // قانون ۳۷ اسکیما: ItemList همان آیتم‌های نمایشی گرید را دارد (نه بیشتر،
  // نه کمتر)؛ بنر «منتخب» جدا از گرید است و در اسکیما نمی‌آید.
  // قانون ۳۷ اسکیما: کارت‌ها با عنوان و خلاصه رندر می‌شوند؛ ItemList فقط همان
  // آیتم‌های نمایشی گرید را دارد (نه بیشتر، نه کمتر)؛ از همان getTours() صفحه.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "تورهای تایلند",
    itemListElement: gridTours.map((tour, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: tour.title,
      url: `${SITE_URL}/tours/${tour.slug}`,
    })),
  };
  // بردکرامب (S-009 حسابرس): آینهٔ بصری (nav با aria-label «مسیر») + JSON-LD؛
  // آیتم «خانه» بدون اسلش انتهایی تا با کنونیکال یکی باشد (S-005).
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "خانه", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "تورهای تایلند", item: `${SITE_URL}/tours` },
    ],
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="mx-auto max-w-6xl px-6 py-10">
      <Breadcrumb
        className="mb-6"
        items={[{ label: "خانه", href: "/" }, { label: "تورهای تایلند" }]}
      />
      {/* قانون تراکم فارسی (۱۴۰۵/۰۷/۱۱): متن فارسی پرحجم‌تر است؛ فاصله‌های بادکردهٔ معیار انگلیسی در فارسی شل می‌شود؛ ریتم عمودی جمع‌وجور. */}
      <header className="max-w-3xl space-y-4">
        <h1 className="text-3xl md:text-4xl">تورهای تایلند</h1>
        <p className="leading-[1.8] text-muted-foreground">
          در حال حاضر {fa(tours.length)} تور فعال داریم:{" "}
          {tours.map((t, i) => (
            <Fragment key={t.slug}>
              {i > 0 && (i === tours.length - 1 ? " و " : "، ")}
              <Link href={`/tours/${t.slug}`} className="underline decoration-brand/60 underline-offset-4">
                تور {t.shortTitle || t.title}
              </Link>
            </Fragment>
          ))}.
          قیمت‌هایی که می‌بینید «قیمت پایه»‌اند و بسته به تاریخ سفر و هتل کمی بالا و پایین می‌شوند.
          رزرو هم فقط با تماس تلفنی انجام می‌شود؛ پرداخت آنلاین نداریم.
        </p>
      </header>

      {featuredTour && (
        <section className="mt-8">
          <TourBanner tour={featuredTour} />
        </section>
      )}

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {gridTours.map((tour) => (
          <TourCard key={tour.slug} tour={tour} />
        ))}
      </div>

      {/* بنر ب (بین‌سکشنی)؛ حکم ۴؛ D-106: بالای بخش هزینه تا جریان هزینه→اقدام به CTA نریزد */}
      <div className="mt-8">
        <SeasonBanner />
      </div>

      {/* بلوک «هزینهٔ تور تایلند چقدر است؟»؛ بریف seocontent ۲۰ مهر ۱۴۰۵، ۱۰:۰۰، اسنیپت پاراگرافی */}
      <section className="mt-8 max-w-3xl space-y-4">
        <h2 className="text-2xl sm:text-3xl">هزینهٔ تور تایلند چقدر است؟</h2>
        <p className="leading-[1.8] text-muted-foreground">
          هزینهٔ تور تایلند عدد ثابتی ندارد و به پنج عامل بستگی دارد: فصل سفر، درجهٔ هتل، مدت اقامت، مقصد انتخابی و پرواز مستقیم یا با توقف. تورهای تایلندگرد فروش تلفنی دارند و قیمت دقیق هر پکیج را کارشناس مقصد بر اساس همین عوامل مشخص می‌کند؛ برای مقایسهٔ دو تور، هر پنج عامل را کنار هم بگذارید.
        </p>
      </section>

      {/* باند CTA پایانی (بریف ۳ artdir): جایگزین بخش دستی «هنوز تصمیم نگرفته‌اید؟»؛
          حکم مدیر: فقط یک مسیر تماس. کپی نهایی (اجرا ۱۵) اعمال شد؛ شماره فعلاً موقت. */}
      <CtaBlock
        title="با کارشناس تایلند حرف بزنید"
        description="تور موردنظرتان را پیدا نکردید؟ بگویید چه می‌خواهید؛ ما برنامه‌اش را می‌چینیم"
        action={<span dir="ltr">{s.PHONE_MOBILE_DISPLAY}</span>}
        actionHref={s.PHONE_MOBILE_LINK}
        callContext="tours-cta"
        note="زمان ترجیحی تماس را شما می‌گویید"
      />

      {/* S-090 (بریف seo ۰۳:۳۵، قانون ۶۴): لینک زمینه‌ای هاب راهنماها از داخل
          main همین صفحه؛ فقط در main (نه لی‌اوت سراسری). انکر = عنوان نمایشی
          راهنما (همان displayTitle کارت‌ها). */}
      <section className="mt-8">
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-2xl sm:text-3xl">راهنمای سفر</h2>
            <ul className="mt-4 space-y-3">
              {[
                { slug: "thailand-visa-guide", title: "ویزای تایلند برای ایرانیان؛ مدارک، هزینه و زمان صدور" },
                { slug: "thailand-trip-cost", title: "هزینهٔ سفر به تایلند در ۱۴۰۵؛ راهنمای کامل بودجهٔ سفر" },
                { slug: "best-time-to-visit-thailand", title: "بهترین زمان سفر به تایلند" },
              ].map((g) => (
                <li key={g.slug}>
                  <Link href={`/guide/${g.slug}`} className="font-semibold underline underline-offset-4">
                    {displayTitle(g.title)}
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>
      </main>
    </>
  );
}
