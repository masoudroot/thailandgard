import type { Metadata } from "next";
import Link from "next/link";
import { Clock, MessageCircle, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { CallButtons } from "@/components/site/CallButtons";
import { CallbackForm } from "@/components/site/CallbackForm";
import { LiveStatusChip } from "@/components/site/LiveStatusChip";
import { HourAwareCallTitle } from "@/components/site/HourAwareCallTitle";
import { getSiteSettings } from "@/lib/db-content";
import { PHONE_LANDLINE_DISPLAY, PHONE_LANDLINE_LINK, PHONE_MOBILE_DISPLAY, PHONE_MOBILE_LINK, SITE_URL } from "@/lib/site";
import { defaultOgImages } from "@/lib/og";
import { fa } from "@/lib/utils";

export const metadata: Metadata = {
  // ممیزی سئو ۲۰ مهر ۱۴۰۵: عنوان تک‌برند (بدون «تایلندگرد» در متن، چون تمپلیت لی‌اوت
  // «؛ تایلندگرد» را می‌چسباند)؛ og/title یکدست + بلوک twitter مثل pageSeo.
  title: "تماس و مشاورهٔ تلفنی تور تایلند",
  description:
    "فروش تایلندگرد فقط تلفنی است؛ پرداخت آنلاین نداریم. با غزل عینی، متخصص و مشاور تورهای تایلند، تماس بگیرید یا درخواست تماس ثبت کنید.",
  openGraph: {
    title: "تماس و مشاورهٔ تلفنی تور تایلند؛ تایلندگرد",
    description:
      "فروش تایلندگرد فقط تلفنی است؛ پرداخت آنلاین نداریم. با غزل عینی، متخصص و مشاور تورهای تایلند، تماس بگیرید یا درخواست تماس ثبت کنید.",
    // هندآف سئو ۱۲:۰۸ (قانون ۴۶): صفحهٔ تماس og:url نداشت؛ مثل pageSeo اضافه شد.
    // S-017 (۲۱ مهر ۱۴۰۵): og:type غایب بود؛ صریح «website» تا بلوک OG کامل باشد.
    url: "/contact",
    type: "website",
    locale: "fa_IR",
    images: defaultOgImages(SITE_URL),
  },
  twitter: {
    card: "summary_large_image",
    // S-006 (۲۱ مهر ۱۴۰۵): پسوند برند صریح در کد، چون تمپلیت عنوان
    // روی openGraph/twitter اعمال نمی‌شود؛ metadata.title دست نخورد.
    title: "تماس و مشاورهٔ تلفنی تور تایلند؛ تایلندگرد",
    description:
      "فروش تایلندگرد فقط تلفنی است؛ پرداخت آنلاین نداریم. با غزل عینی، متخصص و مشاور تورهای تایلند، تماس بگیرید یا درخواست تماس ثبت کنید.",
    images: defaultOgImages(SITE_URL),
  },
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const s = await getSiteSettings();
  // S-088 (حسابرس سئو): صفحهٔ تماس BreadcrumbList نداشت؛ تک‌آیتمی «خانه»
  // تا با صفحه‌های تور و راهنما یکدست شود.
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "خانه", item: SITE_URL.replace(/\/+$/, "") }, // S-005: بدون اسلش انتهایی، هم‌خوان با کنونیکال
      { "@type": "ListItem", position: 2, name: "تماس با تایلندگرد", item: `${SITE_URL}/contact` },
    ],
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
    <main className="mx-auto max-w-5xl px-6 py-12">
      <header className="max-w-2xl">
        <p className="inline-flex items-center gap-2 rounded-full bg-brand/15 px-3 py-1 text-xs font-semibold text-brand-foreground">
          <Phone aria-hidden className="size-3.5" />
          مشاورهٔ تلفنی
        </p>
        <h1 className="mt-3 text-balance text-3xl md:text-4xl">تماس با تایلندگرد</h1>
        <p className="text-pretty mt-4 text-base leading-[1.8] text-muted-foreground">
          رزرو فقط تلفنی است؛ اینترنتی پول نمی‌گیریم. یک تماس کوتاه، همهٔ ابهام‌های سفرتان
          را برطرف می‌کند.
        </p>
      </header>

      {/* قاب تایپوگرافیک (اسپک s002 قلم ۳، ۲۰ مهر ۱۴۰۵): تمام‌عرض، بالای گرید دو کارت.
          عکس واقعی نیست پس ماسک معنا ندارد؛ گرادیان تایپوگرافیک خنثی.
          تیتر: F-101 (هندآف content، اجرای ۰۸، ۲۱ مهر ۱۴۰۵)؛ «همه‌روزه» صادقانه
          نبود (ساعت کاری: شنبه تا پنجشنبه)؛ گزینهٔ الف: «در روزهای کاری پاسخ‌گوییم».
          D-122: خط پشتیبان زیر تیتر تا قاب خالی/خراب حس نشود.
          D-134 (نبض دیزاین): تراکم عمودی (py-10/sm:py-12 ← py-8/sm:py-10) + امضای
          خط‌حایل/لوزی الگوی D-008 زیر خط پشتیبان تا نیمهٔ خالی قاب پر شود. */}
      <div className="mt-8 overflow-hidden rounded-surface border border-border bg-frame-typographic px-8 py-8 text-center sm:py-10">
        <p className="font-display text-2xl text-foreground sm:text-3xl">در روزهای کاری پاسخ‌گوییم</p>
        <p className="text-pretty mt-3 text-sm leading-[1.9] text-muted-foreground">
          زنگ بزنید یا شماره‌تان را بگذارید؛ یک آدم واقعی جواب می‌دهد، نه ربات.
        </p>
        <div aria-hidden className="mx-auto mt-6 flex max-w-xs items-center gap-3">
          <span className="h-px flex-1 bg-foreground/10" />
          <span className="text-[10px] leading-none text-brand-foreground">◆</span>
          <span className="h-px flex-1 bg-foreground/10" />
        </div>
        {/* خط تلفن‌ها (D-229): بدنهٔ قاب تایپوگرافیک خالی می‌خواند؛ شماره‌های
            تک‌منبع lib/site.ts مسیر تماس را داخل همین قاب زنده می‌کند. */}
        <p className="mt-5 text-lg font-semibold text-foreground">
          <a href={PHONE_MOBILE_LINK} className="rounded-sm underline decoration-brand decoration-2 underline-offset-4 focus-visible:bg-accent"><span dir="ltr">{PHONE_MOBILE_DISPLAY}</span></a>
          <span aria-hidden className="mx-3 font-normal text-muted-foreground">·</span>
          <a href={PHONE_LANDLINE_LINK} className="rounded-sm underline decoration-brand decoration-2 underline-offset-4 focus-visible:bg-accent"><span dir="ltr">{PHONE_LANDLINE_DISPLAY}</span></a>
        </p>
      </div>

      <div id="callback" className="mt-8 grid scroll-mt-24 gap-6 lg:grid-cols-2">
        {/* قلم ۳ لید (سلسله‌مراتب کارت‌ها، حکم مدیر ۱۰:۱۵): «تماس مستقیم» مسیر اصلی است؛
            تیتر حکم مدیر + حاشیهٔ برند تا چشم اول به همین کارت برود؛ بج برند حفظ شد. */}
        <Card className="h-full overflow-hidden border-brand">
          <CardHeader className="border-b border-border bg-muted/40">
            <div className="flex items-start justify-between gap-4">
              <div>
                {/* M-2 (یافتهٔ lead، ۲۱ مهر ۱۴۰۵): تیتر ساعت‌آگاه؛ «سریع‌ترین راه»
                    فقط داخل ساعت کاری درست است. متن نهایی جایگزین با content. */}
                <HourAwareCallTitle />
                <CardDescription className="mt-1">{s.CONTACT_TITLE}</CardDescription>
              </div>
              <Badge variant="brand">کارشناس مقصد</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* نشانگر زندهٔ وضعیت پاسخ‌گویی (پیشنهاد lead، ۲۱ مهر ۱۴۰۵): زیر تیتر کارت،
                قبل از دکمه‌ها (یادداشت جایگذاری design). */}
            <LiveStatusChip />
            <CallButtons compact />
            <p className="flex items-start gap-2 text-sm text-muted-foreground">
              <MessageCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
              {/* D-050 (نبض دیزاین): کانال‌های پیام‌رسان از تک‌منبع DB می‌آیند تا خانه و تماس
                  همیشه یکدست بمانند («بله» فقط روی خانه بود) */}
              {s.PHONE_CHANNELS_NOTE} در ساعت کاری فعال است؛ پیام بدهید، جواب می‌گیرید. با شمارهٔ ثابت هم می‌توانید زنگ بزنید.
            </p>
            <p className="flex items-start gap-2 text-sm text-muted-foreground">
              <Clock aria-hidden className="mt-0.5 size-4 shrink-0" />
              ساعت کاری: شنبه تا پنجشنبه، {fa(9)} صبح تا {fa(9)} شب
            </p>
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader className="border-b border-border bg-muted/40">
            {/* D-118 (نبض دیزاین): تیتر کارت فرم برگشت تماس («تماس با مشاور سفر»)
                عین لیبل دکمهٔ کهربایی مسیر تماس مستقیم بود؛ تمایز با «ما زنگ می‌زنیم»
                در برابر «خودتان زنگ بزنید» کارت مقابل؛ دکمهٔ سابمیت «درخواست تماس» سر جایش. */}
            <h2 className="text-balance text-xl font-semibold">ما زنگ می‌زنیم</h2>
            {/* قلم ۳ لید: کارت دوم خنثی و ثانویه؛ بدون بج؛ متن حکم مدیر. */}
            <CardDescription>
              وقت ندارید؟ شماره‌تان را بگذارید؛ خودمان با شما تماس می‌گیریم.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CallbackForm contactName={s.CONTACT_NAME} />
          </CardContent>
        </Card>
      </div>

      {/* باکس «پیش از تماس» (بریف seo، S-101، قانون ۶۵): بدنهٔ main صفحهٔ تماس
          صفر لینک داخلی داشت. ۳ لینک زمینه‌ای داخل main تا قانون ۶۵ برقرار شود؛
          زیر CTA اصلی، جمع‌وجور. */}
      <section className="mt-8">
        <Card>
          <CardContent className="pt-6 text-center">
            <h2 className="text-balance text-xl">پیش از تماس</h2>
            <ul className="mt-3 flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
              <li>
                <Link href="/tours" className="underline decoration-brand/60 underline-offset-4 transition-[text-decoration-color] duration-200 hover:decoration-brand">
                  تورهای تایلند
                </Link>
              </li>
              <li>
                <Link href="/guide" className="underline decoration-brand/60 underline-offset-4 transition-[text-decoration-color] duration-200 hover:decoration-brand">
                  راهنمای سفر به تایلند
                </Link>
              </li>
              <li>
                <Link href="/guide/thailand-visa-guide" className="underline decoration-brand/60 underline-offset-4 transition-[text-decoration-color] duration-200 hover:decoration-brand">
                  ویزای تایلند برای ایرانیان
                </Link>
              </li>
            </ul>
          </CardContent>
        </Card>
      </section>
    </main>
    </>
  );
}
