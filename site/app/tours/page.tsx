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
    images: defaultOgImages(SITE_URL),
  },
  alternates: { canonical: "/tours" },
};

export default async function ToursPage() {
  const tours = await getTours();
  const s = await getSiteSettings();
  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <header className="max-w-3xl space-y-4">
        <h1 className="text-3xl md:text-4xl leading-tight">تورهای تایلند</h1>
        <p className="leading-8 text-muted-foreground">
          در حال حاضر {fa(tours.length)} تور فعال داریم:{" "}
          <Link href="/tours/phuket-7-days" className="underline decoration-brand/60 underline-offset-4">تور پوکت</Link>،{" "}
          <Link href="/tours/bangkok-pattaya-8-days" className="underline decoration-brand/60 underline-offset-4">تور بانکوک و پاتایا</Link>،{" "}
          <Link href="/tours/samui-7-days" className="underline decoration-brand/60 underline-offset-4">تور سامویی</Link> و{" "}
          <Link href="/tours/krabi-6-days" className="underline decoration-brand/60 underline-offset-4">تور کرابی</Link>.
          قیمت‌هایی که می‌بینی «شروع قیمت»‌اند و بسته به تاریخ سفر و هتل کمی بالا و پایین می‌شوند.
          رزرو هم فقط با تماس تلفنی انجام می‌شود؛ پرداخت آنلاین نداریم.
        </p>
      </header>

      <section className="mt-10">
        <TourBanner tour={tours[0]} />
      </section>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {tours.map((tour) => (
          <TourCard key={tour.slug} tour={tour} />
        ))}
      </div>

      {/* بنر ب (بین‌سکشنی)؛ حکم ۴ */}
      <div className="mt-10">
        <SeasonBanner />
      </div>

      {/* باند CTA پایانی (بریف ۳ artdir): جایگزین بخش دستی «هنوز تصمیم نگرفته‌اید؟»؛
          حکم مدیر: فقط یک مسیر تماس. کپی نهایی (اجرا ۱۵) اعمال شد؛ شماره فعلاً موقت. */}
      <CtaBlock
        title="با کارشناس تایلند حرف بزنید"
        description="تور موردنظرتان را پیدا نکردید؟ بگویید چه می‌خواهید؛ ما برنامه‌اش را می‌چینیم"
        action={<span dir="ltr">{s.PHONE_MOBILE_DISPLAY}</span>}
        actionHref={s.PHONE_MOBILE_LINK}
        note="زمان ترجیحی تماس را شما می‌گویید"
      />
    </div>
  );
}
