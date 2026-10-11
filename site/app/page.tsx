import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Compass, PhoneCall, ShieldCheck, Users } from "lucide-react";
import { OctoberBanner } from "@/components/site/OctoberBanner";
import { SeasonBanner } from "@/components/site/SeasonBanner";
import { TourCard } from "@/components/site/TourCard";
import { CallButtons } from "@/components/site/CallButtons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getTours, getGuides, getSiteSettings } from "@/lib/db-content";
import { pageSeo } from "@/lib/og";
import { fa } from "@/lib/utils";

export const metadata: Metadata = pageSeo({
  title: "تور تایلند؛ سفر تخصصی با مشاور تلفنی؛ تایلندگرد",
  description:
    "تور تایلند تخصصی از تهران؛ پوکت، بانکوک، سامویی و کرابی با لیدر فارسی‌زبان و مشاورهٔ تلفنی. با کارشناسان ما تماس بگیرید؛ رزرو فقط تلفنی و با راهنمایی گام‌به‌گام است.",
  canonical: "/",
});

const WHY_US = [
  {
    icon: Compass,
    title: "فقط تایلند",
    text: "ما سراغ ده مقصد نرفته‌ایم؛ یک مقصد را از بر هستیم. همین تمرکز یعنی جزیره به جزیره، هتل به هتل، تایلند را می‌شناسیم.",
  },
  {
    icon: PhoneCall,
    title: "مشاورهٔ تلفنی واقعی",
    text: "پشت تلفن یک کارشناس مقصد حرف می‌زند، نه ربات و نه فرم. سؤالتان را می‌پرسید و جواب درستش را همان‌جا می‌گیرید.",
  },
  {
    icon: Users,
    title: "لیدر فارسی‌زبان",
    text: "در همهٔ گشت‌ها یک لیدر فارسی‌زبان همراه گروه است؛ از فرودگاه تا آخرین روز سفر تنها نمی‌مانید.",
  },
  {
    icon: ShieldCheck,
    title: "بدون پرداخت آنلاین",
    text: "رزرو فقط با تماس انجام می‌شود و پولی را اینترنتی نمی‌گیریم. هر چه هست شفاف است و سندش را هم می‌گیرید.",
  },
];

export default async function HomePage() {
  const [tours, guides, s] = await Promise.all([getTours(), getGuides(), getSiteSettings()]);
  const featuredTours = tours.slice(0, 3);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${s.SITE_NAME} | ${s.SITE_SLOGAN}`,
    itemListElement: tours.map((tour, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: tour.title,
      url: `${s.SITE_URL}/tours/${tour.slug}`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* بنر الف (کمپین «پنجرهٔ اکتبر») در اسلات هیروی خانه؛ حکم ۳ */}
      <OctoberBanner />

      <section className="mx-auto max-w-6xl px-6 py-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-bold sm:text-3xl">تورهای پیشنهادی</h2>
            <p className="mt-2 text-muted-foreground">
              محبوب‌ترین تورهای تایلند، با قیمت شروع و جزئیات کامل هر سفر.
            </p>
          </div>
          <Button asChild variant="outline" className="shrink-0">
            <Link href="/tours">
              همهٔ تورها
              <ArrowLeft />
            </Link>
          </Button>
        </div>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featuredTours.map((tour) => (
            <TourCard key={tour.slug} tour={tour} />
          ))}
        </div>
      </section>

      {/* بنر ب (بین‌سکشنی)؛ حکم ۴ */}
      <div className="pb-14">
        <SeasonBanner />
      </div>

      <section className="border-y border-border bg-muted/40">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <h2 className="text-center text-2xl font-bold sm:text-3xl">
            چرا تایلندگرد
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-muted-foreground">
            چهار دلیلی که مسافرهای ما با خیال راحت سفر می‌کنند.
          </p>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {WHY_US.map(({ icon: Icon, title, text }) => (
              <Card key={title} className="h-full">
                <CardHeader>
                  <span className="inline-flex size-11 items-center justify-center rounded-surface bg-brand/15 text-brand-foreground">
                    <Icon className="size-5" />
                  </span>
                  <CardTitle className="mt-4 text-lg">{title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="leading-7">{text}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-bold sm:text-3xl">راهنمای سفر تایلند</h2>
            <p className="mt-2 text-muted-foreground">
              قبل از سفر بخوان؛ از{" "}
              <Link href="/guide/best-time-to-visit-thailand" className="underline decoration-brand/60 underline-offset-4">بهترین زمان سفر به تایلند</Link>{" "}
              تا{" "}
              <Link href="/guide/thailand-visa-guide" className="underline decoration-brand/60 underline-offset-4">ویزای تایلند</Link>{" "}
              و{" "}
              <Link href="/guide/phuket-vs-samui" className="underline decoration-brand/60 underline-offset-4">مقایسهٔ پوکت و سامویی</Link>.
            </p>
          </div>
          <Button asChild variant="outline" className="shrink-0">
            <Link href="/guide">
              همهٔ راهنماها
              <ArrowLeft />
            </Link>
          </Button>
        </div>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {guides.map((guide) => (
            <Link key={guide.slug} href={`/guide/${guide.slug}`} className="block h-full">
              <Card className="flex h-full flex-col">
                <CardHeader>
                  <Badge variant="brand">{guide.category}</Badge>
                  <CardTitle className="mt-3 text-xl leading-8">
                    {guide.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="mt-auto">
                  <CardDescription className="leading-7">
                    {guide.excerpt}
                  </CardDescription>
                  <p className="mt-4 text-xs text-muted-foreground">
                    {fa(guide.readingMinutes)} دقیقه مطالعه | به‌روز شده در {guide.updatedFa}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <Card className="overflow-hidden">
          <div className="bg-brand/10 px-6 py-10 text-center sm:px-10">
            <h2 className="text-2xl font-bold sm:text-3xl">
              برای رزرو، فقط کافی است زنگ بزنی
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
              {s.CONTACT_NAME}، {s.CONTACT_TITLE.toLowerCase()}، خودش پاسخ‌گوی توست؛
              از انتخاب تور تا روز پرواز.
            </p>
          </div>
          <CardContent className="px-6 py-8 sm:px-10">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-lg font-bold">{s.CONTACT_NAME}</p>
              <p className="mt-1 text-sm text-muted-foreground">{s.CONTACT_TITLE}</p>
              <div className="mt-4 space-y-2 text-sm">
                <p className="text-muted-foreground">
                  {s.PHONE_CHANNELS_NOTE} | شنبه تا پنجشنبه، ۹ صبح تا ۹ شب
                </p>
              </div>
            </div>
            <div className="mx-auto mt-8 max-w-2xl">
              <CallButtons compact />
            </div>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
