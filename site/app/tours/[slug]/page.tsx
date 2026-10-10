import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Check, Phone, X } from "lucide-react";
import { TOURS, getTour } from "@/lib/tours";
import { CONTACT_NAME, CONTACT_TITLE, PHONE_MOBILE_LINK, SITE_URL } from "@/lib/site";
import { fa, formatToman } from "@/lib/utils";
import { CallButtons } from "@/components/site/CallButtons";
import { CallbackForm } from "@/components/site/CallbackForm";
import { FaqBlock } from "@/components/blocks/faq";
import { Accordion } from "@/components/ui/accordion";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return TOURS.map((tour) => ({ slug: tour.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const tour = getTour(slug);
  if (!tour) return { title: "تور پیدا نشد" };
  return {
    title: tour.title,
    description: tour.summary,
    alternates: { canonical: `/tours/${tour.slug}` },
  };
}

export default async function TourPage({ params }: Props) {
  const { slug } = await params;
  const tour = getTour(slug);
  if (!tour) notFound();

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
      url: `${SITE_URL}/tours/${tour.slug}`,
    },
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: tour.faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(tripJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <div className="mx-auto max-w-5xl px-6 py-12">
        <header className="space-y-4">
          <Badge variant="brand">{tour.shortTitle}</Badge>
          <h1 className="text-3xl font-bold md:text-4xl">{tour.title}</h1>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <span>
              {fa(tour.days)} روزه | {fa(tour.nights)} شب
            </span>
            <span>{tour.route}</span>
          </div>
          <p className="text-lg">
            شروع قیمت از <strong>{formatToman(tour.priceFrom)}</strong>
          </p>
        </header>

        <p className="mt-8 text-lg leading-9">{tour.summary}</p>

        <Alert variant="info" className="mt-6 border-0 bg-transparent px-0 [&>svg]:text-muted-foreground">
          قیمت‌ها «شروع قیمت» و تقریبی‌اند و با توجه به تاریخ سفر و ظرفیت هتل کمی تغییر می‌کنند.
          قیمت دقیق را کارشناس فروش موقع تماس می‌گوید.
        </Alert>

        <section className="mt-10">
          <h2 className="text-2xl font-bold">چرا این تور؟</h2>
          <ul className="mt-5 space-y-3">
            {tour.highlights.map((h) => (
              <li key={h} className="flex items-start gap-2.5">
                <Check className="mt-1 size-5 shrink-0 text-success" />
                <span className="leading-7">{h}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-12 space-y-5">
          {tour.description.slice(0, 3).map((p, i) => (
            <p key={i} className="leading-9 text-foreground/90">
              {p}
            </p>
          ))}
          {tour.description.length > 3 && (
            <Alert variant="info" title="نکتهٔ کارشناس">
              {tour.description.slice(3).map((p, i) => (
                <p key={i} className="leading-9 text-foreground/80">
                  {p}
                </p>
              ))}
            </Alert>
          )}
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-bold">برنامهٔ روزبه‌روز</h2>
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
                    <Check className="mt-0.5 size-5 shrink-0 text-success" />
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
        description="هر سؤالی که دربارهٔ این تور داری، این‌جا جوابش را می‌بینی. اگر نبود، همان پایین شماره‌ات را بگذار."
        items={tour.faqs.map((f, i) => ({
          id: `faq-${i}`,
          title: f.question,
          content: f.answer,
        }))}
      />

      <div className="mx-auto mt-16 max-w-5xl px-6 pb-28 md:pb-16">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>درخواست تماس برای تور {tour.shortTitle}</CardTitle>
              <CardDescription>شماره‌ات را بگذار؛ کارشناس فروش به‌زودی زنگ می‌زند.</CardDescription>
            </CardHeader>
            <CardContent>
              <CallbackForm tourSlug={tour.slug} tourTitle={tour.shortTitle} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>ترجیح می‌دهی خودت زنگ بزنی؟</CardTitle>
              <CardDescription>مستقیم با کارشناس فروش صحبت کن یا در واتس‌اپ پیام بده.</CardDescription>
            </CardHeader>
            <CardContent>
              <CallButtons />
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">
              شروع قیمت از {formatToman(tour.priceFrom)}
            </p>
            <p className="text-xs text-muted-foreground">
              {CONTACT_NAME} | {CONTACT_TITLE}
            </p>
          </div>
          <Button asChild size="lg" variant="brand">
            <a href={PHONE_MOBILE_LINK}>
              <Phone />
              تماس
            </a>
          </Button>
        </div>
      </div>
    </>
  );
}
