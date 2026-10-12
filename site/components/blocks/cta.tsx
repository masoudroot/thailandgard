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
 */
export function CtaBlock({ title, description, action = "تماس با کارشناس فروش", actionHref, note, callContext }: { title: string; description?: string; action?: React.ReactNode; actionHref?: string; note?: string; callContext?: string }) {
  const inner = (
    <>
      {action}
      <Phone />
    </>
  );
  return (
    <section className="px-6 py-12">
      <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl border border-border bg-card px-6 py-14 text-center sm:px-12">
        <div className="relative">
          <h2 className="text-3xl sm:text-4xl">{title}</h2>
          {description && <p className="mx-auto mt-4 max-w-xl text-muted-foreground">{description}</p>}
          {actionHref ? (
            <Button asChild size="lg" className="mt-8 w-full rounded-full px-7 sm:w-auto">
              <a href={actionHref} data-call-context={callContext}>{inner}</a>
            </Button>
          ) : (
            <Button size="lg" className="mt-8 w-full rounded-full px-7 sm:w-auto">{inner}</Button>
          )}
          {note && <p className="mt-4 text-xs text-muted-foreground">{note}</p>}
        </div>
      </div>
    </section>
  );
}
