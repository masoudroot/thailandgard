import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, Phone } from "lucide-react";
import { Accordion } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Price } from "@/components/ui/price";
import { Separator } from "@/components/ui/separator";
import { TourCard } from "@/components/site/TourCard";
import { MobileOctoberBar } from "@/components/site/MobileOctoberBar";
import { OctoberTimeline } from "@/components/site/OctoberTimeline";
import { getTour, getSiteSettings } from "@/lib/db-content";
import { pageSeo } from "@/lib/og";

/**
 * لندینگ فصلی «پوکت؛ نیمهٔ دوم اکتبر»؛ مسیر /phuket-october
 * (تأیید مدیر: agents/manager/DECISIONS.md).
 * مبنا: بستهٔ هندآف نیمروز design + احکام ۱ تا ۶ artdir + دستورهای وایب‌فارسی ۱۲:۰۵.
 * تاریخ‌مصرف محتوا (از درفت تیم محتوا): کارت ۱ و جواب ۳ تا پایان ۱۸ اکتبر ۲۰۲۶؛
 * بازبینی کلی محتوا ۱۵ آبان ۱۴۰۵ (مالک تقویم: تیم محتوا).
 */

export const metadata: Metadata = pageSeo({
  // حکم مدیر ۱۲:۴۰ (نوبت دوم ساعت ۱۲): عنوان سؤالی ← «؟ | تایلندگرد» (قرارداد سراسری سایت)
  title: "تور پوکت در اکتبر؛ الان برویم یا صبر کنیم؟ | تایلندگرد",
  description:
    "تور پوکت در نیمهٔ دوم اکتبر؛ جشنوارهٔ گیاه‌خواران (۱۰ تا ۱۸ اکتبر)، بازگشایی سیمیلان (۱۵ اکتبر) و پرواز مستقیم (۱۸ اکتبر). پنجرهٔ سفر را با تایلندگرد ببینید.",
  canonical: "/phuket-october",
  type: "article",
});

const WHY_NOW = [
  {
    stat: "۱۰ تا ۱۸ اکتبر",
    title: "جشنوارهٔ گیاه‌خواران پوکت؛ ۱۰ تا ۱۸ اکتبر",
    body: "جشنوارهٔ گیاه‌خواران پوکت از ۱۰ تا ۱۸ اکتبر در پوکت‌تاون برگزار می‌شود و قلبش معبد جوی‌تویی در خیابان راننگ است. رژه‌های بامدادی هر روز بین ۶ تا ۸ صبح از معابد راه می‌افتند، بزرگ‌ترین‌شان ۱۶ اکتبر است و جشن با مراسم وداع شبانهٔ ۱۸ اکتبر در ساپان‌هین بسته می‌شود.",
  },
  {
    stat: "۱۵ اکتبر؛ ۵۰۰ بات",
    title: "بازگشایی سیمیلان؛ ۱۵ اکتبر، ورودی ۵۰۰ بات",
    body: "از ۱۵ اکتبر، فصل دریایی سیمیلان و سورین باز است و تا میانهٔ ماه مه ادامه دارد. بازدید فقط روزانه است و از ۸ تا ۱۶؛ اقامت شبانه در جزایر ممنوع است. ورودی پارک برای بزرگسال خارجی ۵۰۰ بات است و برای کودک ۳ تا ۱۴ سال ۲۵۰ بات. اگر به موج دریا حساسید، بدانید هفته‌های اول فصل بیشتر در معرض موج موسمی‌اند.",
  },
  {
    stat: "۱۸ اکتبر؛ ۳ پرواز هفتگی",
    title: "پرواز مستقیم تازه؛ ۱۸ اکتبر، ۳ پرواز هفتگی",
    body: "ویرجین آتلانتیک از ۱۸ اکتبر پرواز مستقیم هیترو لندن به پوکت را با بوئینگ ۷۸۷ شروع می‌کند: ۳ پرواز هفتگی، چهارشنبه و جمعه و یکشنبه، تا ۲۷ مارس. این تنها مسیر بدون توقف بین هیترو و پوکت در فصل امسال است؛ یعنی فصل پوکت از ۱۸ اکتبر واقعاً از راه رسیده.",
  },
];

