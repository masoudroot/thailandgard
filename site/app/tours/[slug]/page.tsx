import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Check, Phone, X } from "lucide-react";
import { getTour, getTours, getGuide, getRelatedLinks, getSiteSettings } from "@/lib/db-content";
import { pageSeo, brandTitle } from "@/lib/og";
import { ogImageForSlug } from "@/lib/og-slugs";
import { TOUR_COVERS } from "@/lib/tour-covers";
import { fa, faNumber } from "@/lib/utils";
import { formatJalali } from "@/lib/jalali";
import { renderInlineLinks, stripInlineLinkMarkers } from "@/lib/inline-links";
import { CallButtons } from "@/components/site/CallButtons";
import { CallbackForm } from "@/components/site/CallbackForm";
import { CoverImage } from "@/components/site/CoverImage";
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

/**
 * رندر جواب FAQ تور (اسپک §۳، ۲۰ مهر ۱۴۰۵): اگر جواب چندخطی است، بولت‌های
 * تک‌خطی با جداکنندهٔ مویی (نشانگر سمت راست، شروع خط در RTL)؛ وگرنه همان
 * پاراگراف. ارقام فارسی و رجیستر «شما» با دادهٔ tour_faqs می‌آید
 * (مالکیت محتوا: content)؛ این‌جا فقط اسکلت است.
 */
