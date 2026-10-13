import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Check, Phone, X } from "lucide-react";
import { getTour, getTours, getGuide, getRelatedLinks, getSiteSettings } from "@/lib/db-content";
import { isPriceFreshCached } from "@/lib/tours";
import { pageSeo, brandTitle } from "@/lib/og";
import { ogImageForSlug } from "@/lib/og-slugs";
import { TOUR_COVERS, TOUR_BODY_IMAGES } from "@/lib/tour-covers";
import { fa, faNumber } from "@/lib/utils";
import { formatJalali } from "@/lib/jalali";
import { resolveH1 } from "@/lib/seo-h1";
import { renderInlineLinks, stripInlineLinkMarkers } from "@/lib/inline-links";
import { CallButtons } from "@/components/site/CallButtons";
import { CallbackForm } from "@/components/site/CallbackForm";
import { LiveStatusChip } from "@/components/site/LiveStatusChip";
import { CoverImage } from "@/components/site/CoverImage";
import { RouteStrip } from "@/components/site/RouteStrip";
import { ShareButtons } from "@/components/site/ShareButtons";
import { YaldaBanner } from "@/components/site/YaldaBanner";
import { SmartTelLink } from "@/components/site/SmartTelLink";
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
        <li key={j} className="flex items-start gap-2 py-2.5 first:pt-0 last:pb-0">
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

  // کاور قاب قهرمان (اسپک mount §۳؛ D-127): نگاشت TOUR_COVERS حالا برای
  // همهٔ تورها (از جمله ترکیبی) کاور دارد؛ جای‌نگه‌دار فقط برای
  // اسلاگ‌های آینده نگه‌داشته شده.
  const heroCover = TOUR_COVERS[tour.slug];
  // قانون تک‌قانونی h1 (۲۱ مهر ۱۴۰۵): h1 کلمهٔ کلیدی صفحه است نه تکرار تایتل؛
  // اول ستون h1 دیتابیس، بعد نگاشت تأییدشده، وگرنه قاعدهٔ مشتق‌سازی.
  const h1 = resolveH1(tour.slug, tour.title, tour.h1);
  // اسلات تصویری بدنه MOB-S2 (اسپک موبایل ۲۱ مهر ۱۴۰۵): فقط با عکس واقعی
  // رندر می‌شود؛ فعلاً برای هیچ توری عکسی نیست (S-002 باز).
  const bodyImage = TOUR_BODY_IMAGES[tour.slug];

  // اقدام ۱ بریف آمیتیس (۲۰ مهر ۱۴۰۵)، قانون «تازگی قیمت»:
  // قیمت «نامشخص» است اگر price_from یا price_updated_at برابر NULL باشد یا
  // به‌روزرسانی قدیمی‌تر از ۷ روز باشد؛ در این حالت هیچ آیتم FAQ قیمتی
  // رندر نمی‌شود (نه در HTML، نه در اسکیمای FAQPage). فقط قیمت تازه،
  // آیتم اول FAQ می‌گیرد. اسکیمای TouristTrip/Offer دست نمی‌خورد.
  // تیم dev (۲۱ مهر ۱۴۰۵): محاسبهٔ تازگی با isPriceFreshCached انجام می‌شود
  // (پوشش «use cache» روی تابع خالص isPriceFresh در lib/tours.ts)؛ الگوی
  // مستند Next.js 16 برای Date.now در Cache Components. مقدار در پرریرندر
  // محاسبه و کش می‌شود تا روت کاملاً استاتیک بماند؛ با هر دیپلوی تازه
  // محاسبه می‌شود. connection() در سطح صفحه روت را داینامیک می‌کرد و بیلد
  // را می‌شکست، پس حذف شد.
  const faqs = [...tour.faqs];
  const priceFresh = await isPriceFreshCached(tour.priceFrom, tour.priceUpdatedAt);
  if (priceFresh && tour.priceFrom != null && tour.priceUpdatedAt != null) {
    const priceUpdatedAt = new Date(tour.priceUpdatedAt);
    faqs.unshift({
      question: `قیمت تور ${tour.title} چقدر است؟`,
      answer: `قیمت پایه از ${faNumber(tour.priceFrom)} تومان؛ آخرین به‌روزرسانی: ${formatJalali(priceUpdatedAt)}. برای قیمت به‌روز، با کارشناس مقصد تماس بگیرید.`,
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
    // S-177/S-174 (۲۱ مهر ۱۴۰۵): کاور اختصاصی تور در اسکیما هم می‌نشیند؛
    // بدون فیلد image شانس rich result تور کمتر می‌شود. URL مطلق.
    ...(heroCover ? { image: `${s.SITE_URL}${heroCover.src}` } : {}),
    touristType: tour.touristType,
    // S-046 حسابرس (۲۰ مهر ۱۴۰۵): itinerary خالی (numberOfItems: 0) ساختار مرده است؛
    // وقتی دادهٔ برنامهٔ روزبه‌روز هنوز نوشته نشده، کلید کلاً حذف می‌شود.
    // بلوکر (۲۱ مهر ۱۴۰۵): جدول tour_legs روی پروداکشن نیست (مایگریشن ۰۰۷ با
    // مدیر/مسعود)؛ «دادهٔ برنامهٔ روزبه‌روز از تیم محتوا نرسیده».
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
    // S-046 (بخش دوم؛ ۲۱ مهر ۱۴۰۵): آفر بدون قیمت شانس rich result قیمت را صفر
    // می‌کرد؛ حالا قیمت واقعی نمایشی صفحه (همان priceFrom) با واحد تومان
    // می‌نشیند. وقتی قیمت null است آفر فقط availability و url دارد.
    offers: {
      "@type": "Offer",
      availability: tour.active ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `${s.SITE_URL}/tours/${tour.slug}`,
      ...(tour.priceFrom != null
        ? { price: tour.priceFrom, priceCurrency: "IRT" }
        : {}),
    },
  };

  // باکس «پاسخ مستقیم» فیچر اسنیپت (کارت چرخهٔ ۰۶، بریف seocontent ۰۳:۳۵،
  // ۲۱ مهر ۱۴۰۵): فقط روی صفحهٔ تور ترکیبی؛ هم‌زمان در HTML و FAQPage.
  // بدون سطر تازه در tour_faqs تا در آکاردئون «پرسش‌های پرتکرار» تکرار نشود.
  const SNIPPET_QUESTION = "تور ترکیبی بانکوک و پوکت چند روزه است؟";
  const SNIPPET_ANSWER =
    "تور ترکیبی بانکوک و پوکت تایلندگرد ۸ روزه و ۷ شبه است؛ سه شب بانکوک با گشت شهری و بازار، چهار شب پوکت با ساحل و جزیره‌گردی. پرواز داخلی بانکوک به پوکت و ترانسفرها داخل پکیج است. قیمت صفحه فقط بخش دلاری را نشان می‌دهد و پرواز رفت‌وبرگشت تهران جدا حساب می‌شود.";

  // حکم ۴۳ design-ir (چرخهٔ ۱۰): جملهٔ اطمینان کنار خط حقوقی چارتر؛
  // متن نهایی با content است ؛ تا آن موقع null و جمله رندر نمی‌شود.
  const CHARTER_ASSURANCE_TEXT: string | null = null;

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      ...faqs.map((f) => ({
        "@type": "Question",
        name: f.question,
        // اسپک §۳: خط‌تیره‌های متن جواب در اسکیما به «؛» تبدیل می‌شوند
        acceptedAnswer: { "@type": "Answer", text: stripInlineLinkMarkers(f.answer).replace(/-/g, "؛") },
      })),
      // آیتم اسنیپت تور ترکیبی (بایت‌به‌بایت بریف)؛ فقط برای همین اسلاگ.
      ...(slug === "bangkok-phuket-8-days"
        ? [
            {
              "@type": "Question",
              name: SNIPPET_QUESTION,
              acceptedAnswer: { "@type": "Answer", text: SNIPPET_ANSWER },
            },
          ]
        : []),
    ],
  };

  // بردکرامب JSON-LD: آینهٔ همان سه سطح بردکرامب بصری (خانه ← تورها ← عنوان کوتاه تور)
  // (دیف تیم سئو، ۰۷:۳۵؛ اجرا در ۰۹:۳۵)
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      // S-005 (۲۱ مهر ۱۴۰۵): اسلش انتهایی برداشته شد تا با کنونیکال یکدست شود.
      { "@type": "ListItem", position: 1, name: "خانه", item: s.SITE_URL.replace(/\/+$/, "") },
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

      <main className="mx-auto max-w-5xl px-6 py-12">
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
            // جای‌نگه‌دار تایپوگرافیک (بند ۷ artdir + قلم ۲ اسپک موبایل، ۲۱ مهر ۱۴۰۵):
            // هیچ متن خوانایی ندارد؛ فقط موتیف تزئینی «حرف اول» نام تور با
            // aria-hidden (نه تیتر)؛ select-none تا انتخاب متن نشود (T-2 وایب‌فارسی).
            // پس‌زمینه توکن bg-frame-typographic است، نه گرادیان ادهاک.
            <div className="flex size-full select-none items-center justify-center bg-frame-typographic p-6 text-center">
              <span aria-hidden="true" className="font-display text-7xl text-foreground/15">
                {tour.shortTitle.trim().charAt(0)}
              </span>
            </div>
          )}
          {/* استثنای design-rules: جهت گرادیان ماسک خاصیت بصری است نه چیدمان */}
          <div aria-hidden className="absolute inset-0 bg-frame-mask-card" />
          <div className="absolute inset-x-0 bottom-0 space-y-2 p-5 sm:p-6">
            {/* یافتهٔ ۲ ممیزی وایب‌فارسی: فیل کهربایی + متن brand-foreground روی ماسک */}
            <Badge variant="brand" className="bg-brand text-brand-foreground">{tour.shortTitle}</Badge>
            <h1 className="font-display text-balance text-2xl text-foreground md:text-4xl">{h1}</h1>
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
          <p className="text-lg leading-[1.9] text-pretty">{tour.summary}</p>
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
            {/* قلم ۳ اسپک موبایل (۲۱ مهر ۱۴۰۵): خارج از ساعت کاری شماره‌گیری
                نمی‌کند؛ اسکرول نرم به فرم #callback. */}
            <SmartTelLink href={s.PHONE_MOBILE_LINK} callContext="tour-page">
              <Phone aria-hidden />
              تماس با مشاور سفر
            </SmartTelLink>
          </Button>
          <Button asChild size="lg" variant="outline">
            {/* قلم ۱ اسپک موبایل (قانون ۳۷ + حکم ۱۵ design-ir): برچسب فرعی
                «درخواست تماس» است، نه تکرار «تماس با مشاور سفر». */}
            <a href="#callback">درخواست تماس</a>
          </Button>
        </div>

        <div id="tour-hero-end" aria-hidden className="h-px" />

        {/* تاریخ انقضا: به‌روزرسانی هفتگی با content */}
        {slug === "bangkok-pattaya-8-days" && (
          <Alert variant="info" title="وضعیت امروز پاتایا" className="mt-8">
            ساحل پاتایا پس از سیل تابستان پاک‌سازی و برای پذیرش گردشگر آماده اعلام شده است. این اطلاعیه در ۲۱ مهر ۱۴۰۵ نوشته شده و هر هفته با تورسینک به‌روزرسانی می‌شود؛ پیش از رزرو، آخرین وضعیت را از کارشناس مقصد بپرسید.
          </Alert>
        )}

        <Separator className="my-8" />

        <section className="mt-10">
          <h2 className="text-balance text-center text-2xl sm:text-start sm:text-3xl">چرا این تور؟</h2>
          <ul className="mt-5 space-y-3">
            {tour.highlights.map((h) => (
              <li key={h} className="flex items-start gap-2">
                <Check aria-hidden className="mt-1 size-5 shrink-0 text-success-text" />
                <span className="leading-7">{h}</span>
              </li>
            ))}
          </ul>
          {/* یافتهٔ ۳ seocontent (چرخهٔ ۱۰): لینک داخلی به راهنمای تصمیم؛
              انتهای بخش «چرا این تور؟» چون بخش پاراگراف ندارد (لیست هایلایت‌هاست). */}
          <p className="mt-4 leading-7 text-foreground/90">
            اگر هنوز بین تورها مرددید،{" "}
            <Link href="/guide/compare-thailand-tours" className="underline decoration-brand/60 underline-offset-4 transition-[text-decoration-color] duration-200 hover:decoration-brand">
              مقایسهٔ کامل تورهای تایلند
            </Link>{" "}
            را ببینید.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-balance text-2xl sm:text-3xl">دربارهٔ تور {tour.shortTitle}</h2>
          <div className="mt-5 space-y-5">
            {tour.description.slice(0, 3).map((p, i) => (
              // چتر دیف A1 (یادداشت F-B4 ممیزی وایب‌فارسی): پاراگراف‌های بدنهٔ
              // «دربارهٔ تور» هم خوانش بلند فارسی‌اند؛ leading ۱٫۹.
              <p key={i} className="leading-[1.9] text-pretty text-foreground/90">
                {renderInlineLinks(p)}
              </p>
            ))}
            {tour.description.length > 3 && (
              <Alert variant="info" title="نکتهٔ کارشناس">
                {tour.description.slice(3).map((p, i) => (
                  <p key={i} className="leading-[1.9] text-pretty text-foreground/80">
                    {renderInlineLinks(p)}
                  </p>
                ))}
              </Alert>
            )}
          </div>
        </section>

        {/* اسلات تصویری بدنه MOB-S2 (اسپک موبایل ۲۱ مهر ۱۴۰۵): قاب ۱۶:۱۰
            تمام‌عرض بین «دربارهٔ تور» و «برنامهٔ روزبه‌روز»؛ فقط وقتی عکس
            واقعی رسید رندر می‌شود وگرنه هیچ فضایی رزرو نمی‌شود. */}
        {bodyImage && (
          <figure className="mt-10 overflow-hidden rounded-surface border border-border">
            <CoverImage
              src={bodyImage.src}
              alt={bodyImage.alt}
              width={bodyImage.w}
              height={bodyImage.h}
              sizes="(max-width: 1024px) 100vw, 1024px"
              className="aspect-[16/10] w-full"
            />
          </figure>
        )}

        {/* باکس «پاسخ مستقیم» فیچر اسنیپت (بریف seocontent ۰۳:۳۵): همیشه‌مرئی،
            بین «دربارهٔ تور» و «برنامهٔ روزبه‌روز»؛ فقط برای همین اسلاگ. */}
        {slug === "bangkok-phuket-8-days" && (
          <section className="mt-10">
            <h2 className="text-balance text-2xl sm:text-3xl">{SNIPPET_QUESTION}</h2>
            <p className="mt-5 leading-[1.9] text-foreground/90">{SNIPPET_ANSWER}</p>
          </section>
        )}

        {/* نوار افقی مسیر تور ترکیبی (H1 هندآف design، اجرای ۰۸، ۲۱ مهر ۱۴۰۵):
            mount رجیستری امروز؛ §۶ اسپک + حکم artdir + حکم ۳۴ design-ir.
            فقط روی همین اسلاگ؛ بالای بخش روزبه‌روز. */}
        {slug === "bangkok-phuket-8-days" && (
          <section aria-label="مسیر سفر" className="mt-10">
            <h2 className="text-balance text-2xl sm:text-3xl">مسیر این تور</h2>
            <div className="mt-5">
              <RouteStrip dayCount={tour.itinerary.length} />
            </div>
          </section>
        )}

        {tour.itinerary.length > 0 && (
          <section id="itinerary" className="mt-10 scroll-mt-24">
            <h2 className="text-balance text-2xl sm:text-3xl">برنامهٔ روزبه‌روز</h2>
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
            وابستگی بیرونی: چارتر بودن هر ۴ تور هنوز نیازمند تأیید صریح فروش است.
            حکم ۴۳ design-ir (چرخهٔ ۱۰): کنار خط حقوقی، جملهٔ اطمینان با نامِ
            دغدغه می‌آید («خیالتان آسوده»)؛ متن نهایی با content است. */}
        <p className="mt-8 border-t border-border pt-4 text-sm text-muted-foreground">
          این تور چارتر است و کنسلی ندارد.
        </p>
        {CHARTER_ASSURANCE_TEXT && (
          <p className="mt-2 text-sm leading-7 text-foreground/80">
            {CHARTER_ASSURANCE_TEXT}
          </p>
        )}

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>شامل می‌شود</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2.5">
                {tour.includes.map((i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check aria-hidden className="mt-1 size-5 shrink-0 text-success-text" />
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
                  <li key={e} className="flex items-start gap-2">
                    <X aria-hidden className="mt-1 size-5 shrink-0 text-destructive" />
                    <span className="text-sm leading-7">{e}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </main>

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
                      className="underline decoration-brand/60 underline-offset-4 transition-[text-decoration-color] duration-200 hover:decoration-brand"
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
                <Link href="/guide/phuket-in-october" className="underline decoration-brand/60 underline-offset-4 transition-[text-decoration-color] duration-200 hover:decoration-brand">
                  راهنمای سفر به پوکت در نیمهٔ دوم اکتبر
                </Link>{" "}
                را ببینید؛ جشنوارهٔ گیاه‌خواران و بازگشایی سیمیلان همان هفته‌هاست.
              </p>
            </CardContent>
          </Card>
        </section>
      )}

      {/* بنر یلدا قالب ب (H6 هندآف design، اجرای ۰۸، ۲۱ مهر ۱۴۰۵):
          مستطیلی درون‌صفحه‌ای؛ فقط روی صفحهٔ تور ترکیبی (۷ شب؛ بانکوک + پوکت)
          که موضوع بنر است؛ پیش از بخش تماس. */}
      {slug === "bangkok-phuket-8-days" && (
        <div className="mx-auto mt-8 max-w-5xl px-6">
          <YaldaBanner />
        </div>
      )}

      <div id="callback" className="mx-auto mt-12 max-w-5xl scroll-mt-24 px-6 pb-sticky-bar-clearance md:pb-16">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-balance">تماس با مشاور سفر برای تور {tour.shortTitle}</CardTitle>
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
              {/* نشانگر زندهٔ وضعیت پاسخ‌گویی (پیشنهاد lead، ۲۱ مهر ۱۴۰۵): کنار دکمهٔ تماس. */}
              <LiveStatusChip className="mb-4" />
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