const FAQS = [
  {
    q: "آیا اقامت شبانه در سیمیلان یا سورین ممکن است؟",
    a: "نه. در سیمیلان و سورین اقامت شبانه ممنوع است؛ فقط می‌توانید با گشت روزانه بروید و همان روز برگردید.",
  },
  {
    q: "ساعات مجاز گشت روزانه در پارک ملی سیمیلان چیست؟",
    a: "از ۸ تا ۱۶. قایق‌ها اجازه ندارند خارج از این بازه در پارک بمانند.",
  },
  {
    q: "رژه‌های جشنوارهٔ گیاه‌خواران چه ساعتی و از کدام معابد حرکت می‌کنند؟",
    a: "رژه‌ها هر صبح معمولاً بین ۶ تا ۸ از معابد پوکت‌تاون حرکت می‌کنند و قلب جشن، معبد جوی‌تویی در خیابان راننگ است. بزرگ‌ترین رژه ۱۶ اکتبر است و مراسم وداع با خدایان هم شب ۱۸ اکتبر در ساپان‌هین برگزار می‌شود.",
  },
  {
    q: "ورودی پارک‌های دریایی برای گردشگر خارجی چقدر است؟",
    a: "بزرگسال ۵۰۰ بات، کودک ۳ تا ۱۴ سال ۲۵۰ بات.",
  },
  {
    q: "برای رسیدن سریع‌تر به اسکله‌های سیمیلان کجا اقامت کنیم؟",
    a: "خائولاک. نزدیک‌ترین نقطهٔ حرکت به سیمیلان است و اگر از پوکت بروید، راه دریایی طولانی‌تری در پیش دارید.",
  },
  {
    q: "وضعیت دریا در هفته‌های اول فصل چگونه است؟",
    a: "کاملاً آرام نیست. هفته‌های اول فصل بیشتر در معرض موج موسمی‌اند؛ اگر به تکان‌های دریا حساسید، نوامبر تا آوریل زمان امن‌تری است.",
  },
  {
    q: "اگر سفرم را کنسل کنم، هزینه‌اش چه می‌شود؟",
    a: "صادقانه بگوییم: تور چارتر است و پول پرداختی قابل برگشت نیست. پس قبل از رزرو، همهٔ سؤال‌هایتان را بپرسید؛ مشاورهٔ ما رایگان است.",
  },
];

const TRUST_ROWS = [
  "مشاورهٔ رایگان پیش از خرید",
  "قیمت شفاف بدون هزینهٔ پنهان",
  "پشتیبانی فارسی‌زبان در مقصد",
];

