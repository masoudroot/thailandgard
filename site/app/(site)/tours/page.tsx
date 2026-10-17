import type { Metadata } from "next";
import Link from "next/link";
import { Compass, LayoutGrid, MapPin, Phone, Route } from "lucide-react";
import { getTours, getSiteSettings } from "@/lib/db-content";
import { SITE_URL } from "@/lib/site";
import { pageSeo } from "@/lib/og";
import { fa, faNumber } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TourCard, canonicalTourOrder } from "@/components/site/TourCard";
import { HubStickyNav } from "@/components/site/HubStickyNav";
import { CtaBlock } from "@/components/blocks/cta";
import { FaqBlock } from "@/components/blocks/faq";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { TOUR_CATEGORIES, getCategory, getCategoryToursCached } from "@/lib/tour-categories";

export const metadata: Metadata = pageSeo({
  // ماتریس OG (هندآف seocontent ۱۷:۰۰؛ S-006/S-014): هر سه صفحهٔ استاتیک
  // از هلپر مشترک می‌آیند تا og:title/url/locale/type هیچ‌وقت جا نماند.
  // D-141/S-121 (هندآف content، چرخهٔ ۱۰): متای ۱۴۸ کاراکتری؛ نام سامویی/کرابی
  // را نمی‌برد پس با مصوبهٔ S-049 نمی‌شکند.
  title: "تورهای تایلند؛ مقایسه و انتخاب تور؛ تایلندگرد",
  description:
    "تورهای تایلندگرد را کنار هم مقایسه کن؛ پوکت، بانکوک و پاتایا و تور ترکیبی بانکوک و پوکت. قیمت‌ها «قیمت پایه» و تقریبی هستند؛ رزرو فقط با تماس تلفنی.",
  canonical: "/tours",
  type: "website",
});

/* ------------------------------------------------------------------ */
/* داده‌های نمایشی هاب (فاز ۲)؛ شمارش‌ها همه از getTours زنده می‌آیند  */
/* ------------------------------------------------------------------ */

const THEME_SLUG_ORDER = ["last-minute", "nowruz", "installment", "cheap"];

const THEME_LINES: Record<string, string> = {
  "last-minute": "برای کسانی که چمدانشان آماده است و تاریخ برایشان انعطاف دارد",
  nowruz: "برای کسانی که تعطیلات نوروز را در بهترین فصل تایلند می‌خواهند",
  installment: "برای کسانی که نمی‌خواهند یک‌جا هزینه کنند",
  cheap: "برای کسانی که با همان بودجه، بیشترین سفر را می‌خواهند",
};

const THEME_NAMES: Record<string, string> = {
  "last-minute": "لحظه‌آخری",
  nowruz: "نوروز",
  installment: "اقساطی",
  cheap: "ارزان",
};

const CITY_CARDS = [
  { slug: "phuket", name: "پوکت", epithet: "بزرگ‌ترین جزیره؛ ساحل‌های معروف و گشت فی‌فی" },
  { slug: "pattaya", name: "پاتایا", epithet: "ساحل نزدیک بانکوک؛ شهر و دریا در یک سفر" },
  { slug: "bangkok", name: "بانکوک", epithet: "پایتخت پرهیاهو؛ معابد طلایی و بازار شناور" },
  { slug: "samui", name: "سامویی", epithet: "جزیرهٔ آرام خلیج تایلند؛ انتخاب اول ماه‌عسل" },
  { slug: "krabi", name: "کرابی", epithet: "صخره‌های آهکی و ساحل بکر؛ خلوت‌تر و ارزان‌تر" },
  { slug: "chiang-mai", name: "چیانگ‌مای", epithet: "شمال فرهنگی؛ معابد قدیمی و طبیعت کوهستانی" },
  { slug: "huahin", name: "هواهین", epithet: "ساحل آرام نزدیک بانکوک؛ محبوب خانواده‌ها" },
  { slug: "phi-phi", name: "فی‌فی", epithet: "جزایر رویایی؛ با گشت یک‌روزه از پوکت" },
];

