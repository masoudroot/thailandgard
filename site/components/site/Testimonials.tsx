import { Quote } from "lucide-react";
import { TESTIMONIALS } from "@/lib/testimonials";
import { Card, CardContent } from "@/components/ui/card";

/**
 * سکشن «حرف مسافران ما» (صفحهٔ خانه، بین راهنماها و نوار اعتماد).
 * سرور کامپوننت: اگر TESTIMONIALS خالی باشد null برمی‌گرداند؛ وگرنه
 * حداکثر ۶ نظر را در گرید ۳ ستونه نشان می‌دهد.
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
          <Card key={`${t.name}|${t.tour}|${t.date}`} className="h-full">
            <CardContent className="flex h-full flex-col gap-4 p-5">
              <Quote aria-hidden className="size-5 text-brand-foreground" />
              <p className="leading-7">{t.text}</p>
              <div className="mt-auto border-t border-border pt-4 text-sm">
                <p className="font-bold">{t.name}</p>
                <p className="mt-1 text-muted-foreground">
                  {t.tour} | {t.date}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
