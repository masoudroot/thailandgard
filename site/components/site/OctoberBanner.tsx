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
    <section className="px-6 pt-10">
      <div className="mx-auto max-w-6xl rounded-surface border border-border bg-card px-6 py-12 text-center sm:py-16">
        <p className="text-sm text-muted-foreground">۱۰ تا ۱۸ اکتبر</p>
        <h1 className="mt-3 font-display text-4xl font-bold leading-tight sm:text-5xl">
          پنجرهٔ اکتبر پوکت
        </h1>
        <p className="mx-auto mt-4 max-w-xl leading-8 text-muted-foreground">
          ۳ رویداد تقویمی؛ پرواز مستقیم از ۱۸ اکتبر
        </p>
        <Button asChild size="lg" variant="brand" className="mt-8 rounded-full px-7">
          <Link href="/phuket-october">
            دیدن پنجرهٔ اکتبر
            <ArrowLeft />
          </Link>
        </Button>
      </div>
    </section>
  );
}
