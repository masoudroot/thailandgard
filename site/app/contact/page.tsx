import type { Metadata } from "next";
import Link from "next/link";
import { Clock, MessageCircle, PenLine, Phone, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ContactForm } from "@/components/site/ContactForm";
import { ContactStickyCall } from "@/components/site/ContactStickyCall";
import { LiveStatusChip } from "@/components/site/LiveStatusChip";
import { FaqBlock } from "@/components/blocks/faq";
import { getSiteSettings } from "@/lib/db-content";
import { SITE_URL } from "@/lib/site";
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

/**
 * صفحهٔ تماس، بازسازی فاز ۵ طبق وایرفریم `your_files/thailandgard-wireframes/contact.html`:
 * ۱. اطمینان‌بخشی ۲. سه کارت راه تماس ۳. کی جواب می‌دهد ۴. فرم ۴ فیلدی
 * ۵. جدول ساعات هفتگی ۶. نقشه (حذف شد؛ دفتر فیزیکی با پذیرش حضوری نداریم)
 * ۷. ۶ سؤال پرتکرار تماس ۸. دکمهٔ تماس چسبان موبایل.
 * شماره‌ها و لینک‌ها همه از getSiteSettings (دیتابیس) می‌آیند، نه هاردکد.
 */
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
        {/* سکشن ۱: اطمینان‌بخشی؛ سه ترس بی‌نام: کی جواب می‌دهد؟ چقدر طول می‌کشد؟ هزینه دارد؟ */}
        <header className="max-w-2xl">
          <h1 className="text-balance text-3xl md:text-4xl">تماس با تایلندگرد</h1>
          <p className="text-pretty mt-4 text-base leading-[1.8] text-muted-foreground">
            همین حالا زنگ بزنید؛ کسی که تایلند را زندگی کرده جواب می‌دهد. مشاوره رایگان است و
            معمولاً در همان چند دقیقهٔ اول حرف حساب را می‌شنوید.
          </p>
        </header>

        {/* سکشن ۲: سه کارت راه تماس؛ روی موبایل کارت تلفن اول است (ترتیب DOM). */}
        <section aria-label="راه‌های تماس" className="mt-8">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="h-full border-brand">
              <CardHeader className="border-b border-border bg-muted/40">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="flex items-center gap-2 text-lg font-semibold">
                    <Phone aria-hidden className="size-5" />
                    زنگ بزنید
                  </h2>
                  <Badge variant="brand">سریع‌ترین راه</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-5">
                <LiveStatusChip callbackHref="#contact-form" />
                <a
                  href={s.PHONE_MOBILE_LINK}
                  className="block rounded-control bg-[var(--brand-deep)] px-4 py-3 text-center text-lg font-bold text-[var(--brand-deep-foreground)] shadow-control active:shadow-press"
                >
                  <span dir="ltr">{s.PHONE_MOBILE_DISPLAY}</span>
                </a>
                <p className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Clock aria-hidden className="mt-0.5 size-4 shrink-0" />
                  ساعت پاسخ‌گویی: شنبه تا پنجشنبه {fa(9)} صبح تا {fa(9)} شب؛ جمعه {fa(10)} صبح تا {fa(6)} عصر
                </p>
              </CardContent>
            </Card>

            <Card className="h-full">
              <CardHeader className="border-b border-border bg-muted/40">
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <MessageCircle aria-hidden className="size-5" />
                  پیام بدهید
                </h2>
              </CardHeader>
              <CardContent className="space-y-3 pt-5">
                <a
                  href={s.WHATSAPP_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-control border border-border px-4 py-3 text-center text-base font-semibold shadow-control active:shadow-press"
                >
                  چت مستقیم در واتس‌اپ
                  <span className="sr-only"> (در تب جدید)</span>
                </a>
                <p className="text-sm text-muted-foreground">
                  معمولاً کمتر از یک ساعت جواب می‌دهیم. برای فرستادن عکس و وویس هم راحت است.
                </p>
              </CardContent>
            </Card>

            <Card className="h-full">
              <CardHeader className="border-b border-border bg-muted/40">
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <PenLine aria-hidden className="size-5" />
                  برای ما بنویسید
                </h2>
              </CardHeader>
              <CardContent className="space-y-3 pt-5">
                <Link
                  href="#contact-form"
                  className="block rounded-control border border-border px-4 py-3 text-center text-base font-semibold shadow-control active:shadow-press"
                >
                  رفتن به فرم پیام
                </Link>
                <p className="text-sm text-muted-foreground">
                  تا آخر امروز جواب می‌دهیم. نیمه‌شب هم می‌توانید بنویسید؛ صبح اول وقت می‌خوانیم.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* سکشن ۳: کی جواب می‌دهد؛ عکس واقعی نداریم، پس بدون عکس. */}
        <section aria-labelledby="who-answers" className="mt-12">
          <h2 id="who-answers" className="text-balance text-2xl font-semibold">
            کی جواب می‌دهد؟
          </h2>
          <Card className="mt-4">
            <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:gap-6">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-brand/15">
                <UserRound aria-hidden className="size-7 text-brand-foreground" />
              </div>
              <div className="space-y-2">
                <p className="text-lg font-semibold">
                  {s.CONTACT_NAME}، کارشناس فروش
                </p>
                <p className="text-sm leading-7 text-muted-foreground">
                  شنبه تا پنجشنبه {fa(9)} صبح تا {fa(9)} شب و جمعه {fa(10)} صبح تا {fa(6)} عصر پشت خط است.
                  قول ما: تلفن «همان لحظه»، واتس‌اپ «کمتر از یک ساعت»، فرم «تا آخر امروز».
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* سکشن ۴: فرم ۴ فیلدی. */}
        <section id="contact-form" aria-labelledby="contact-form-title" className="mt-12 scroll-mt-24">
          <h2 id="contact-form-title" className="text-balance text-2xl font-semibold">
            پیام‌تان را بنویسید
          </h2>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            چهار فیلد بیشتر نیست؛ دو دقیقه هم طول نمی‌کشد.
          </p>
          <div className="mt-4 max-w-2xl">
            <ContactForm telHref={s.PHONE_MOBILE_LINK} telDisplay={s.PHONE_MOBILE_DISPLAY} />
          </div>
        </section>

        {/* سکشن ۵: جدول ساعات کاری هفتگی؛ راست‌چین. */}
        <section aria-labelledby="working-hours-title" className="mt-12">
          <h2 id="working-hours-title" className="text-balance text-2xl font-semibold">
            ساعت کاری هفتگی
          </h2>
          <div className="mt-4 max-w-2xl overflow-hidden rounded-surface border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/60 text-start">
                  <th scope="col" className="px-4 py-3 text-start font-semibold">
                    روز
                  </th>
                  <th scope="col" className="px-4 py-3 text-start font-semibold">
                    ساعات پاسخ‌گویی
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-border">
                  <td className="px-4 py-3">شنبه تا پنجشنبه</td>
                  <td className="px-4 py-3">{fa(9)} صبح تا {fa(9)} شب</td>
                </tr>
                <tr className="border-t border-border bg-muted/30">
                  <td className="px-4 py-3">جمعه</td>
                  <td className="px-4 py-3">{fa(10)} صبح تا {fa(6)} عصر</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
            خارج از این ساعت‌ها کسی پشت خط نیست؛ ولی فرم و واتس‌اپ همیشه باز است و اولِ وقتِ روز بعد جواب می‌گیرید.
          </p>
        </section>

        {/* سکشن ۶: نقشه: حذف شد. دفتر فیزیکی با پذیرش حضوری واقعی نداریم؛
            طبق وایرفریم حدس نمی‌زنیم و نقشه نمی‌گذاریم. */}

        {/* سکشن ۷: ۶ سؤال پرتکرار تماس؛ فقط دربارهٔ جرئت تماس گرفتن. */}
        <div className="mt-4">
          <FaqBlock
            title="سؤال‌هایی که قبل از تماس می‌پرسند"
            description="همه‌اش دربارهٔ همین تماس است؛ نه سؤال عمومی تایلند."
            items={[
              {
                id: "q-cost",
                title: "مشاورهٔ تلفنی هزینه دارد؟",
                content: (
                  <p>
                    نه؛ مشاوره کاملاً رایگان است و هیچ تعهدی برای خرید تور ایجاد نمی‌کند. اگر آخرش
                    حس کردید تور ما به کارتان نمی‌آید، همان را رک می‌گوییم.
                  </p>
                ),
              },
              {
                id: "q-when",
                title: "چه ساعتی می‌توانم زنگ بزنم؟",
                content: (
                  <p>
                    شنبه تا پنجشنبه {fa(9)} صبح تا {fa(9)} شب و جمعه {fa(10)} صبح تا {fa(6)} عصر.
                    خارج از این ساعت‌ها فرم همین صفحه یا واتس‌اپ را بگذارید؛ اولِ وقت جواب می‌گیرید.
                  </p>
                ),
              },
              {
                id: "q-who",
                title: "کی جواب می‌دهد؟",
                content: (
                  <p>
                    {s.CONTACT_NAME}، کارشناس فروش تایلندگرد؛ کسی که هر روز با همین تورها سروکار دارد،
                    نه یک مرکز تماس عمومی. اگر پشت خط بود، چند دقیقه بعد خودش زنگ می‌زند.
                  </p>
                ),
              },
              {
                id: "q-which-channel",
                title: "پیام واتس‌اپ بدهم یا زنگ بزنم؟",
                content: (
                  <p>
                    عجله دارید (مثلاً پرواز نزدیکی دارید)؟ زنگ بزنید. نه؟ واتس‌اپ معمولاً کمتر از
                    یک ساعت جواب می‌دهد و فرم هم تا آخر امروز. هر سه به دست همان کارشناس می‌رسد.
                  </p>
                ),
              },
              {
                id: "q-after-form",
                title: "بعد از ارسال فرم چه اتفاقی می‌افتد؟",
                content: (
                  <p>
                    پیام‌تان مستقیم می‌رسد دست کارشناس فروش و تا آخر امروز با همین شماره‌ای که
                    دادید تماس می‌گیرد. شماره‌تان جای دیگری استفاده نمی‌شود. اگر هنوز تور انتخاب
                    نکرده‌اید،{" "}
                    <Link href="/tours" className="underline decoration-brand/60 underline-offset-4 hover:decoration-brand">
                      تورهای تایلند
                    </Link>{" "}
                    را هم ببینید تا موقع تماس حرف مشخص‌تری بزنیم.
                  </p>
                ),
              },
              {
                id: "q-bought-elsewhere",
                title: "اگر تور را از جای دیگری گرفته‌ام، باز می‌توانم سؤال بپرسم؟",
                content: (
                  <p>
                    بله؛ سؤال دربارهٔ تایلند را جواب می‌دهیم، حتی اگر مسافر ما نباشید. فقط قول
                    پیگیری اجرایی (مثل تغییر هتل آژانس دیگر) را نمی‌دهیم. برای سؤال‌های کلی،{" "}
                    <Link href="/guide" className="underline decoration-brand/60 underline-offset-4 hover:decoration-brand">
                      راهنمای سفر به تایلند
                    </Link>{" "}
                    هم کمکتان می‌کند.
                  </p>
                ),
              },
            ]}
          />
        </div>

        {/* سکشن ۸: دکمهٔ تماس چسبان موبایل؛ با رسیدن به فرم پنهان می‌شود. */}
        <ContactStickyCall telHref={s.PHONE_MOBILE_LINK} telDisplay={s.PHONE_MOBILE_DISPLAY} />
      </main>
    </>
  );
}
