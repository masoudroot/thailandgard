import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Compass, PhoneCall, ShieldCheck, Users } from "lucide-react";
import { HeroBlock } from "@/components/blocks/hero";
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
import { TOURS } from "@/lib/tours";
import {
  CONTACT_NAME,
  CONTACT_TITLE,
  PHONE_CHANNELS_NOTE,
  PHONE_LANDLINE_DISPLAY,
  PHONE_MOBILE_DISPLAY,
  PHONE_MOBILE_LINK,
  SITE_NAME,
  SITE_SLOGAN,
  SITE_URL,
} from "@/lib/site";
import { GUIDES } from "@/lib/guides";
import { fa } from "@/lib/utils";

export const metadata: Metadata = {
  title: {
    absolute: "تور تایلند؛ سفر تخصصی با مشاور تلفنی؛ تایلندگرد",
  },
  description:
    "تور تایلند تخصصی از تهران؛ پوکت، بانکوک، سامویی و کرابی با لیدر فارسی‌زبان و مشاورهٔ تلفنی. همین حالا تماس بگیر؛ رزرو فقط تلفنی است.",
  openGraph: {
    title: "تور تایلند؛ سفر تخصصی با مشاور تلفنی؛ تایلندگرد",
    description:
      "تور تایلند تخصصی از تهران؛ پوکت، بانکوک، سامویی و کرابی با لیدر فارسی‌زبان و مشاورهٔ تلفنی. همین حالا تماس بگیر؛ رزرو فقط تلفنی است.",
  },
  alternates: { canonical: "/" },
};

const WHY_US = [
  {
    icon: Compass,
    title: "فقط تایلند",
    text: "ما سراغ ده مقصد نرفته‌ایم؛ یک مقصد را از بر هستیم. همین تمرکز یعنی جزیره به جزیره، هتل به هتل، تایلند را می‌شناسیم.",
  },
  {
    icon: PhoneCall,
    title: "مشاورهٔ تلفنی واقعی",
    text: "پشت تلفن یک کارشناس مقصد حرف می‌زند، نه ربات و نه فرم. سؤالت را می‌پرسی و جواب درستش را همان‌جا می‌گیری.",
  },
  {
    icon: Users,
    title: "لیدر فارسی‌زبان",
    text: "در همهٔ گشت‌ها یک لیدر فارسی‌زبان همراه گروه است؛ از فرودگاه تا آخرین روز سفر تنها نمی‌مانی.",
  },
  {
    icon: ShieldCheck,
    title: "بدون پرداخت آنلاین",
    text: "رزرو فقط با تماس انجام می‌شود و پولی را اینترنتی نمی‌گیریم. هر چه هست شفاف است و سندش را هم می‌گیری.",
  },
];

const featuredTours = TOURS.slice(0, 3);

export default function HomePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${SITE_NAME} | ${SITE_SLOGAN}`,
    itemListElement: TOURS.map((tour, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: tour.title,
      url: `${SITE_URL}/tours/${tour.slug}`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <HeroBlock
        badge="فقط تور تایلند"
        title={
          <>
            {SITE_NAME}
            <br />
            <span className="inline-block rounded-xl bg-brand/15 px-3 py-1.5 text-brand-foreground">
              {SITE_SLOGAN}
            </span>
          </>
        }
        description="سفر به تایلند را با مشاورهٔ تلفنی کارشناس مقصد شروع کن. ما فروش آنلاین نداریم؛ رزرو فقط با یک تماس انجام می‌شود."
        primary={{ label: `تماس با ${CONTACT_NAME}`, href: PHONE_MOBILE_LINK }}
        secondary={{ label: "دیدن تورها", href: "/tours" }}
      />

      <section className="mx-auto max-w-6xl px-6 py-14">
        <div className="flex items-end justify-between gap-4">
          <div>
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
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold sm:text-3xl">راهنمای سفر تایلند</h2>
            <p className="mt-2 text-muted-foreground">
              قبل از سفر بخوان؛ از انتخاب فصل سفر تا ویزا و مقایسهٔ جزیره‌ها.
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
          {GUIDES.map((guide) => (
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
              {CONTACT_NAME}، {CONTACT_TITLE.toLowerCase()}، خودش پاسخ‌گوی توست؛
              از انتخاب تور تا روز پرواز.
            </p>
          </div>
          <CardContent className="px-6 py-8 sm:px-10">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-lg font-bold">{CONTACT_NAME}</p>
              <p className="mt-1 text-sm text-muted-foreground">{CONTACT_TITLE}</p>
              <div className="mt-4 space-y-2 text-sm">
                <p>
                  <span className="text-muted-foreground">موبایل اصلی: </span>
                  <a
                    href={PHONE_MOBILE_LINK}
                    className="font-semibold underline underline-offset-4"
                  >
                    <span dir="ltr">{PHONE_MOBILE_DISPLAY}</span>
                  </a>
                </p>
                <p>
                  <span className="text-muted-foreground">تلفن ثابت: </span>
                  <span dir="ltr">{PHONE_LANDLINE_DISPLAY}</span>
                </p>
                <p className="text-muted-foreground">
                  {PHONE_CHANNELS_NOTE} | شنبه تا پنجشنبه، ۹ صبح تا ۹ شب
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
