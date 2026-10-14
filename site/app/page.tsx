import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Clock, Compass, Phone, PhoneCall, ShieldCheck, Users } from "lucide-react";
import { HeroCapsule } from "@/components/site/HeroCapsule";
import { SeasonBanner } from "@/components/site/SeasonBanner";
import { ThailandGazeGallery } from "@/components/site/ThailandGazeGallery";
import { DestinationCards } from "@/components/site/DestinationCards";
import { TrustStrip } from "@/components/site/TrustStrip";
import { TourCard, canonicalTourOrder } from "@/components/site/TourCard";
import { FeatureSplit } from "@/components/blocks/feature-split";
import { StepsBlock } from "@/components/blocks/steps-block";
import { Separator } from "@/components/ui/separator";
import { CoverImage } from "@/components/site/CoverImage";
import { GUIDE_COVERS } from "@/lib/guide-covers";
import { Reveal } from "@/components/animations/reveal";
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
import { pageSeo, displayTitle } from "@/lib/og";
import { fa } from "@/lib/utils";
import { updatedFaToIso } from "@/lib/jalali";

export const metadata: Metadata = pageSeo({
  title: "تور تایلند؛ سفر تخصصی با مشاور تلفنی؛ تایلندگرد",
  // S-109 (هندآف seocontent، اجرای ۱۱، ۲۱ مهر ۱۴۰۵): پس از بسته‌شدن S-049
  // (غیرفعال‌سازی سامویی/کرابی، ۱۱:۱۰) هر دو کاندیدای قبلی منقضی شدند؛
  // متای تازه با تورهای فعال (پوکت، بانکوک و پاتایا، ترکیبی بانکوک و پوکت).
  // کاندیدای content (توصیهٔ هندآف) با یک جایگزینی: «کارشناس مقصد» ← «مشاور سفر»
  // طبق تصمیم ایستای مسعود (۱۶:۳۵) و تنش ثبت‌شده (داوری مسعود در انتظار)؛ ۱۴۷ کاراکتر.
  description:
    "تور تایلند تخصصی از تهران؛ تورهای پوکت، بانکوک و پاتایا و تور ترکیبی بانکوک و پوکت با لیدر فارسی‌زبان. برای مشاوره و رزرو با مشاور سفر تماس بگیرید.",
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
    text: "رزرو فقط تلفنی است؛ اینترنتی پول نمی‌گیریم. هر چه هست شفاف است و سندش را هم می‌گیرید.",
  },
];

