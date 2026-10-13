import type * as React from "react";
import { Phone } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * فراخوان پایانی. A warm banner with one action; flat per حکم ۳ artdir (no radial halo, no pattern).
 * مبنا: blocks/cta رجیستری وایب‌فارسی. انحراف‌های مستند (DEVIATIONS.md):
 * - آیکون Phone به‌جای ArrowLeft (معنای درست دکمهٔ تماس در RTL؛ تأیید farsiui)
 * - action از نوع ReactNode تا شماره تلفن با dir="ltr" بیاید (دستور اصلاح ۲ farsiui)
 * - actionHref اختیاری برای لینک واقعی دکمه (مثل tel:)؛ بدون آن دکمه مثل آیتم است
 * - دکمه در موبایل تمام‌عرض (w-full sm:w-auto)؛ حکم بریف ۳
 * - D-219 (۱۴۰۵/۰۷/۲۱): تراکم ارتفاع (py-12 ‏→ py-8 بیرونی، py-14 ‏→ py-10 درونی)؛
 *   کارت CTA در /tours فضای خالیِ ناجورِ بالا و پایین داشت (راستی بصری میرزا)
 * - D-112 (۱۴۰۵/۰۷/۲۱): دکمهٔ اصلی مسیر فروش variant="brand"؛ پنجمین نمونهٔ خانوادهٔ D-109
 *   (هدر، هیرو، صفحهٔ تور، کارت تماس، نوار چسبان) که همگی کهربایی solid شدند.
 */
export function CtaBlock({ title, description, action = "تماس با مشاور سفر", actionHref, note, callContext }: { title: string; description?: string; action?: React.ReactNode; actionHref?: string; note?: string; callContext?: string }) {
  // D-209 (۱۴۰۵/۰۷/۲۱): آیکون در ابتدای خط (سمت راست در RTL)؛ هم‌خوان با
  // CallButtons (همان لیبل «تماس با مشاور سفر»)؛ قرارداد آیکونِ پیشرو.
  const inner = (
    <>
      <Phone aria-hidden />
      {action}
    </>
  );
  return (
    <section className="px-6 py-8">
      <div className="relative mx-auto max-w-5xl overflow-hidden rounded-surface border border-border bg-card px-6 py-10 text-center sm:px-12">
        <div className="relative">
          <h2 className="text-balance text-3xl sm:text-4xl">{title}</h2>
          {description && <p className="mx-auto mt-4 max-w-xl text-muted-foreground">{description}</p>}
          {actionHref ? (
            <Button asChild size="lg" variant="brand" className="mt-8 w-full rounded-full px-7 sm:w-auto">
              <a href={actionHref} data-call-context={callContext}>{inner}</a>
            </Button>
          ) : (
            <Button size="lg" variant="brand" className="mt-8 w-full rounded-full px-7 sm:w-auto">{inner}</Button>
          )}
          {note && <p className="mt-4 text-xs text-muted-foreground">{note}</p>}
        </div>
      </div>
    </section>
  );
}
