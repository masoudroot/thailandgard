import type { Metadata } from "next";
import Link from "next/link";
import { getTours } from "@/lib/db-content";
import { fa } from "@/lib/utils";
import { TourCard } from "@/components/site/TourCard";
import { TourBanner } from "@/components/site/TourBanner";
import { CallButtons } from "@/components/site/CallButtons";

export const metadata: Metadata = {
  title: "تورهای تایلند؛ مقایسه و انتخاب تور",
  description:
    "همهٔ تورهای تایلندگرد را مقایسه کن؛ پوکت، بانکوک و پاتایا، سامویی و کرابی. قیمت‌ها «شروع قیمت» و تقریبی‌اند؛ رزرو فقط با تماس تلفنی.",
  openGraph: {
    title: "تورهای تایلند؛ پوکت، بانکوک، سامویی، کرابی؛ تایلندگرد",
    description:
      "همهٔ تورهای تایلندگرد را مقایسه کن؛ پوکت، بانکوک و پاتایا، سامویی و کرابی. قیمت‌ها «شروع قیمت» و تقریبی‌اند؛ رزرو فقط با تماس تلفنی.",
  },
  alternates: { canonical: "/tours" },
};

export default async function ToursPage() {
  const tours = await getTours();
  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <header className="max-w-3xl space-y-4">
        <h1 className="text-3xl md:text-4xl">تورهای تایلند</h1>
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

      <section className="mt-16 rounded-xl border border-border bg-card p-6 md:p-8">
        <h2 className="text-2xl font-bold sm:text-3xl">هنوز تصمیم نگرفته‌اید؟</h2>
        <p className="mt-2 leading-8 text-muted-foreground">
          بگویید دنبال چه سفری هستید؛ کارشناس فروشمان که خودش تایلند را خوب می‌شناسد،
          بهترین گزینه را با توجه به بودجه و سلیقه‌تان پیشنهاد می‌دهد.
        </p>
        <div className="mt-5">
          <CallButtons compact />
        </div>
      </section>
    </div>
  );
}
