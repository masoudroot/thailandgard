import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * بنر الف: اسلات هیروی خانه (کمپین «پنجرهٔ اکتبر»).
 * الگو blocks/cta + حکم ۳ artdir: هالهٔ گرادیان رادیال برند حذف شده؛
 * پس‌زمینه تخت خنثی؛ تفکیک فقط با کادر مویی ۱px؛ هیچ جلوهٔ جایگزینی
 * (سایه/بافت/شیب/پترن) مجاز نیست؛ فقط یک کهربایی = فیل CTA.
 * حکم ۳؛ بازنگری با رسیدن عکس واقعی مقصد.
 */
export function OctoberBanner() {
  return (
    <section className="px-6 pt-14">
      <div className="mx-auto max-w-6xl rounded-surface border border-border bg-card px-6 py-12 text-center sm:py-16">
        <p className="text-sm text-muted-foreground">۱۰ تا ۱۸ اکتبر (۱۸ تا ۲۶ مهر)</p>
        <h1 className="mt-3 text-balance font-display text-4xl sm:text-5xl">
          <span className="whitespace-nowrap">پنجرهٔ اکتبر</span> پوکت
        </h1>
        <p className="mx-auto mt-4 max-w-xl leading-[1.8] text-muted-foreground">
          ۳ رویداد تقویمی؛ پرواز مستقیم از ۱۸ اکتبر
        </p>
        <Button asChild size="lg" variant="brand" className="mt-8 rounded-full px-7">
          {/* S-103 بسته شد (۲۱ مهر ۱۴۰۵، نبض دیزاین): راهنمای اکتبر منتشر شد
              (/guide/phuket-in-october، زنده) و /phuket-october حالا به همین
              راهنما ریدایرکت می‌شود؛ لینک مستقیم به مقصد نهایی نشست
              (تصمیم کانونیکال ۲۲:۴۵: «پوکت در اکتبر» فقط همین راهنما). */}
          <Link href="/guide/phuket-in-october">
            جزئیات پروازهای اکتبر
            <ArrowLeft aria-hidden />
          </Link>
        </Button>
      </div>
    </section>
  );
}