function renderFaqAnswer(answer: string): ReactNode {
  const lines = answer.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return renderInlineLinks(answer);
  return (
    <ul className="divide-y divide-border">
      {lines.map((l, j) => (
        <li key={j} className="flex items-start gap-2.5 py-2.5 first:pt-0 last:pb-0">
          <span aria-hidden className="mt-3 size-1.5 shrink-0 rounded-full bg-muted-foreground/60" />
          <span className="leading-7">{renderInlineLinks(l)}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * JSON امن برای تزریق در ‎<script type="application/ld+json">‎: اگر متن DB
 * دنبالهٔ «<» خام داشته باشد (مثل ‎</script>‎)، می‌تواند تگ اسکریپت را بشکند؛
 * پس همهٔ «<»ها به ‎\u003c‎ تبدیل می‌شوند (چک امنیتی، ۲۰ مهر ۱۴۰۵).
 */
function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

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
  // تور محصول است نه مقاله (هندآف seocontent ۱۹:۰۰؛ S-023/S-027/S-029/S-035):
  // چهار شماره، یک ریشه؛ تک‌خطی همین‌جا بسته شد.
  const meta = pageSeo({
    title: brandTitle(tour.title),
    description: tour.summary,
    canonical: `/tours/${tour.slug}`,
    type: "website",
  });
  // S-003 (نقشهٔ سراسری og؛ اسپک og-per-slug-exec): اگر برای این اسلاگ
  // فایل og اختصاصی در public/images هست، همان می‌نشیند؛ وگرنه پیش‌فرض
  // سراسری og.ts می‌ماند. با رسیدن هر عکس، فقط فایل می‌نشیند و کد دست نمی‌خورد.
  const slugOg = ogImageForSlug(s.SITE_URL, slug);
  if (slugOg) {
    meta.openGraph = {
      ...meta.openGraph,
      images: [slugOg],
    };
    meta.twitter = {
      ...meta.twitter,
      images: [slugOg.url],
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
  // S-049 (مصوبهٔ ۱۸:۲۰، ۱۴۰۵/۰۷/۲۰): تور غیرفعال عرضه نمی‌شود؛
  // صفحهٔ جزئیاتش هم ۴۰۴ می‌دهد تا سیگنال «فعال و قابل‌فروش» ندهد.
  if (!tour.active) notFound();

  // کاور قاب قهرمان (اسپک mount §۳): اگر نگاشت نداشت، جای‌نگه‌دار
  // تایپوگرافیکِ هم‌شکل (تور ترکیبی؛ عکس ناجور ممنوع).
  const heroCover = TOUR_COVERS[tour.slug];

  // اقدام ۱ بریف آمیتیس (۲۰ مهر ۱۴۰۵)، قانون «تازگی قیمت»:
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
      answer: `قیمت پایه از ${faNumber(tour.priceFrom)} تومان؛ آخرین به‌روزرسانی: ${formatJalali(priceUpdatedAt as Date)}. برای قیمت به‌روز، با کارشناس مقصد تماس بگیرید.`,
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
    // S-046 حسابرس (۲۰ مهر ۱۴۰۵): itinerary خالی (numberOfItems: 0) ساختار مرده است؛
    // وقتی دادهٔ برنامهٔ روزبه‌روز هنوز نوشته نشده، کلید کلاً حذف می‌شود.
    ...(tour.itinerary.length > 0
      ? {
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
        }
      : {}),
    // قیمت از اسکیما حذف شد: صفحه خودش می‌گوید قیمت‌ها «قیمت پایه» و تقریبی‌اند
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
      // اسپک §۳: خط‌تیره‌های متن جواب در اسکیما به «؛» تبدیل می‌شوند
      acceptedAnswer: { "@type": "Answer", text: stripInlineLinkMarkers(f.answer).replace(/-/g, "؛") },
    })),
  };

  // بردکرامب JSON-LD: آینهٔ همان سه سطح بردکرامب بصری (خانه ← تورها ← عنوان کوتاه تور)
  // (دیف تیم سئو، ۰۷:۳۵؛ اجرا در ۰۹:۳۵)
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "خانه", item: `${s.SITE_URL}` },
      { "@type": "ListItem", position: 2, name: "تورها", item: `${s.SITE_URL}/tours` },
      { "@type": "ListItem", position: 3, name: tour.shortTitle, item: `${s.SITE_URL}/tours/${tour.slug}` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(tripJsonLd) }} />
      {/* S-045 حسابرس (۲۰ مهر ۱۴۰۵): بلاک FAQPage خالی نویز ساخت‌یافته است؛
          فقط وقتی سؤال واقعی هست (از tour_faqs یا FAQ قیمت تازه) رندر می‌شود. */}
      {faqs.length > 0 && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(faqJsonLd) }} />
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbJsonLd) }} />

      <div className="mx-auto max-w-5xl px-6 py-12">
        <Breadcrumb
          className="mb-6"
          items={[
            { label: "خانه", href: "/" },
            { label: "تورها", href: "/tours" },
            { label: tour.shortTitle },
          ]}
        />
        {/* قاب قهرمان تور (اسپک mount §۳، ۲۰ مهر ۱۴۰۵): یک قاب ۱۶:۱۰ با الگوی
            §۱ (قاب card، عکس Photo، ماسک سقف ۷۰٪ حکم ۶، جای‌نگه‌دار
            skeleton-reveal)؛ گالری چندقابی در این موج نیست. h1 روی ماسک
            می‌نشیند و از هدر متنی برداشته شد تا تک‌تگی h1 بماند. */}
        <div className="relative mb-6 aspect-[16/10] overflow-hidden rounded-surface border border-border">
          {heroCover ? (
            <CoverImage
              src={heroCover.src}
              alt={heroCover.alt}
              width={heroCover.w}
              height={heroCover.h}
              sizes="(max-width: 1024px) 100vw, 1024px"
            />
          ) : (
            // جای‌نگه‌دار هم‌شکل تایپوگرافیک (تور بدون کاور؛ عکس ناجور ممنوع)
            <div className="flex size-full items-center justify-center bg-secondary/50 p-6 text-center">
              <span className="font-display text-3xl text-foreground/70">{tour.shortTitle}</span>
            </div>
          )}
          {/* استثنای design-rules: جهت گرادیان ماسک خاصیت بصری است نه چیدمان */}
          <div aria-hidden className="absolute inset-0 bg-frame-mask-card" />
          <div className="absolute inset-x-0 bottom-0 space-y-2 p-5 sm:p-6">
            {/* یافتهٔ ۲ ممیزی وایب‌فارسی: فیل کهربایی + متن brand-foreground روی ماسک */}
            <Badge variant="brand" className="bg-brand text-brand-foreground">{tour.shortTitle}</Badge>
            <h1 className="font-display text-2xl text-foreground md:text-4xl">{tour.title}</h1>
          </div>
        </div>
        <header className="space-y-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {/* دیف A4 ممیزی design (۲۰ مهر ۱۴۰۵): بج نام تور خنثی می‌شود؛
                لهجهٔ کهربایی فقط برای بج مقصد/دسته روی ماسک می‌ماند */}
            <Badge variant="outline">{tour.shortTitle}</Badge>
            <span className="text-sm text-muted-foreground">
              {fa(tour.days)} روزه | {fa(tour.nights)} شب · {tour.route}
            </span>
          </div>
          {/* دیف A1 ممیزی design: leading خوانش بلند فارسی ۱٫۹ */}
          <p className="text-lg leading-[1.9]">{tour.summary}</p>
        </header>

        <Separator className="my-6" />

        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className="text-sm text-muted-foreground">قیمت پایه</p>
          <Price amount={tour.priceFrom} size="lg" />
        </div>

        <Alert variant="info" className="mt-4">
          قیمت‌ها «قیمت پایه» و تقریبی‌اند و با توجه به تاریخ سفر و ظرفیت هتل کمی تغییر می‌کنند.
          قیمت دقیق را کارشناس مقصد موقع تماس می‌گوید.
        </Alert>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg" variant="brand">
            <a href={s.PHONE_MOBILE_LINK} data-call-context="tour-page">
              <Phone />
              تماس با مشاور سفر
            </a>
          </Button>
          <Button asChild size="lg" variant="outline">
            <a href="#callback">تماس با مشاور سفر</a>
          </Button>
        </div>

        <div id="tour-hero-end" aria-hidden className="h-px" />

        <Separator className="my-8" />

        <section className="mt-8">
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

        <section className="mt-10">
          <h2 className="text-2xl sm:text-3xl">دربارهٔ تور {tour.shortTitle}</h2>
          <div className="mt-5 space-y-5">
            {tour.description.slice(0, 3).map((p, i) => (
              // چتر دیف A1 (یادداشت F-B4 ممیزی وایب‌فارسی): پاراگراف‌های بدنهٔ
              // «دربارهٔ تور» هم خوانش بلند فارسی‌اند؛ leading ۱٫۹.
              <p key={i} className="leading-[1.9] text-foreground/90">
                {renderInlineLinks(p)}
              </p>
            ))}
            {tour.description.length > 3 && (
              <Alert variant="info" title="نکتهٔ کارشناس">
                {tour.description.slice(3).map((p, i) => (
                  <p key={i} className="leading-[1.9] text-foreground/80">
                    {renderInlineLinks(p)}
                  </p>
                ))}
              </Alert>
            )}
          </div>
        </section>

        {tour.itinerary.length > 0 && (
          <section className="mt-8">
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
        )}

        {/* بلوک «پرسش‌های پرتکرار تور» (اسپک design، ۲۰ مهر ۱۴۰۵): داخل ستون
            محتوا، بلافاصله بعد از «برنامهٔ روزبه‌روز»؛ کارت‌های شامل/شامل‌نمی‌شود
            سر جای فعلی‌شان (بعد از FAQ) می‌مانند. */}
        <Separator className="my-10" />
        <div className="-mx-6">
          <FaqBlock
            title="پرسش‌های پرتکرار تور"
            description="هر سؤالی که دربارهٔ این تور دارید، این‌جا جوابش را می‌بینید. اگر نبود، همان پایین شماره‌تان را بگذارید."
            defaultOpen={[]}
            toggleIcon="plus-minus"
            contentBlock
            items={faqs.slice(0, priceFresh ? 4 : 5).map((f, i) => ({
              id: `faq-${i}`,
              title: f.question,
              content: renderFaqAnswer(f.answer),
            }))}
          />
        </div>

        {/* خط حقوقی لازم‌الاجرا (حکم برندینگ ۱۶:۰۰ + تصمیم مشترک artdir/vibefarsi):
            همیشه‌مرئی، خط جدا زیر بلوک FAQ، بیرون آکاردئون (ضد الگوی تاریک).
            متن نهایی: «این تور چارتر است و کنسلی ندارد.»
            وابستگی بیرونی: چارتر بودن هر ۴ تور هنوز نیازمند تأیید صریح فروش است. */}
        <p className="mt-8 border-t border-border pt-4 text-sm text-muted-foreground">
          این تور چارتر است و کنسلی ندارد.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
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

      {relatedGuides.length > 0 && guideBlock && (
        <section className="mx-auto mt-8 max-w-5xl px-6">
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

      {/* اقدام ۲ بریف S-010: لینک متقابل کنترل‌شده به راهنمای فصلی؛ فقط روی
          صفحهٔ تور پوکت و فقط در این بلوک جانبی (نه در مسیر خرید) تا تردید
          نسازد. انکر توصیفی = h1 تازهٔ راهنما. مقصد: تصمیم کانونیکال ۲۲:۴۵. */}
      {tour.slug === "phuket-7-days" && (
        <section className="mx-auto mt-8 max-w-5xl px-6">
          <Card>
            <CardContent className="pt-6">
              <p className="leading-[1.8] text-foreground/90">
                <span className="font-semibold">آب‌وهوا و رویدادهای اکتبر در پوکت:</span>{" "}
                اگر سفرتان به نیمهٔ دوم اکتبر می‌خورد،{" "}
                <Link href="/guide/phuket-in-october" className="font-semibold underline underline-offset-4">
                  راهنمای سفر به پوکت در نیمهٔ دوم اکتبر
                </Link>{" "}
                را ببینید؛ جشنوارهٔ گیاه‌خواران و بازگشایی سیمیلان همان هفته‌هاست.
              </p>
            </CardContent>
          </Card>
        </section>
      )}

      <div id="callback" className="mx-auto mt-12 max-w-5xl scroll-mt-24 px-6 pb-sticky-bar-clearance md:pb-16">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>تماس با مشاور سفر برای تور {tour.shortTitle}</CardTitle>
              <CardDescription>شماره‌تان را وارد کنید؛ در بازه‌ای که می‌گویید با شما تماس می‌گیریم.</CardDescription>
            </CardHeader>
            <CardContent>
              <CallbackForm tourSlug={tour.slug} tourTitle={tour.shortTitle} contactName={s.CONTACT_NAME} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>ترجیح می‌دهید خودتان زنگ بزنید؟</CardTitle>
              <CardDescription>مستقیم با کارشناس مقصد صحبت کنید یا در واتس‌اپ پیام بدهید.</CardDescription>
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
