import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/**
 * بنر ب: مستطیلی درون‌صفحه‌ای (بین سکشن‌های خانه/تورها).
 * الگو blocks/banner + حکم ۴ artdir: بدون دکمهٔ بستن و بدون یادآوری
 * localStorage (فقط بنر بین‌سکشنی؛ نوار بالای هدر تابع رجیستری می‌ماند)؛
 * بدون دکمهٔ فیل‌دار؛ تم خنثی؛ افکت بید ممنوع.
 * گاردریل ریتم عمودی موبایل: پیام می‌تواند دوخطی شود (لینک روی خط دوم)،
 * قلم یک پله کوچک‌تر، line-height قفل ۱.۵، پدینگ عمودی حداکثر py-3،
 * تراز حتماً راست‌چین.
 */
export function SeasonBanner() {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3 text-start">
        <p className="text-sm leading-[1.5] text-foreground/90 sm:text-base">
          ۱۸ اکتبر (۲۶ مهر)؛ ۳ پرواز هفتگی تازه به پوکت
          <br className="sm:hidden" />
          <Link
            href="/phuket-october"
            className="mr-0 font-semibold text-foreground underline decoration-border decoration-1 underline-offset-4 transition-[text-decoration-color] duration-200 hover:decoration-foreground sm:mr-2"
          >
            دیدن پنجرهٔ اکتبر
            <ArrowLeft aria-hidden className="mr-1 inline size-4" />
          </Link>
        </p>
    </div>
  );
}