export default async function PhuketOctoberPage() {
  const [tour, s] = await Promise.all([getTour("phuket-7-days"), getSiteSettings()]);
  if (!tour) notFound();

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* سکشن ۱: هیرو ← blocks/hero + حکم ۶ (خالی‌شده: بدون proof و گرید پس‌زمینه) */}
      <section className="px-6 pt-14 text-center sm:pt-20">
        <div className="mx-auto max-w-3xl">
          <Badge variant="brand">رویدادهای تقویمی پوکت</Badge>
          <h1 className="mt-5 font-display text-4xl sm:text-5xl">
            پوکت؛ نیمهٔ دوم اکتبر
          </h1>
          {/* زیرتیتر موقت تا بازبینی ۲۱:۰۰ تیم محتوا */}
          <p className="mx-auto mt-5 max-w-xl text-muted-foreground">
            ۱۰ تا ۱۸ اکتبر (۱۸ تا ۲۶ مهر): جشنوارهٔ گیاه‌خواران، بازگشایی سیمیلان، پرواز مستقیم هیترو
          </p>
          <div className="mt-8 flex flex-col justify-center gap-2 sm:flex-row">
            <Button asChild size="lg" variant="brand" className="rounded-full px-6 active:[transform:var(--press)]">
              <a href={s.PHONE_MOBILE_LINK} data-call-context="phuket-hero">
                <Phone />
                مشاوره با {s.CONTACT_NAME}
              </a>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full px-6 active:[transform:var(--press)]">
              <a href="#october-tours">تورهای همین پنجره</a>
            </Button>
          </div>
        </div>

        {/* خط زمانی سه‌ایستگاهی ← blocks/steps + حکم ۱ (ادغام در انتهای قاب هیرو) */}
        <div id="october-hero-end">
          <OctoberTimeline />
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6 pb-sticky-bar-october-clearance md:pb-16">
        <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
          <div className="min-w-0">
            {/* سکشن ۲: سه کارت «چرا الان» */}
            <section>
              <h2 className="text-2xl sm:text-3xl">چرا نیمهٔ دوم اکتبر؟</h2>
              <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {WHY_NOW.map((c) => (
                  <Card key={c.title} className="rounded-surface border-border shadow-none">
                    <CardContent className="p-6">
                      <p className="text-2xl font-bold tabular-nums">{c.stat}</p>
                      <Separator className="my-4" />
                      <h3 className="text-lg">{c.title}</h3>
                      <p className="mt-3 text-sm leading-7 text-muted-foreground">{c.body}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {/* سکشن ۳: تورهای همین پنجره */}
            <section id="october-tours" className="mt-12 scroll-mt-24">
              <h2 className="text-2xl sm:text-3xl">تورهای همین پنجره</h2>
              <div className="mt-8 max-w-md">
                <TourCard tour={tour} />
              </div>
            </section>

            {/* سکشن ۵: پرسش‌های متداول ← blocks/faq (فقط ستون آکاردئون) */}
            <section className="mt-12">
              <h2 className="text-2xl sm:text-3xl">پرسش‌های پرتکرار</h2>
              <Accordion
                className="mt-8"
                defaultOpen={["october-faq-0"]}
                items={FAQS.map((f, i) => ({
                  id: `october-faq-${i}`,
                  title: f.q,
                  content: f.a,
                }))}
              />
            </section>

            {/* سکشن ۶: پانوشت صداقت؛ دستور وایب‌فارسی ۱۲:۰۵: متن سادهٔ تک‌خط، نه الگوی خط کپی‌رایت blocks/footer */}
            <p className="mt-12 text-center text-xs text-muted-foreground">
              سفرهای دریایی اول فصل بیشتر در معرض موج موسمی‌اند.
            </p>
          </div>

          {/* سکشن ۴: پنل تصمیم */}
          <aside className="lg:sticky lg:top-6 lg:self-start">
            {/*
              دلیل گوشه‌های ۲۲ (rounded-surface): یکدستی با سه کارت «چرا الان» همین لندینگ.
              دستور وایب‌فارسی ۱۲:۰۵؛ نه rounded-2xl الگوی checkout.
            */}
            <Card className="rounded-surface border-border shadow-none">
              <CardContent className="p-6">
                <dl className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <dd className="flex items-baseline gap-1.5">
                      <Price amount={tour.priceFrom} size="md" />
                      <span className="text-xs text-muted-foreground">هر نفر</span>
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-sm text-muted-foreground">اعتبار نرخ تا</dt>
                    <dd className="text-sm font-semibold tabular-nums">۲۶ مهر ۱۴۰۵</dd>
                  </div>
                </dl>

                <Separator className="my-5" />
                <ul className="space-y-0">
                  {TRUST_ROWS.map((t, i) => (
                    <li key={t}>
                      {i > 0 && <Separator className="my-3" />}
                      <p className="text-sm leading-7">{t}</p>
                    </li>
                  ))}
                </ul>
                {/* گاردریل فاصلهٔ خط کنسلی (نقد ۲ artdir، ۱۳:۰۵): جداکنندهٔ مویی + دست‌کم mt-6 بالای خط */}
                <Separator className="mt-5 mb-6" />
                <p className="text-xs leading-6 text-muted-foreground">
                  این تور چارتر است و کنسلی ندارد.
                </p>

                <div className="mt-6 flex flex-col gap-2">
                  <Button asChild size="lg" variant="brand" className="active:scale-[0.98]">
                    <a href={s.PHONE_MOBILE_LINK} data-call-context="phuket-sidebar">
                      <Phone />
                      تماس با مشاور سفر
                    </a>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="active:scale-[0.98]">
                    <a href={s.WHATSAPP_LINK}>مشاوره در واتس‌اپ</a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>

      {/* نوار چسبان موبایل؛ حکم ۲ */}
      <MobileOctoberBar
        priceFrom={tour.priceFrom}
        phoneHref={s.PHONE_MOBILE_LINK}
        whatsappHref={s.WHATSAPP_LINK}
      />
    </main>
  );
}
