import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Check, Phone, X } from "lucide-react";
import { getTour, getTours, getGuide, getRelatedLinks, getSiteSettings } from "@/lib/db-content";
import { pageSeo, brandTitle } from "@/lib/og";
import { fa, faNumber } from "@/lib/utils";
import { formatJalali } from "@/lib/jalali";
import { renderInlineLinks, stripInlineLinkMarkers } from "@/lib/inline-links";
import { CallButtons } from "@/components/site/CallButtons";
import { CallbackForm } from "@/components/site/CallbackForm";
import { ShareButtons } from "@/components/site/ShareButtons";
import { TourStickyBar } from "@/components/site/TourStickyBar";
import { FaqBlock } from "@/components/blocks/faq";
import { Accordion } from "@/components/ui/accordion";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Price } from "@/components/ui/price";
import { Separator } from "@/components/ui/separator";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await getTours()).map((tour) => ({ slug: tour.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const tour = await getTour(slug);
  if (!tour) return { title: "تور پیدا نشد" };
  const s = await getSiteSettings();
  // قاعدهٔ og.ts: صفحه‌ای که openGraph خودش را دارد باید pageSeo را صدا بزند
  // (یافتهٔ S2 سئو: url و locale و بلوک twitter در همهٔ صفحه‌ها)
  const meta = pageSeo({
    title: brandTitle(tour.title),
    description: tour.summary,
    canonical: `/tours/${tour.slug}`,
    type: "article",
  });
  // F4 سئو (۱۹ مهر ۱۴۰۵، بستن یافته): og:image اختصاصی فقط برای اسلاگ krabi-6-days؛
  // بقیهٔ تورها همان پیش‌فرض سراسری og.ts می‌مانند. موقت تا رسیدن عکس واقعی کرابی.
  if (slug === "krabi-6-days") {
    meta.openGraph = {
      ...meta.openGraph,
      images: [
        {
          url: `${s.SITE_URL}/images/og-krabi-6-days.webp`,
          width: 1200,
          height: 630,
          alt: "کارت معرفی تور کرابی شش‌روزهٔ تایلندگرد؛ صخره‌های آهکی آندامان و ساحل ریلی",
        },
      ],
    };
    meta.twitter = {
      ...meta.twitter,
      images: [`${s.SITE_URL}/images/og-krabi-6-days.webp`],
    };
  }
  return meta;
}

/**
 * تمپلیت تایپوگرافیک عمدی است (حکم آرت‌دایرکشن F-015، ۲۰ مهر ۱۴۰۵):
 * عکس فقط واقعی؛ تا رسیدن عکس‌های content هیچ تصویری «قرض» نمی‌شود.
 * اسلات تصویری با رسیدن عکس‌ها به همین تمپلیت اضافه می‌شود.
 */
export default async function TourPage({ params }: Props) {
  const { slug } = await params;
  const tour = await getTour(slug);
  if (!tour) notFound();

  // اقدام ۱ بریف آمیتیس (۲۰ مهر ۱۴۰۵) — قانون «تازگی قیمت»:
  // قیمت «نامشخص» است اگر price_from یا price_updated_at برابر NULL باشد یا
  // به‌روزرسانی قدیمی‌تر از ۷ روز باشد؛ در این حالت هیچ آیتم FAQ قیمتی
  // رندر نمی‌شود (نه در HTML، نه در اسکیمای FAQPage). فقط قیمت تازه،
  // آیتم اول FAQ می‌گیرد. اسکیمای TouristTrip/Offer دست نمی‌خورد.
  const faqs = [...tour.faqs];
  const priceUpdatedAt = tour.priceUpdatedAt ? new Date(tour.priceUpdatedAt) : null;
  const priceUpdatedAtOk = priceUpdatedAt !== null && !Number.isNaN(priceUpdatedAt.getTime());
  const priceFresh =
    tour.priceFrom != null &&
    priceUpdatedAtOk &&
    Date.now() - (priceUpdatedAt as Date).getTime() <= 7 * 24 * 60 * 60 * 1000;
  if (priceFresh && priceUpdatedAtOk && tour.priceFrom != null) {
    faqs.unshift({
      question: `قیمت تور ${tour.title} چقدر است؟`,
      answer: `شروع قیمت از ${faNumber(tour.priceFrom)} تومان؛ آخرین به‌روزرسانی: ${formatJalali(priceUpdatedAt as Date)}. برای قیمت به‌روز، با کارشناس فروش تماس بگیرید.`,
    });
  }

  // لینک‌های داخلی به راهنماهای مرتبط (مشخصات تیم سئومحتوا، نگاشت ۱۹ مهر ۱۴۰۵)
  const [{ tourToGuides }, s] = await Promise.all([getRelatedLinks(), getSiteSettings()]);
  const guideBlock = tourToGuides[tour.slug];
  const relatedGuides = guideBlock
    ? (
        await Promise.all(guideBlock.slugs.map((gs) => getGuide(gs)))
      ).filter((g): g is NonNullable<typeof g> => g !== undefined)
    : [];

  const tripJsonLd = {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    name: tour.title,
    description: tour.summary,
    touristType: tour.touristType,
    itinerary: {
      "@type": "ItemList",
      numberOfItems: tour.itinerary.length,
      itemListElement: tour.itinerary.map((d) => ({
        "@type": "ListItem",
        position: d.day,
        name: `روز ${fa(d.day)} | ${d.title}`,
        description: d.description,
      })),
    },
    // قیمت از اسکیما حذف شد: صفحه خودش می‌گوید قیمت‌ها «شروع قیمت» و تقریبی‌اند
    // و با تاریخ سفر و ظرفیت هتل تغییر می‌کنند؛ پس validFrom/priceValidUntil واقعی
    // وجود ندارد و نگه‌داشتن price گمراه‌کننده بود. قیمت نمایشی HTML سر جایش است.
    offers: {
      "@type": "Offer",
      availability: tour.active ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `${s.SITE_URL}/tours/${tour.slug}`,
    },
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: stripInlineLinkMarkers(f.answer) },
    })),
  };

  // بردکرامب JSON-LD: آینهٔ همان سه سطح بردکرامب بصری (خانه ← تورها ← عنوان کوتاه تور)
  // (دیف تیم سئو، ۰۷:۳۵؛ اجرا در ۰۹:۳۵)
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "خانه", item: `${s.SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "تورها", item: `${s.SITE_URL}/tours` },
      { "@type": "ListItem", position: 3, name: tour.shortTitle, item: `${s.SITE_URL}/tours/${tour.slug}` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(tripJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <div className="mx-auto max-w-5xl px-6 py-12">
        <Breadcrumb
          className="mb-6"
          items={[
            { label: "خانه", href: "/" },
            { label: "تورها", href: "/tours" },
            { label: tour.shortTitle },
          ]}
        />
        <header className="space-y-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Badge variant="brand">{tour.shortTitle}</Badge>
            <span className="text-sm text-muted-foreground">
              {fa(tour.days)} روزه | {fa(tour.nights)} شب · {tour.route}
            </span>
          </div>
          <h1 className="text-4xl">{tour.title}</h1>
          <p className="text-lg leading-9">{tour.summary}</p>
        </header>

        <Separator className="my-6" />

        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className="text-sm text-muted-foreground">شروع قیمت</p>
          <Price amount={tour.priceFrom} size="lg" />
        </div>

        <Alert variant="info" className="mt-4">
          قیمت‌ها «شروع قیمت» و تقریبی‌اند و با توجه به تاریخ سفر و ظرفیت هتل کمی تغییر می‌کنند.
          قیمت دقیق را کارشناس فروش موقع تماس می‌گوید.
        </Alert>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg" variant="brand">
            <a href={s.PHONE_MOBILE_LINK}>
              <Phone />
              تماس با کارشناس فروش
            </a>
          </Button>
          <Button asChild size="lg" variant="outline">
            <a href="#callback">درخواست تماس</a>
          </Button>
        </div>

        <div id="tour-hero-end" aria-hidden className="h-px" />

        <Separator className="my-8" />

        <section className="mt-10">
          <h2 className="text-center text-2xl sm:text-start sm:text-3xl">چرا این تور؟</h2>
          <ul className="mt-5 space-y-3">
            {tour.highlights.map((h) => (
              <li key={h} className="flex items-start gap-2.5">
                <Check className="mt-1 size-5 shrink-0 text-success-text" />
                <span className="leading-7">{h}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl sm:text-3xl">دربارهٔ تور {tour.shortTitle}</h2>
          <div className="mt-5 space-y-5">
            {tour.description.slice(0, 3).map((p, i) => (
              <p key={i} className="leading-9 text-foreground/90">
                {renderInlineLinks(p)}
              </p>
            ))}
            {tour.description.length > 3 && (
              <Alert variant="info" title="نکتهٔ کارشناس">
                {tour.description.slice(3).map((p, i) => (
                  <p key={i} className="leading-9 text-foreground/80">
                    {renderInlineLinks(p)}
                  </p>
                ))}
              </Alert>
            )}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl sm:text-3xl">برنامهٔ روزبه‌روز</h2>
          <Accordion
            className="mt-5"
            defaultOpen={["day-1"]}
            items={tour.itinerary.map((d) => ({
              id: `day-${d.day}`,
              title: `روز ${fa(d.day)} | ${d.title}`,
              content: d.description,
            }))}
          />
        </section>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>شامل می‌شود</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2.5">
                {tour.includes.map((i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 size-5 shrink-0 text-success-text" />
                    <span className="text-sm leading-7">{i}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>شامل نمی‌شود</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2.5">
                {tour.excludes.map((e) => (
                  <li key={e} className="flex items-start gap-2.5">
                    <X className="mt-0.5 size-5 shrink-0 text-destructive" />
                    <span className="text-sm leading-7">{e}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      <FaqBlock
        description="هر سؤالی که دربارهٔ این تور دارید، این‌جا جوابش را می‌بینید. اگر نبود، همان پایین شماره‌تان را بگذارید."
        items={faqs.map((f, i) => ({
          id: `faq-${i}`,
          title: f.question,
          content: renderInlineLinks(f.answer),
        }))}
      />

      {relatedGuides.length > 0 && guideBlock && (
        <section className="mx-auto mt-10 max-w-5xl px-6">
          <Card>
            <CardContent className="pt-6">
              <p className="leading-[1.8] text-foreground/90">
                {guideBlock.lead}{" "}
                {relatedGuides.map((g, i) => (
                  <span key={g.slug}>
                    {i > 0 && " و "}
                    <Link
                      href={`/guide/${g.slug}`}
                      className="font-semibold underline underline-offset-4"
                    >
                      {g.title}
                    </Link>
                  </span>
                ))}{" "}
                {guideBlock.trail}
              </p>
            </CardContent>
          </Card>
        </section>
      )}

      <div id="callback" className="mx-auto mt-16 max-w-5xl scroll-mt-24 px-6 pb-sticky-bar-clearance md:pb-16">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>درخواست تماس برای تور {tour.shortTitle}</CardTitle>
              <CardDescription>شماره‌تان را وارد کنید؛ در بازه‌ای که می‌گویید با شما تماس می‌گیریم.</CardDescription>
            </CardHeader>
            <CardContent>
              <CallbackForm tourSlug={tour.slug} tourTitle={tour.shortTitle} contactName={s.CONTACT_NAME} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>ترجیح می‌دهید خودتان زنگ بزنید؟</CardTitle>
              <CardDescription>مستقیم با کارشناس فروش صحبت کنید یا در واتس‌اپ پیام بدهید.</CardDescription>
            </CardHeader>
            <CardContent>
              <CallButtons />
            </CardContent>
          </Card>
        </div>

        <ShareButtons title={brandTitle(tour.title)} path={`/tours/${tour.slug}`} siteUrl={s.SITE_URL} divider />
      </div>

      <TourStickyBar />
    </>
  );
}
