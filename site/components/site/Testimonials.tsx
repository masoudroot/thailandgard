import { TESTIMONIALS } from "@/lib/testimonials";
import { TravelerReviewCard } from "@/components/reviews/traveler-review-card";

/**
 * سکشن «حرف مسافران ما» (صفحهٔ خانه، بین راهنماها و نوار اعتماد).
 * سرور کامپوننت: اگر TESTIMONIALS خالی باشد null برمی‌گرداند؛ وگرنه
 * حداکثر ۶ نظر را با کارت TravelerReviewCard در گرید ۳ ستونه نشان می‌دهد.
 */
export function Testimonials() {
  const items = TESTIMONIALS.slice(0, 6);
  if (items.length === 0) return null;

  return (
    <section aria-label="نظرات مسافران" className="mx-auto max-w-6xl px-6 py-12">
      <h2 className="text-balance text-2xl sm:text-3xl">حرف مسافران ما</h2>
      <p className="mt-2 text-muted-foreground">
        نظر مسافرهایی که با تایلندگرد سفر کرده‌اند.
      </p>
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((t) => (
          <TravelerReviewCard
            key={`${t.name}|${t.tour}|${t.date}`}
            travelerName={t.name}
            tourName={t.tour}
            // اگر مسافر نمره‌ای ثبت نکرده باشد، کارت ۵ ستاره نشان می‌دهد
            // (مستندشده در lib/testimonials.ts).
            rating={t.rating ?? 5}
            comment={t.text}
            dateJalali={t.date}
            avatarUrl={t.avatarUrl}
          />
        ))}
      </div>
    </section>
  );
}
