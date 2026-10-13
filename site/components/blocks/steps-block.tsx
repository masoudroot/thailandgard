import type * as React from "react";
import { cn, fa } from "@/lib/utils";

export interface Step { title: string; description: string; icon?: React.ComponentType<{ className?: string }> }

/** مراحل کار. Numbered steps with Persian digits joined by a dashed line on desktop. */
export function StepsBlock({ eyebrow, title, steps, gridClassName = "md:grid-cols-2 lg:grid-cols-4" }: {
  eyebrow?: string;
  title?: string;
  steps: Step[];
  /**
   * کلاس گرید قدم‌ها؛ پیش‌فرض همان `md:grid-cols-2 lg:grid-cols-4` پورت است.
   * (یافتهٔ F-1 وایب‌فارسی: تغییر گرید مشترک چیدمان ۴ قدم صفحهٔ راهنما را
   * می‌شکند؛ پس گرید فقط از همین پراپ اختیاری رویِ صفحهٔ موردنظر عوض می‌شود.)
   */
  gridClassName?: string;
}) {
  return (
    <section className="px-6 py-16">
      {(eyebrow || title) && (
        <div className="mx-auto mb-12 max-w-2xl text-center">
          {eyebrow && <p className="inline-flex items-center gap-2 rounded-full bg-brand/15 px-3 py-1 text-xs font-semibold text-brand-foreground">{eyebrow}</p>}
          {title && <h2 className="mt-2 text-3xl">{title}</h2>}
        </div>
      )}
      <div className="relative mx-auto max-w-5xl">
        {/* خط نقطه‌چین اتصال‌دهنده: بیرون ol است چون فقط li/script/template فرزند معتبر ol هستند (F-002 بازرس) */}
        <div aria-hidden className="absolute inset-x-[16%] top-6 hidden border-t border-dashed border-border lg:block" />
        <ol className={cn("grid gap-10", gridClassName)}>
          {steps.map((s, i) => (
            <li key={s.title} className="relative flex flex-col items-center text-center">
              <span className="flex size-12 items-center justify-center rounded-full border border-border bg-card text-lg font-bold tabular-nums">
                {s.icon ? <s.icon className="size-5" /> : fa(i + 1)}
              </span>
              <h3 className="mt-4 font-semibold">{s.title}</h3>
              <p className="mt-1.5 max-w-xs text-sm leading-7 text-muted-foreground">{s.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}