const COMBO_PICK = [
  { slug: "bangkok-pattaya", line: "محبوب‌ترین ترکیب؛ شهر و ساحل در یک سفر" },
  { slug: "bangkok-phuket", line: "پایتخت پرهیاهو با بزرگ‌ترین جزیرهٔ تایلند" },
  { slug: "phuket-samui", line: "دو جزیره، دو حال‌وهوا؛ انتخاب محبوب ماه‌عسل" },
  { slug: "bangkok-samui", line: "چند شب شهر، چند شب جزیرهٔ آرام" },
];

const PERSONAS = [
  {
    pain: "«اولین بار است می‌خواهم بروم»",
    ache: "تایلند را نمی‌شناسی و نمی‌خواهی چیزی را از دست بدهی.",
    suggestion: "ترکیب بانکوک و پاتایا؛ شهر و ساحل در یک سفر.",
    cta: "دیدن تور ترکیبی",
    href: "/tours/bangkok-pattaya",
  },
  {
    pain: "«بودجه‌ام محدود است»",
    ache: "می‌خواهی بروی ولی حسابت را هم نگه داری.",
    suggestion: "تورهای ارزان و لحظه‌آخری؛ بیشترین سفر با همان بودجه.",
    cta: "تورهای ارزان",
    href: "/tours/cheap",
  },
  {
    pain: "«ماه‌عسل می‌خواهم»",
    ache: "سفرتان باید خاص باشد، نه شلوغ و معمولی.",
    suggestion: "سامویی؛ جزیرهٔ آرام با ریزورت‌های بوتیک.",
    cta: "تور سامویی",
    href: "/tours/samui",
  },
  {
    pain: "«با بچه سفر می‌کنم»",
    ache: "بچه زود خسته می‌شود و برنامه باید راحت باشد.",
    suggestion: "ترکیب بانکوک و پاتایا؛ جابه‌جایی کوتاه و برنامهٔ خانوادگی.",
    cta: "تور پاتایا",
    href: "/tours/pattaya",
  },
];

/** سرخط یکدست بخش‌های هاب. */
function HubSectionHead({ title, desc }: { title: string; desc?: string }) {
  return (
    <div className="max-w-3xl">
      <h2 className="text-balance text-2xl sm:text-3xl">{title}</h2>
      {desc && <p className="mt-3 leading-[1.8] text-muted-foreground">{desc}</p>}
    </div>
  );
}

async function liveCount(slug: string): Promise<number> {
  const category = getCategory(slug);
  if (!category) return 0;
  return (await getCategoryToursCached(category)).length;
}

