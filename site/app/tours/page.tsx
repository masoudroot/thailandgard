import type { Metadata } from "next";
import { TOURS } from "@/lib/tours";
import { fa } from "@/lib/utils";
import { TourCard } from "@/components/site/TourCard";
import { CallButtons } from "@/components/site/CallButtons";

export const metadata: Metadata = {
  title: "تورهای تایلند؛ پوکت، بانکوک، سامویی، کرابی",
  description:
    "هر ۴ تور تایلندگرد را ببین؛ تور پوکت ۷ روزه، بانکوک و پاتایا ۸ روزه، سامویی ۷ روزه و کرابی ۶ روزه. قیمت‌ها تقریبی و «شروع قیمت»‌اند؛ رزرو فقط با تماس.",
  alternates: { canonical: "/tours" },
};

export default function ToursPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <header className="max-w-3xl space-y-4">
        <h1 className="text-3xl font-bold md:text-4xl">تورهای تایلند</h1>
        <p className="leading-8 text-muted-foreground">
          در حال حاضر {fa(TOURS.length)} تور فعال داریم: پوکت، بانکوک و پاتایا، سامویی و کرابی.
          قیمت‌هایی که می‌بینی «شروع قیمت»‌اند و بسته به تاریخ سفر و هتل کمی بالا و پایین می‌شوند.
          رزرو هم فقط با تماس تلفنی انجام می‌شود؛ پرداخت آنلاین نداریم.
        </p>
      </header>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {TOURS.map((tour) => (
          <TourCard key={tour.slug} tour={tour} />
        ))}
      </div>

      <section className="mt-16 rounded-xl border border-border bg-card p-6 md:p-8">
        <h2 className="text-xl font-bold">هنوز تصمیم نگرفته‌اید؟</h2>
        <p className="mt-2 leading-8 text-muted-foreground">
          بگو دنبال چه سفری هستی؛ کارشناس فروشمان که خودش تایلند را خوب می‌شناسد،
          بهترین گزینه را با توجه به بودجه و سلیقه‌ات پیشنهاد می‌دهد.
        </p>
        <div className="mt-5">
          <CallButtons compact />
        </div>
      </section>
    </div>
  );
}
