import type { Metadata } from "next";
import Link from "next/link";
import { getTours, getSiteSettings } from "@/lib/db-content";
import { SITE_URL } from "@/lib/site";
import { defaultOgImages } from "@/lib/og";
import { fa } from "@/lib/utils";
import { TourCard } from "@/components/site/TourCard";
import { TourBanner } from "@/components/site/TourBanner";
import { SeasonBanner } from "@/components/site/SeasonBanner";
import { CtaBlock } from "@/components/blocks/cta";

export const metadata: Metadata = {
  title: "تورهای تایلند؛ مقایسه و انتخاب تور",
  description:
    "همهٔ تورهای تایلندگرد را مقایسه کن؛ پوکت، بانکوک و پاتایا، سامویی و کرابی. قیمت‌ها «شروع قیمت» و تقریبی‌اند؛ رزرو فقط با تماس تلفنی.",
  openGraph: {
    title: "تورهای تایلند؛ پوکت، بانکوک، سامویی، کرابی؛ تایلندگرد",
    description:
      "همهٔ تورهای تایلندگرد را مقایسه کن؛ پوکت، بانکوک و پاتایا، سامویی و کرابی. قیمت‌ها «شروع قیمت» و تقریبی‌اند؛ رزرو فقط با تماس تلفنی.",
    // باریک‌شدهٔ سئو ۱۲:۳۷ (یافتهٔ :۳۵): مثل contact، og:url اضافه شد.
    url: "/tours",
    images: defaultOgImages(SITE_URL),
  },
  alternates: { canonical: "/tours" },
};

export default async function ToursPage() {
  const tours = await getTours();
  const s = await getSiteSettings();
  // قانون ۳۷ اسکیما: گرید تورها از getTours() رندر می‌شود؛ ItemList همان
  // آیتم‌های نمایشی را دارد (نه بیشتر، نه کمتر).
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "تورهای تایلند",
    itemListElement: tours.map((tour, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: tour.title,
      url: `${SITE_URL}/tours/${tour.slug}`,
    })),
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="mx-auto max-w-6xl px-6 py-10">
      {/* قانون تراکم فارسی (۱۴۰۵/۰۷/۱۱): متن فارسی پرحجم‌تر است؛ فاصله‌های بادکردهٔ معیار انگلیسی در فارسی شل می‌شود؛ ریتم عمودی جمع‌وجور. */}
      <header className="max-w-3xl space-y-4">
        <h1 className="text-3xl md:text-4xl">تورهای تایلند</h1>
        <p className="leading-[1.8] text-muted-foreground">
          در حال حاضر {fa(tours.length)} تور فعال داریم:{" "}
          <Link href="/tours/phuket-7-days" className="underline decoration-brand/60 underline-offset-4">تور پوکت</Link>،{" "}
          <Link href="/tours/bangkok-pattaya-8-days" className="underline decoration-brand/60 underline-offset-4">تور بانکوک و پاتایا</Link>،{" "}
          <Link href="/tours/samui-7-days" className="underline decoration-brand/60 underline-offset-4">تور سامویی</Link> و{" "}
          <Link href="/tours/krabi-6-days" className="underline decoration-brand/60 underline-offset-4">تور کرابی</Link>.
          قیمت‌هایی که می‌بینی «شروع قیمت»‌اند و بسته به تاریخ سفر و هتل کمی بالا و پایین می‌شوند.
          رزرو هم فقط با تماس تلفنی انجام می‌شود؛ پرداخت آنلاین نداریم.
        </p>
      </header>

      <section className="mt-8">
        <TourBanner tour={tours[0]} />
      </section>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {tours.map((tour) => (
          <TourCard key={tour.slug} tour={tour} />
        ))}
      </div>

      {/* بلوک «هزینهٔ تور تایلند چقدر است؟»؛ بریف seocontent ۲۰ مهر ۱۴۰۵، ۱۰:۰۰، اسنیپت پاراگرافی */}
      <section className="mt-8 max-w-3xl space-y-4">
        <h2 className="text-2xl sm:text-3xl">هزینهٔ تور تایلند چقدر است؟</h2>
        <p className="leading-[1.8] text-muted-foreground">
          هزینهٔ تور تایلند عدد ثابتی ندارد و به پنج عامل بستگی دارد: فصل سفر، درجهٔ هتل، مدت اقامت، مقصد انتخابی و پرواز مستقیم یا با توقف. تورهای تایلندگرد فروش تلفنی دارند و قیمت دقیق هر پکیج را کارشناس مقصد بر اساس همین عوامل مشخص می‌کند؛ برای مقایسهٔ دو تور، هر پنج عامل را کنار هم بگذارید.
        </p>
      </section>

      {/* بنر ب (بین‌سکشنی)؛ حکم ۴ */}
      <div className="mt-8">
        <SeasonBanner />
      </div>

      {/* باند CTA پایانی (بریف ۳ artdir): جایگزین بخش دستی «هنوز تصمیم نگرفته‌اید؟»؛
          حکم مدیر: فقط یک مسیر تماس. کپی نهایی (اجرا ۱۵) اعمال شد؛ شماره فعلاً موقت. */}
      <CtaBlock
        title="با کارشناس تایلند حرف بزنید"
        description="تور موردنظرتان را پیدا نکردید؟ بگویید چه می‌خواهید؛ ما برنامه‌اش را می‌چینیم"
        action={<span dir="ltr">{s.PHONE_MOBILE_DISPLAY}</span>}
        actionHref={s.PHONE_MOBILE_LINK}
        callContext="tours-cta"
        note="زمان ترجیحی تماس را شما می‌گویید"
      />
      </div>
    </>
  );
}