export default async function ToursPage() {
  const tours = await getTours();
  const s = await getSiteSettings();
  const gridTours = canonicalTourOrder(tours);

  // شمارش‌های زندهٔ هاب؛ همه از همان getTours صفحه (قانون صداقت عدد وایرفریم:
  // شمارش یا از دیتابیس می‌آید یا نشان داده نمی‌شود).
  const [themeCounts, cityCounts, comboCounts] = await Promise.all([
    Promise.all(THEME_SLUG_ORDER.map(liveCount)),
    Promise.all(CITY_CARDS.map((c) => liveCount(c.slug))),
    Promise.all(COMBO_PICK.map((c) => liveCount(c.slug))),
  ]);
  // تورهای ترکیبی فعال: اسلاگ در دسته‌های combo یا دارای پاهای مقصد.
  const comboTourSlugs = new Set(
    TOUR_CATEGORIES.filter((c) => c.kind === "combo").flatMap((c) => c.tourSlugs ?? []),
  );
  const comboTours = tours.filter(
    (t) => comboTourSlugs.has(t.slug) || (t.legs?.length ?? 0) > 0,
  );
  const prices = tours
    .map((t) => t.priceFrom)
    .filter((p): p is number => p != null);
  const minPrice = prices.length > 0 ? Math.min(...prices) : null;

  const familyCards = [
    {
      href: "#hub-themes",
      icon: Compass,
      name: "بر اساس حال‌وهوای سفر",
      desc: "لحظه‌آخری می‌خواهی، نوروزی، یا قسطی؟",
      badge: `${fa(THEME_SLUG_ORDER.length)} مسیر`,
    },
    {
      href: "#hub-cities",
      icon: MapPin,
      name: "بر اساس شهر",
      desc: "پوکت با پاتایا فرق دارد؛ اول شهرت را بشناس",
      badge: `${fa(CITY_CARDS.length)} شهر`,
    },
    {
      href: "#hub-combo",
      icon: Route,
      name: "ترکیبی: دو شهر، یک سفر",
      desc: "چرا فقط یک شهر؟",
      badge: comboTours.length > 0 ? `${fa(comboTours.length)} تور` : null,
    },
    {
      href: "#hub-all",
      icon: LayoutGrid,
      name: "همه تورهای تایلند",
      desc: "لیست کامل با قیمت به‌روز",
      badge: `${fa(tours.length)} تور فعال`,
    },
  ];

  // قانون ۳۷ اسکیما: ItemList همان آیتم‌های نمایشی گرید را دارد (نه بیشتر، نه کمتر).
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
      { "@type": "ListItem", position: 1, name: "خانه", item: SITE_URL.replace(/\/+$/, "") },
      { "@type": "ListItem", position: 2, name: "تور تایلند", item: `${SITE_URL}/tours` },
    ],
  };

  const faqItems = [
    {
      id: "hub-faq-price",
      q: "تور تایلند معمولاً چقدر درمی‌آید؟",
      a:
        minPrice != null
          ? `عدد ثابتی ندارد؛ به مقصد، فصل سفر، هتل و پرواز بستگی دارد. در حال حاضر ارزان‌ترین تور فعال ما ${faNumber(minPrice)} تومان قیمت پایه دارد و عدد نهایی را کارشناس مقصد با یک تماس مشخص می‌کند.`
          : "عدد ثابتی ندارد؛ به مقصد، فصل سفر، هتل و پرواز بستگی دارد. قیمت پایهٔ هر تور را کارشناس مقصد با یک تماس مشخص می‌کند.",
      href: "/tours/cheap",
      linkLabel: "تورهای ارزان تایلند",
    },
    {
      id: "hub-faq-season",
      q: "بهترین زمان سفر به تایلند کی است؟",
      a: "از آبان تا فروردین؛ هوا آفتابی و دریا آرام است. نوروز دقیقاً در همین بازه می‌افتد و به همین دلیل پرتقاضاترین فصل تور تایلند است؛ ظرفیتش زود پر می‌شود.",
      href: "/guide/best-time-to-visit-thailand",
      linkLabel: "راهنمای بهترین زمان سفر به تایلند",
    },
    {
      id: "hub-faq-lastminute",
      q: "تور لحظه‌آخری یعنی چه؟",
      a: "یعنی ظرفیت آخر پرواز و هتلی که تا چند روز دیگر می‌سوزد، ارزان‌تر فروخته می‌شود. همان هتل و همان پرواز است؛ فقط چون زمان فروش کم است قیمتش پایین‌تر آمده.",
      href: "/tours/last-minute",
      linkLabel: "تور لحظه‌آخری تایلند",
    },
    {
      id: "hub-faq-combo",
      q: "تور ترکیبی بهتر است یا تک‌مقصد؟",
      a: "اگر اولین سفرت است و می‌خواهی هم شهر ببینی هم ساحل، ترکیبی انتخاب بهتری است. اگر عاشق دریایی و آرامش می‌خواهی، یک جزیره مثل پوکت یا سامویی کافی است.",
      href: "/tours/combo",
      linkLabel: "تور ترکیبی تایلند",
    },
    {
      id: "hub-faq-visa",
      q: "ویزای تایلند چقدر طول می‌کشد؟",
      a: "ویزای توریستی تایلند معمولاً چند روز کاری طول می‌کشد؛ در فصل‌های شلوغ کمی کندتر جواب می‌دهند. مدارکت را زودتر آماده کن تا استرس نداشته باشی.",
      href: "/guide/thailand-visa-guide",
      linkLabel: "راهنمای ویزای تایلند",
    },
    {
      id: "hub-faq-installment",
      q: "می‌شود تور تایلند را اقساطی خرید؟",
      a: "بله؛ همهٔ تورهای فعال ما قابلیت پرداخت اقساطی دارند. تعداد اقساط، پیش‌پرداخت و مدارک لازم بسته به طرح فروش هر دوره فرق می‌کند؛ کارشناس در یک تماس همه را شفاف می‌گوید.",
      href: "/tours/installment",
      linkLabel: "تور اقساطی تایلند",
    },
    {
      id: "hub-faq-honeymoon",
      q: "برای ماه‌عسل کجای تایلند بهتر است؟",
      a: "سامویی؛ جزیره‌ای آرام در خلیج تایلند با ریزورت‌های بوتیک که انتخاب اول زوج‌هاست. ترکیب پوکت و سامویی هم بین ماه‌عسلی‌ها محبوب است.",
      href: "/tours/samui",
      linkLabel: "تور سامویی",
    },
  ];
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <main>
        {/* بخش ۱ وایرفریم: هیروی جمع‌وجور؛ H1 دقیقاً «تور تایلند». */}
        <div className="mx-auto max-w-6xl px-6 pt-12">
          <Breadcrumb
            className="mb-6"
            items={[{ label: "خانه", href: "/" }, { label: "تور تایلند" }]}
          />
          <header className="max-w-3xl space-y-4">
            <h1 className="text-balance text-3xl md:text-4xl">تور تایلند</h1>
            <p className="text-pretty leading-[1.8] text-muted-foreground">
              می‌خواهی بروی تایلند ولی نمی‌دانی از کجا شروع کنی؟ اشکالی ندارد؛ کار ما همین است.
              این‌جا نقشهٔ راه انتخاب تور است: بر اساس حال‌وهوای سفر، شهر مقصد، یا ترکیبی از هر دو.
            </p>
          </header>

          {/* بخش ۲ وایرفریم: ۴ کارت خانواده؛ هر کارت یک مسیر ورود + شمارش زنده. */}
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {familyCards.map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className="group rounded-surface border border-border bg-card p-5 transition-colors duration-200 hover:border-brand/60"
              >
                <card.icon aria-hidden className="size-7 text-brand-foreground" strokeWidth={1.5} />
                <h2 className="mt-3 text-lg font-semibold">{card.name}</h2>
                <p className="mt-1 text-sm leading-7 text-muted-foreground">{card.desc}</p>
                {card.badge && (
                  <Badge variant="brand" className="mt-3">
                    {card.badge}
                  </Badge>
                )}
              </Link>
            ))}
          </div>
        </div>

        {/* بخش ۳ وایرفریم: ناوبری چسبان؛ بعد از کارت‌ها می‌چسبد. */}
        <div className="mt-10">
          <HubStickyNav callHref={s.PHONE_MOBILE_LINK} />
        </div>

        <div className="mx-auto max-w-6xl space-y-16 px-6 py-12">
          {/* بخش ۴ وایرفریم: تم‌ها؛ نام + یک خط «به درد چه کسی می‌خورد» + شمارش. */}
          <section id="hub-themes" aria-labelledby="hub-themes-title" className="scroll-mt-24">
            <div className="max-w-3xl">
              <h2 id="hub-themes-title" className="text-balance text-2xl sm:text-3xl">
                با چه حال‌وهوایی سفر می‌کنی؟
              </h2>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {THEME_SLUG_ORDER.map((slug, i) => (
                <Link
                  key={slug}
                  href={`/tours/${slug}`}
                  className="group flex flex-col rounded-surface border border-border bg-card p-5 transition-colors duration-200 hover:border-brand/60"
                >
                  <h3 className="text-lg font-semibold">{THEME_NAMES[slug]}</h3>
                  <p className="mt-1 flex-1 text-sm leading-7 text-muted-foreground">
                    {THEME_LINES[slug]}
                  </p>
                  {themeCounts[i] > 0 && (
                    <Badge variant="brand" className="mt-3 self-start">
                      {fa(themeCounts[i])} تور
                    </Badge>
                  )}
                </Link>
              ))}
            </div>
          </section>

          {/* بخش ۵ وایرفریم: شهرها؛ نام + یک صفت ممیزه + شمارش. */}
          <section id="hub-cities" aria-labelledby="hub-cities-title" className="scroll-mt-24">
            <HubSectionHead
              title="کدام شهر تایلند؟"
              desc="هر شهر تایلند حال‌وهوای خودش را دارد؛ اول ببین کدام به سلیقه‌ات می‌خورد، بعد تورش را انتخاب کن."
            />
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {CITY_CARDS.map((city, i) => (
                <Link
                  key={city.slug}
                  href={`/tours/${city.slug}`}
                  className="group flex flex-col rounded-surface border border-border bg-card p-5 transition-colors duration-200 hover:border-brand/60"
                >
                  <h3 className="text-lg font-semibold">{city.name}</h3>
                  <p className="mt-1 flex-1 text-sm leading-7 text-muted-foreground">
                    {city.epithet}
                  </p>
                  {cityCounts[i] > 0 && (
                    <Badge variant="brand" className="mt-3 self-start">
                      {fa(cityCounts[i])} تور
                    </Badge>
                  )}
                </Link>
              ))}
            </div>
          </section>

          {/* بخش ۶ وایرفریم: ترکیبی؛ چند ترکیب منتخب + لینک هاب ترکیب. */}
          <section id="hub-combo" aria-labelledby="hub-combo-title" className="scroll-mt-24">
            <HubSectionHead
              title="دو شهر، یک سفر"
              desc="چرا فقط یک شهر؟ در یک سفر هم شهر ببین هم ساحل؛ جابه‌جایی بین شهرها هم در برنامهٔ تور است."
            />
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {COMBO_PICK.map((pick, i) => {
                const category = getCategory(pick.slug);
                if (!category) return null;
                return (
                  <Link
                    key={pick.slug}
                    href={`/tours/${pick.slug}`}
                    className="group flex items-center justify-between gap-4 rounded-surface border border-border bg-card p-5 transition-colors duration-200 hover:border-brand/60"
                  >
                    <div>
                      <h3 className="text-lg font-semibold">{category.name}</h3>
                      <p className="mt-1 text-sm leading-7 text-muted-foreground">{pick.line}</p>
                      {comboCounts[i] > 0 && (
                        <Badge variant="brand" className="mt-3">
                          {fa(comboCounts[i])} تور فعال
                        </Badge>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
            <div className="mt-6">
              <Button asChild variant="outline" className="rounded-full">
                <Link href="/tours/combo">دیدن همه ترکیب‌ها</Link>
              </Button>
            </div>
          </section>

          {/* بخش ۷ وایرفریم: بنر همه تورها؛ شمارش زنده + یک دکمه + گرید تورها. */}
          <section id="hub-all" aria-labelledby="hub-all-title" className="scroll-mt-24">
            <Card>
              <CardContent className="flex flex-col items-center gap-4 p-8 text-center sm:p-10">
                <p className="text-balance text-2xl sm:text-3xl">
                  <strong className="font-bold text-brand-foreground">{fa(tours.length)} تور فعال</strong>{" "}
                  با قیمت به‌روز
                </p>
                <p className="max-w-xl leading-[1.8] text-muted-foreground">
                  همه را کنار هم ببین؛ قیمت‌ها «قیمت پایه» هستند و عدد نهایی هر تور را کارشناس مقصد می‌گوید.
                </p>
                <Button asChild variant="brand" size="lg" className="rounded-full">
                  <a href="#hub-all-list">دیدن همه تورها</a>
                </Button>
              </CardContent>
            </Card>
            <div id="hub-all-list" className="mt-8 grid scroll-mt-24 gap-6 md:grid-cols-2">
              {gridTours.map((tour) => (
                <TourCard key={tour.slug} tour={tour} />
              ))}
            </div>
          </section>

          {/* جدول مقایسه (حفظ‌شده از نسخهٔ قبلی؛ بین بخش ۷ و ۸). */}
          <section aria-labelledby="hub-compare-title">
            <h2 id="hub-compare-title" className="text-balance text-2xl sm:text-3xl">مقایسهٔ تورهای تایلندگرد؛ هر ۳ تور کنار هم</h2>
            <div dir="rtl" className="mt-4 overflow-x-auto rounded-surface border border-border">
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    {/* D-197: گوشهٔ thead در اسکرول افقی موبایل sticky منطقی (start-0) + z-10 + پس‌زمینهٔ مات؛
                        الگوی D-184 تا سرستون با سطرهای چسبان هم‌تراز بماند. */}
                    <th scope="col" className="sticky start-0 z-10 border-b border-border bg-muted px-4 py-3 text-start">
                      <span className="sr-only">ویژگی</span>
                    </th>
                    {[
                      // D-183: ترتیب ستون‌ها همان ترتیب کانونی D-176 است (ترکیبی اول، بقیه با ترتیب موجود)؛
                      // مثل گرید کارت‌های خانه و /tours تا هر سه نمایشِ ۳ تور یک ترتیب داشته باشند.
                      { slug: "bangkok-phuket-8-days", name: "تور ترکیبی بانکوک و پوکت ۸ روزه", short: "بانکوک و پوکت" },
                      { slug: "bangkok-pattaya-8-days", name: "تور بانکوک و پاتایا ۸ روزه", short: "بانکوک و پاتایا" },
                      { slug: "phuket-7-days", name: "تور پوکت ۷ روزه", short: "پوکت" },
                      // D-185 (مصوبهٔ S-049، حکم ۰۵:۴۰؛ غیرفعال‌سازی ۱۱:۱۰): سامویی/کرابی از جدول حذف شدند.
                    ].map((t) => (
                      <th key={t.slug} scope="col" className="border-b border-border px-4 py-3 text-start align-top font-semibold">
                        {/* D-198: ارتفاع سرستون‌ها یکدست؛ نام و لینک هر کدام جعبهٔ دوخطی (min-h بر مبنای lh)
                            تا نام بلند دوخطی در برابر کوتاه تک‌خطی ارتفاع ناهموار نسازد. */}
                        <span className="block min-h-[2lh]">{t.name}</span>
                        <Link
                          href={`/tours/${t.slug}`}
                          className="mt-1 block min-h-[2lh] text-xs font-normal text-foreground underline decoration-brand/60 underline-offset-4 transition-[text-decoration-color] duration-200 hover:decoration-brand"
                        >
                          مشاهدهٔ جزئیات تور {t.short}
                        </Link>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      label: "قیمت پایه",
                      cells: ["۱۰۲٬۶۸۷٬۰۰۰ تومان", "۴۲٬۹۰۰٬۰۰۰ تومان", "۴۸٬۵۰۰٬۰۰۰ تومان"],
                    },
                    {
                      label: "مدت",
                      cells: ["۸ روز، ۷ شب", "۸ روز، ۷ شب", "۷ روز، ۶ شب"],
                    },
                    {
                      label: "مسیر",
                      cells: [
                        "تهران، بانکوک، پوکت، تهران",
                        "تهران، بانکوک، پاتایا، تهران",
                        "تهران، پوکت، تهران",
                      ],
                    },
                    {
                      label: "مناسب چه کسی",
                      cells: ["شهر و جزیره در یک سفر", "خانواده‌ها", "جزیره‌گردی کلاسیک"],
                    },
                    {
                      label: "حال‌وهوای سفر",
                      cells: [
                        "معابد بانکوک + ساحل و جزیره‌گردی پوکت",
                        "معابد و بازار شناور بانکوک + جزیرهٔ مرجان پاتایا",
                        "فی‌فی و خلیج فانگ‌نا با هتل ساحلی",
                      ],
                    },
                    {
                      label: "نکتهٔ مهم",
                      cells: [
                        "پرواز داخلی بانکوک به پوکت داخل پکیج است",
                        "ارزان‌ترین گزینهٔ فهرست",
                        "لیدر فارسی‌زبان همراه",
                      ],
                    },
                  ].map((row, k) => (
                    <tr key={row.label} className={k % 2 === 1 ? "bg-muted/20" : undefined}>
                      {/* D-184: سرستون سطرها در اسکرول افقی موبایل sticky منطقی (start-0؛ در راست‌به‌چپ ستون راست)
                          با پس‌زمینهٔ مات هم‌تراز با ردیف زبرا تا سلول‌های لغزان زیر آن دیده نشوند. */}
                      <th scope="row" className={`sticky start-0 z-10 whitespace-nowrap border-b border-border px-4 py-3 text-start font-semibold ${k % 2 === 1 ? "bg-muted" : "bg-background"}`}>
                        {row.label}
                      </th>
                      {row.cells.map((cell, j) => (
                        <td key={j} className="border-b border-border px-4 py-3 text-start tabular-nums">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <h3 className="mt-6 text-balance text-xl">اگر اینطورید، این را انتخاب کنید</h3>
            <ul className="mt-3 space-y-2 text-muted-foreground">
              <li>اولین سفرتان به تایلند است و می‌خواهید همه‌چیز را ببینید: <strong className="text-foreground">تور ترکیبی بانکوک و پوکت</strong>؛ شهر و جزیره در یک سفر.</li>
              <li>با خانواده و بچه سفر می‌کنید: <strong className="text-foreground">بانکوک و پاتایا</strong>؛ متنوع‌ترین برنامه با کمترین قیمت پایه.</li>
              <li>کلاسیک و مطمئن می‌خواهید: <strong className="text-foreground">پوکت</strong>؛ فی‌فی و فانگ‌نا که همه می‌شناسند.</li>
              {/* S-049 (غیرفعال‌سازی سامویی/کرابی، ۱۱:۱۰، ۲۱ مهر ۱۴۰۵): دو قلم توصیهٔ
                  «سامویی» و «کرابی» حذف شد چون تورشان فعال نیست؛ با متن تازهٔ content
                  جایگزین می‌شود. */}
            </ul>
            <p className="mt-4 text-sm text-muted-foreground">
              قیمت پایه یعنی شروع قیمت نمایشی؛ عدد نهایی هر تور با تماس مشخص می‌شود. در تور ترکیبی، پرواز بین‌المللی جداگانه حساب می‌شود.
            </p>
            <p className="mt-2">
              <Link href="/guide/compare-thailand-tours" className="font-semibold underline decoration-brand/60 underline-offset-4 transition-[text-decoration-color] duration-200 hover:decoration-brand">
                مقایسهٔ کامل تورهای تایلند
              </Link>
            </p>
          </section>

          {/* بخش ۸ وایرفریم: راهنمای انتخاب پرسونایی؛ درد + پیشنهاد + دکمه. */}
          <section id="hub-personas" aria-labelledby="hub-personas-title" className="scroll-mt-24">
            <HubSectionHead
              title="کدام تور به دردت می‌خورد؟"
              desc="مثل پنج دقیقهٔ اول جلسه با مشاور سفر: بگو چه جور مسافری هستی تا بگوییم کدام تور مال توست."
            />
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {PERSONAS.map((persona) => (
                <Card key={persona.href}>
                  <CardContent className="flex h-full flex-col p-5">
                    <h3 className="text-lg font-semibold">{persona.pain}</h3>
                    <p className="mt-1 text-sm leading-7 text-muted-foreground">{persona.ache}</p>
                    <p className="mt-3 flex-1 text-sm leading-7">
                      <strong className="font-semibold">پیشنهاد ما:</strong> {persona.suggestion}
                    </p>
                    <Button asChild variant="outline" className="mt-4 self-start rounded-full">
                      <Link href={persona.href}>{persona.cta}</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="mt-6 flex flex-col items-start gap-3 rounded-surface border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm leading-7 text-muted-foreground">
                هیچ‌کدام شبیه تو نیست؟ اشکالی ندارد؛ در یک تماس کوتاه می‌فهمیم چه می‌خواهی.
              </p>
              <Button asChild variant="brand" className="shrink-0 rounded-full">
                <a href={s.PHONE_MOBILE_LINK} data-call-context="hub-persona-fallback">
                  <Phone aria-hidden />
                  مشاوره رایگان
                </a>
              </Button>
            </div>
          </section>

          {/* بخش ۹ وایرفریم: سوالات متداول + اسکیمای FAQPage. */}
          <FaqBlock
            title="سوال‌های پرتکرار دربارهٔ تور تایلند"
            description="جواب کوتاه این‌جاست؛ برای توضیح کامل، هر سوال به صفحهٔ خودش لینک دارد."
            items={faqItems.map((item) => ({
              id: item.id,
              title: item.q,
              content: (
                <div className="space-y-3">
                  <p>{item.a}</p>
                  <p>
                    <Link
                      href={item.href}
                      className="font-semibold underline decoration-brand/60 underline-offset-4 transition-[text-decoration-color] duration-200 hover:decoration-brand"
                    >
                      توضیح کامل: {item.linkLabel}
                    </Link>
                  </p>
                </div>
              ),
            }))}
          />

          {/* بخش ۱۰ وایرفریم: CTA پایانی مشاوره. */}
          <section aria-labelledby="hub-cta-title">
            <Card>
              <CardContent className="flex flex-col items-center gap-4 p-8 text-center sm:p-10">
                <h2 id="hub-cta-title" className="text-balance text-2xl sm:text-3xl">
                  هنوز بین چندتا تور موندی؟
                </h2>
                <p className="max-w-xl leading-[1.8] text-muted-foreground">
                  ده دقیقه با یک مشاور تایلندگرد حرف بزن؛ رایگان است و آخرش مجبور به خرید نیستی.
                </p>
                <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                  <Button asChild size="lg" variant="brand" className="rounded-full">
                    <a href={s.PHONE_MOBILE_LINK} data-call-context="hub-final-cta">
                      <Phone aria-hidden />
                      تماس: <span dir="ltr">{s.PHONE_MOBILE_DISPLAY}</span>
                    </a>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="rounded-full">
                    <Link href="/contact#callback">درخواست تماس</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* باند CTA پایانی سراسری (حکم مدیر: فقط یک مسیر تماس). */}
          <CtaBlock
            title="با کارشناس مقصد حرف بزنید"
            description="تور موردنظرتان را پیدا نکردید؟ بگویید چه می‌خواهید؛ ما برنامه‌اش را می‌چینیم"
            action={<span dir="ltr">{s.PHONE_MOBILE_DISPLAY}</span>}
            actionHref={s.PHONE_MOBILE_LINK}
            callContext="tours-cta"
            note="زمان ترجیحی تماس را شما می‌گویید"
          />
        </div>
      </main>
    </>
  );
}
