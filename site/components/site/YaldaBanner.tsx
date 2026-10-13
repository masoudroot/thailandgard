import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getSiteSettings } from "@/lib/db-content";

/**
 * بنر یلدا؛ قالب ب: مستطیلی درون‌صفحه‌ای (تایپوگرافیک خالص، بدون عکس).
 *
 * بریف: agents/design/BRIEFS/yalda-banner-mount-addendum-2026-10-13-08.md
 * (الحاقیهٔ اجرای ۰۸) + حکم‌های ۱ تا ۴ برندینگ + حکم‌های ۳۱/۳۲/۳۳ design-ir.
 *
 * - نگاشت: blocks/cta + انحراف آگاهانهٔ «اکشن = لینک متنی با پیکان ArrowLeft
 *   (جهت پیش‌رو در RTL)، نه Button» (الگوی لینک متنی D-127).
 * - ترتیب محتوا (راست‌به‌چپ): بج «۳۰ آذر» ← تیتر ← جملهٔ گرم ← CTA متنی.
 * - تنها کهربایی بنر = بج تاریخ «۳۰ آذر» با پیل مصوب برند
 *   (bg-brand/15 text-brand-foreground).
 * - حذف‌های صریح (حکم ۲ برندینگ): هالهٔ رادیال حذف؛ trust note حذف؛
 *   اکشن فیل‌دار حذف.
 * - تیتر نهایی (حکم ۳ برندینگ، حکم ۳۱ design-ir بسته): «یلدا زیر آفتاب پوکت».
 * - لیبل CTA (حکم ۱ برندینگ، حکم ۳۲ design-ir): «تماس با مشاور سفر».
 */
export async function YaldaBanner() {
  const { PHONE_MOBILE_LINK } = await getSiteSettings();
  return (
    <section aria-label="پیشنهاد یلدا" className="mt-10">
      <div className="rounded-surface border border-border bg-card px-6 py-8 sm:px-8">
        <Badge variant="brand" className="bg-brand/15 text-brand-foreground">
          ۳۰ آذر
        </Badge>
        <h2 className="text-balance mt-4 font-display text-2xl sm:text-3xl">یلدا زیر آفتاب پوکت</h2>
        <p className="mt-3 max-w-2xl leading-[1.9] text-muted-foreground">
          بلندترین شب سال را زیر آفتاب پوکت بگذرانید؛ مشاور سفر برنامه‌تان را می‌چیند.
        </p>
        <a
          href={PHONE_MOBILE_LINK}
          data-call-context="yalda-banner"
          className="mt-5 inline-flex items-center gap-2 text-base font-semibold text-foreground underline decoration-brand/60 underline-offset-4 transition-[text-decoration-color] duration-200 hover:decoration-brand"
        >
          تماس با مشاور سفر
          <ArrowLeft aria-hidden className="size-4" />
        </a>
      </div>
    </section>
  );
}
