import type { Metadata } from "next";
import { Fragment } from "react";
import Link from "next/link";
import { getTours, getSiteSettings } from "@/lib/db-content";
import { SITE_URL } from "@/lib/site";
import { pageSeo, displayTitle } from "@/lib/og";
import { fa } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { TourCard, canonicalTourOrder } from "@/components/site/TourCard";
import { TourBanner } from "@/components/site/TourBanner";
import { SeasonBanner } from "@/components/site/SeasonBanner";
import { CtaBlock } from "@/components/blocks/cta";
import { Breadcrumb } from "@/components/ui/breadcrumb";

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

export default async function ToursPage() {
  const tours = await getTours();
  const s = await getSiteSettings();
  // S-020 (هندآف seocontent ۱۹:۰۰): تور «منتخب این هفته» بنر از گرید حذف
  // می‌شود تا هدینگ تکراری (h2 بنر + h3 کارت با متن یکسان) نماند.
  const [featuredTour, ...restTours] = tours;
  // D-176: گرید کارت‌ها همان ترتیب کانونی خانه را دارد (ترکیبی اول)؛
  // بنر «منتخب این هفته» همان tours[0] می‌ماند و از گرید حذف می‌شود (S-020).
  const gridTours = canonicalTourOrder(restTours);
  // قانون ۳۷ اسکیما: ItemList همان آیتم‌های نمایشی گرید را دارد (نه بیشتر،
  // نه کمتر)؛ بنر «منتخب» جدا از گرید است و در اسکیما نمی‌آید.
  // قانون ۳۷ اسکیما: کارت‌ها با عنوان و خلاصه رندر می‌شوند؛ ItemList فقط همان
  // آیتم‌های نمایشی گرید را دارد (نه بیشتر، نه کمتر)؛ از همان getTours() صفحه.
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
      { "@type": "ListItem", position: 1, name: "خانه", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "تورهای تایلند", item: `${SITE_URL}/tours` },
    ],
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="mx-auto max-w-6xl px-6 py-10">
      <Breadcrumb
        className="mb-6"
        items={[{ label: "خانه", href: "/" }, { label: "تورهای تایلند" }]}
      />
      {/* قانون تراکم فارسی (۱۴۰۵/۰۷/۱۱): متن فارسی پرحجم‌تر است؛ فاصله‌های بادکردهٔ معیار انگلیسی در فارسی شل می‌شود؛ ریتم عمودی جمع‌وجور. */}
      <header className="max-w-3xl space-y-4">
        <h1 className="text-3xl md:text-4xl">تورهای تایلند</h1>
        <p className="leading-[1.8] text-muted-foreground">
          در حال حاضر {fa(tours.length)} تور فعال داریم:{" "}
          {tours.map((t, i) => (
            <Fragment key={t.slug}>
              {i > 0 && (i === tours.length - 1 ? " و " : "، ")}
              <Link href={`/tours/${t.slug}`} className="underline decoration-brand/60 underline-offset-4 transition-[text-decoration-color] duration-200 hover:decoration-brand">
                تور {t.shortTitle || t.title}
              </Link>
            </Fragment>
          ))}.
          قیمت‌هایی که می‌بینید «قیمت پایه» هستند و بسته به تاریخ سفر و هتل کمی بالا و پایین می‌شوند.{" "}
          {/* حکم ۳ برندینگ (چرخهٔ ۰۹): مجهول اداری «انجام می‌شود» ممنوع؛
              «رزرو فقط با تماس تلفنی است.» */}
          رزرو فقط با تماس تلفنی است؛ پرداخت آنلاین نداریم.
        </p>
      </header>

      {featuredTour && (
        <section className="mt-8">
          <TourBanner tour={featuredTour} />
        </section>
      )}

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {gridTours.map((tour) => (
          <TourCard key={tour.slug} tour={tour} />
        ))}
      </div>

      {/* بلوک مقایسهٔ ۳ تور (درفت ۴۱ content + بریف on-page seocontent، اجرای ۰۵؛
          D-185: پس از غیرفعال‌سازی سامویی/کرابی (۱۱:۱۰، مصوبهٔ S-049) دو ستون حذف شد؛
          بلوک داخل /tours (JSX) نه URL تازه؛ پس کنیبالیزیشنی با راهنمای
          compare-thailand-tours نیست. عبارت هدف «مقایسه تورهای تایلند» در H2.
          هر ۳ لینک تور با SELECT زندهٔ tours راستی شد (قانون «اول رکورد، بعد لینک»).
          همهٔ عددها از درفت ۴۱ (SELECT زندهٔ ۰۵:۱۰)؛ حدس نیست. */}
      <section className="mt-8">
        <h2 className="text-2xl sm:text-3xl">مقایسهٔ تورهای تایلندگرد؛ هر ۳ تور کنار هم</h2>
        <div dir="rtl" className="mt-4 overflow-x-auto rounded-surface border border-border">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th scope="col" className="border-b border-border px-4 py-3 text-start">
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
                  <th key={t.slug} scope="col" className="border-b border-border px-4 py-3 text-start font-semibold">
                    {t.name}
                    <br />
                    <Link
                      href={`/tours/${t.slug}`}
                      className="text-xs font-normal text-foreground underline decoration-brand/60 underline-offset-4 transition-[text-decoration-color] duration-200 hover:decoration-brand"
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
                  label: "قیمت پایهٔ نمایشی",
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
                  <th scope="row" className={`sticky start-0 z-10 border-b border-border px-4 py-3 text-start font-semibold ${k % 2 === 1 ? "bg-muted" : "bg-background"}`}>
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
        <h3 className="mt-6 text-xl">اگر این‌طورید، این را انتخاب کنید</h3>
        <ul className="mt-3 space-y-2 text-muted-foreground">
          <li>اولین سفرتان به تایلند است و می‌خواهید همه‌چیز را ببینید: <strong className="text-foreground">تور ترکیبی بانکوک و پوکت</strong>؛ شهر و جزیره در یک سفر.</li>
          <li>با خانواده و بچه سفر می‌کنید: <strong className="text-foreground">بانکوک و پاتایا</strong>؛ متنوع‌ترین برنامه با کمترین قیمت پایه.</li>
          <li>ماه‌عسل است یا آرامش مطلق می‌خواهید: <strong className="text-foreground">سامویی</strong>؛ جزیرهٔ آرام خلیج تایلند.</li>
          <li>عاشق طبیعت و قایق‌سواری‌اید: <strong className="text-foreground">کرابی</strong>؛ چهار جزیره در شش روز.</li>
          <li>کلاسیک و مطمئن می‌خواهید: <strong className="text-foreground">پوکت</strong>؛ فی‌فی و فانگ‌نا که همه می‌شناسند.</li>
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

      {/* بنر ب (بین‌سکشنی)؛ حکم ۴؛ D-106: بالای بخش هزینه تا جریان هزینه→اقدام به CTA نریزد */}
      <div className="mt-8">
        <SeasonBanner />
      </div>

      {/* بلوک «هزینهٔ تور تایلند چقدر است؟»؛ بریف seocontent ۲۰ مهر ۱۴۰۵، ۱۰:۰۰، اسنیپت پاراگرافی */}
      <section className="mt-8 max-w-3xl space-y-4">
        <h2 className="text-2xl sm:text-3xl">هزینهٔ تور تایلند چقدر است؟</h2>
        <p className="leading-[1.8] text-muted-foreground">
          هزینهٔ تور تایلند عدد ثابتی ندارد و به پنج عامل بستگی دارد: فصل سفر، درجهٔ هتل، مدت اقامت، مقصد انتخابی و پرواز مستقیم یا با توقف. تورهای تایلندگرد فروش تلفنی دارند و قیمت دقیق هر پکیج را کارشناس مقصد بر اساس همین عوامل مشخص می‌کند؛ برای مقایسهٔ دو تور، هر پنج عامل را کنار هم بگذارید.
        </p>
      </section>

      {/* باند CTA پایانی (بریف ۳ artdir): جایگزین بخش دستی «هنوز تصمیم نگرفته‌اید؟»؛
          حکم مدیر: فقط یک مسیر تماس. کپی نهایی (اجرا ۱۵) اعمال شد؛ شماره فعلاً موقت. */}
      <CtaBlock
        title="با کارشناس مقصد حرف بزنید"
        description="تور موردنظرتان را پیدا نکردید؟ بگویید چه می‌خواهید؛ ما برنامه‌اش را می‌چینیم"
        action={<span dir="ltr">{s.PHONE_MOBILE_DISPLAY}</span>}
        actionHref={s.PHONE_MOBILE_LINK}
        callContext="tours-cta"
        note="زمان ترجیحی تماس را شما می‌گویید"
      />

      {/* S-090 (بریف seo ۰۳:۳۵، قانون ۶۴): لینک زمینه‌ای هاب راهنماها از داخل
          main همین صفحه؛ فقط در main (نه لی‌اوت سراسری). انکر = عنوان نمایشی
          راهنما (همان displayTitle کارت‌ها). */}
      <section className="mt-8">
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-2xl sm:text-3xl">راهنمای سفر</h2>
            <ul className="mt-4 space-y-3">
              {[
                { slug: "thailand-visa-guide", title: "ویزای تایلند برای ایرانیان؛ مدارک، هزینه و زمان صدور" },
                { slug: "thailand-trip-cost", title: "هزینهٔ سفر به تایلند در ۱۴۰۵؛ راهنمای کامل بودجهٔ سفر" },
                { slug: "best-time-to-visit-thailand", title: "بهترین زمان سفر به تایلند" },
              ].map((g) => (
                <li key={g.slug}>
                  <Link href={`/guide/${g.slug}`} className="underline decoration-brand/60 underline-offset-4 transition-[text-decoration-color] duration-200 hover:decoration-brand">
                    {displayTitle(g.title)}
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>
      </main>
    </>
  );
}