export default async function HomePage() {
  const [tours, guides, s] = await Promise.all([getTours(), getGuides(), getSiteSettings()]);
  // D-176: همان ترتیب کانونی کارت‌ها که گرید /tours هم دارد (ترکیبی اول)؛
  // خانه فقط ۳ تای اول را نشان می‌دهد.
  const featuredTours = canonicalTourOrder(tours).slice(0, 3);
  // D-107: خانه فقط ۶ راهنمای اول را نشان می‌دهد (گرید ۳ ستونه، ۲ ردیف)؛
  // بقیه پشت دکمهٔ «همهٔ راهنماها» در /guide می‌مانند تا سکشن سبک بماند.
  const featuredGuides = guides.slice(0, 6);

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
  // S-105 (حسابرس سئو، ۲۱ مهر ۱۴۰۵): خانه BreadcrumbList نداشت درحالی‌که
  // /tours و صفحهٔ تور و /guide هر سه دارند؛ تک‌آیتمی «خانه» تا نقشهٔ
  // ناوبری ساخت‌یافته روی مهم‌ترین صفحه هم کامل باشد.
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [{ "@type": "ListItem", position: 1, name: "خانه", item: s.SITE_URL.replace(/\/+$/, "") }], // S-005: بدون اسلش انتهایی، هم‌خوان با کنونیکال
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <main>

      {/* کپسول عملیاتی هیرو در اسلات هیروی خانه (دستور :۳۵، ۲۰ مهر ۱۴۰۵؛ مأموریت بصری).
          بنر الف (کمپین «پنجرهٔ اکتبر») فعلاً از اسلات خارج شد؛ فایل OctoberBanner سر جایش است. */}
      <HeroCapsule
        phoneHref={s.PHONE_MOBILE_LINK}
        phoneLabel="تماس با مشاور سفر"
        whatsappHref={s.WHATSAPP_LINK}
      />

      {/* D-195 (۱۴۰۵/۰۷/۲۱، نبض دیزاین): py-10 ← py-8 تا با تراکم تازهٔ هیرو
          (HeroCapsule py-12) ریتم هیرو/تورها به ~۱۵۰px برسد. */}
      <section className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0 flex-1">
            {/* S-102 (هندآف seo، اجرای ۰۸، ۲۱ مهر ۱۴۰۵): «تور تایلند» در
                اولین h2 و لید خانه؛ h1 («تایلند رو با متخصصش بگرد.») دست
                نخورد (تصمیم مسعود). */}
            <h2 className="text-balance text-2xl sm:text-3xl">پیشنهادهای تور تایلند</h2>
            <p className="mt-2 text-muted-foreground">
              تور تایلند، تخصص تایلندگرد است؛ محبوب‌ترین تورها را با قیمت پایه و جزئیات کامل هر سفر ببینید.
            </p>
          </div>
          <Button asChild variant="outline" className="shrink-0">
            <Link href="/tours">
              همهٔ تورها
              <ArrowLeft aria-hidden />
            </Link>
          </Button>
        </div>
        {/* قلم ۶ اسپک (یافتهٔ تطبیق): گرید کارت‌ها در animations/reveal بایت‌به‌بایت پیچیده شد؛
            تنشِ «حکم ۵ می‌گوید دست نزنید» با واقعیت (هیچ reveal روی گرید نبود) به نفع واقعیت حل شد. */}
        <Reveal className="mt-8 grid gap-6 duration-(--motion) sm:grid-cols-2 lg:grid-cols-3">
          {featuredTours.map((tour) => (
            <TourCard key={tour.slug} tour={tour} />
          ))}
        </Reveal>
      </section>

      {/* بلوک «کجا برویم؟» (اسپک design چرخهٔ ۱۲؛ حکم‌های ۵۲ تا ۵۶ design-ir):
          mount زیر گرید تورهای خانه، قبل از گالری. کاورها قاب تایپوگرافیک‌اند
          (حکم ۵۲: بدون فایل تور/گالری)؛ کپی توصیف‌ها موقت و نهایی‌اش با content. */}
      <DestinationCards />

      {/* گالری «تایلند در یک نگاه» (تغییر بصری امروز، ۲۱ مهر ۱۴۰۵؛ اسپک گالری اجرای ۱۱؛
          حکم‌های ۴۶ تا ۴۹ design-ir اعمال شده‌اند). mount بعد از گرید تورها،
          قبل از سکشن تور ترکیبی؛ تمام‌عرض (تیتر داخل کانتینر خود کامپوننت). */}
      <ThailandGazeGallery />

      {/* سکشن «تور ترکیبی بانکوک و پوکت» (اسپک ۱۴۰۵/۰۷/۲۱ §۱؛ حکم‌های ۲۱ و ۲۲ design-ir):
          تیتر «بانکوک و پوکت.»، description با «در یک سفر». */}
      <FeatureSplit items={[{
        eyebrow: "ترکیبی جدید",
        title: "بانکوک و پوکت.",
        description: "۸ روز و ۷ شب در یک سفر: ۳ شب بانکوک با ضرب‌آهنگ شهر، ۴ شب پوکت با ضرب‌آهنگ ساحل.",
        bullets: [
          "یک سفر، دو حال‌وهوا؛ بدون دردسر جابه‌جایی داخلی",
          "مشاورهٔ رایگان پیش از خرید",
          "قیمت شفاف، بدون هزینهٔ پنهان",
          "پشتیبانی فارسی‌زبان در مقصد",
        ],
        media: (
          <img
            src="/images/hero-phuket-sunset.webp"
            alt="غروب ساحل پوکت"
            loading="lazy"
            decoding="async"
            className="size-full object-cover"
          />
        ),
      }]} />
      {/* بلوک قیمت + CTA + بلوک حقوقی (اسپک §۱.۴): زیر ردیف ترکیبی؛ قانون
          عدد/لیبل (لیبل «از» راست، عدد چپ). قیمت هیچ لهجهٔ کهربایی ندارد. */}
      {/* D-174 (تراکم عمودی ۱۴۰۵/۰۷/۲۱): شکاف ۱۰۴px بین بلوک حقوقی و بنر ب
          شل بود؛ pb-16 ← pb-8 و رپر بنر py-10 ← py-6 تا ریتم به ~۵۶px برسد. */}
      <div className="mx-auto max-w-5xl px-6 pb-8 -mt-8">
        {/* چسبندگی قیمت به سکشن (قاعدهٔ ممیزی ۰۵:۰۵، ایراد ۵): بلوک قیمتِ سکشن
            حداکثر mt-8 از بدنهٔ همان سکشن فاصله می‌گیرد. */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="text-sm text-muted-foreground">از</span>
          <span className="text-2xl tabular-nums">۱۰۲٬۶۸۷٬۰۰۰</span>
          <span className="text-sm text-muted-foreground">تومان</span>
          <span className="text-sm text-muted-foreground">هر نفر</span>
        </div>
        {/* برچسب خنثی زیر قیمت (حکم برندینگ چرخهٔ ۰۹، یافتهٔ ۵؛ جانشین حکم ۲۳ design-ir) */}
        <p className="mt-2 text-sm text-muted-foreground">قیمت را هر روز با نرخ دلار به‌روز می‌کنیم.</p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button asChild variant="brand">
            <a href={s.PHONE_MOBILE_LINK} data-call-context="home-combo">
              <Phone aria-hidden />
              تماس با مشاور سفر
            </a>
          </Button>
          <Button asChild variant="outline">
            <Link href="/tours/bangkok-phuket-8-days">
              جزئیات تور
              <ArrowLeft aria-hidden />
            </Link>
          </Button>
        </div>
        {/* بلوک حقوقی (متن لازم‌الاجرای برندینگ): mt-6 و جداکنندهٔ مویی بالای بلوک */}
        <div className="mt-6">
          <Separator />
          <p className="mt-6 text-sm text-muted-foreground">
            این تور چارتر است و کنسلی ندارد. پرواز رفت‌وبرگشت جداگانه محاسبه می‌شود.
          </p>
        </div>
      </div>

      {/* بنر ب (بین‌سکشنی)؛ حکم ۴. D-174: py-10 ← py-6 برای ریتم فشرده‌تر؛ D-208: کپسول تمام‌عرض ← ستون محتوا (max-w-6xl هم‌تراز سکشن بعدی). */}
      <div className="mx-auto max-w-6xl px-6 py-6">
        <SeasonBanner />
      </div>

      <section className="border-y border-border bg-muted/40">
        {/* D-258 (۱۴۰۵/۰۷/۲۱، نبض دیزاین): py-10 ← py-12؛ هم‌ریتم با سکشن‌های خانه (D-195/D-245) */}
        <div className="mx-auto max-w-6xl px-6 py-12">
          <h2 className="text-balance text-center text-2xl sm:text-3xl">
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
                    <Icon aria-hidden className="size-5" />
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

      {/* بلوک «رزرو تلفنی در سه قدم» (حکم ۱۹ design-ir: رجیستر «شما»
          عین حکم برند ۱۴۰۵/۰۷/۲۱؛ گیت پیاده‌سازی برداشته شد).
          نسخهٔ ۲ (حکم ۴ برندینگ، noon-verdicts-cycle12، اجرای ۰۸، ۲۱ مهر ۱۴۰۵):
          جانشین جدول §۱ اسپک booking-steps-register-exec-2026-10-13-07.md */}
      <StepsBlock
        eyebrow="رزرو تلفنی"
        title="رزرو سفر در سه قدم"
        gridClassName="md:grid-cols-3"
        connectorClassName="hidden md:block"
        steps={[
          { title: "تماس با مشاور", description: "شماره را بگیرید؛ مشاور فارسی‌زبان، تورِ مناسبِ بودجه و تاریخ‌تان را پیشنهاد می‌دهد." },
          { title: "انتخاب تور و تاریخ", description: "قیمت روز و ظرفیت چارتر را دقیق می‌شنوید؛ هیچ هزینه‌ای پنهان نیست." },
          { title: "ثبت و پرداخت", description: "پرداخت را نهایی می‌کنید؛ رسید رسمی و واچر سفر را همان‌جا می‌گیرید." },
        ]}
      />
      {/* CTA زیر قدم‌ها (وسط‌چین؛ حکم ۲۰: لیبل واحد «تماس با مشاور سفر») */}
      {/* D-628 (۱۴۰۵/۰۷/۲۲، نبض دیزاین): pb-16 ← pb-12؛ شکاف ۱۱۲px (۶۴+۴۸) با سکشن راهنما
          بالای استاندارد ۹۶px سکشن‌ها بود و رationale نداشت؛ ریتم یکدست ۹۶px. */}
      <div className="mx-auto max-w-5xl px-6 pb-12">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild variant="brand">
            <a href={s.PHONE_MOBILE_LINK} data-call-context="home-steps">
              <Phone aria-hidden />
              تماس با مشاور سفر
            </a>
          </Button>
          <Button asChild variant="outline">
            <Link href="/contact">
              درخواست مشاوره
              <ArrowLeft aria-hidden />
            </Link>
          </Button>
        </div>
      </div>

      {/* D-258 (۱۴۰۵/۰۷/۲۱، نبض دیزاین): py-10 ← py-12؛ هم‌ریتم با سکشن‌های خانه (D-195/D-245) */}
      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0 flex-1">
            {/* D-095: تیتر بخش با محتوای واقعی‌اش یکی شد (راهنما + اخبار سفر) */}
            <h2 className="text-balance text-2xl sm:text-3xl">راهنما و اخبار سفر تایلند</h2>
            <p className="mt-2 text-muted-foreground">
              قبل از سفر بخوان؛ از{" "}
              <Link href="/guide/best-time-to-visit-thailand" className="underline decoration-brand/60 underline-offset-4 transition-[text-decoration-color] duration-200 hover:decoration-brand">بهترین زمان سفر به تایلند</Link>{" "}
              تا{" "}
              <Link href="/guide/thailand-visa-guide" className="underline decoration-brand/60 underline-offset-4 transition-[text-decoration-color] duration-200 hover:decoration-brand">ویزای تایلند</Link>{" "}
              و{" "}
              <Link href="/guide/phuket-vs-samui" className="underline decoration-brand/60 underline-offset-4 transition-[text-decoration-color] duration-200 hover:decoration-brand">مقایسهٔ پوکت و سامویی</Link>.
            </p>
          </div>
          <Button asChild variant="outline" className="shrink-0">
            <Link href="/guide">
              همهٔ راهنماها
              <ArrowLeft aria-hidden />
            </Link>
          </Button>
        </div>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featuredGuides.map((guide) => {
            const cover = GUIDE_COVERS[guide.slug];
            return (
            <Link key={guide.slug} href={`/guide/${guide.slug}`} className="group block h-full" aria-label={displayTitle(guide.title)}>
              <Card className="flex h-full flex-col overflow-hidden transition-colors duration-(--motion) group-hover:border-brand/60">
                {/* D-083: اسلات تصویری S5 (همان الگوی app/guide/page.tsx): قاب ۱۶:۱۰ +
                    ماسک graphite-soft از پایین؛ راهنمای بدون کاور جای‌نگه‌دار
                    تایپوگرافیک می‌گیرد، عکس ناجور ممنوع */}
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
                    <div className="flex size-full flex-col items-center justify-center gap-3 bg-secondary/40 p-6 text-center">
                      {/* D-117: پوستر تایپوگرافیک عمدی با همان ریتم قاب عکسی
                          (لوزی کهربایی + عنوان نمایشی + خط‌حایل مویی) تا دو
                          تیمار کارت‌های بخش یکی شود و حس نیمه‌تمام برود */}
                      <span className="size-1.5 rotate-45 bg-brand/60" />
                      <span className="font-display text-2xl leading-relaxed text-foreground/55">{displayTitle(guide.title)}</span>
                      <span className="h-px w-12 bg-border" />
                    </div>
                  )}
                  {/* D-207: ماسک روشن تمام‌قاب روی عکس، هالهٔ سفید کثیف دور تیتر می‌ساخت؛
                      اسکریم تیرهٔ محدود به پایین قاب + تیتر سفید ساده (الگوی Card/Media) */}
                  {cover ? (
                    <div aria-hidden className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
                  ) : (
                    <div aria-hidden className="absolute inset-0 bg-frame-mask-card" />
                  )}
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <Badge variant="brand" className="bg-brand text-brand-foreground">{guide.category}</Badge>
                    {/* D-121: روی کارت‌های متنی تیتر فقط در پوستر تایپوگرافیک D-117 می‌آید؛
                        رندر دوم این‌جا حذف شد تا همان متن دو بار رندر نشود */}
                    {cover ? <CardTitle className="mt-2 text-balance text-xl text-white">{displayTitle(guide.title)}</CardTitle> : null}
                  </div>
                </div>
                <CardContent className="flex flex-1 flex-col gap-4 p-5">
                  <p className="text-sm leading-7 text-muted-foreground">{guide.excerpt}</p>
                  <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-4 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock aria-hidden className="size-3.5" />
                      {fa(guide.readingMinutes)} دقیقه مطالعه
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays aria-hidden className="size-3.5" />
                      به‌روزرسانی: <time dateTime={updatedFaToIso(guide.updatedFa) ?? undefined}>{guide.updatedFa}</time>
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
            );
          })}
        </div>
      </section>

      {/* نوار اعتماد «چرا تایلندگرد» (اسپک design چرخهٔ ۱۲؛ حکم‌های ۵۷/۵۸ design-ir):
          mount بلافاصله قبل از سکشن فرم تماس. گزاره‌ها موقت‌اند (جهت‌های design-ir)؛
          بازنویسی نهایی با branding + چک هم‌پوشانی با سکشن «چرا تایلندگرد» (حکم ۵۸). */}
      <TrustStrip />

      {/* D-258 (۱۴۰۵/۰۷/۲۱، نبض دیزاین): py-10 ← py-12؛ هم‌ریتم با سکشن‌های خانه (D-195/D-245) */}
      <section className="mx-auto max-w-6xl px-6 py-12">
        <Card className="overflow-hidden">
          <div className="bg-brand/10 px-6 py-10 text-center sm:px-10">
            <h2 className="text-balance text-2xl sm:text-3xl">
              برای رزرو، فقط کافی است زنگ بزنید
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
              {s.CONTACT_NAME}، {s.CONTACT_TITLE.toLowerCase()}، خودش پاسخ‌گوی شماست؛
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
      </main>
    </>
  );
}
