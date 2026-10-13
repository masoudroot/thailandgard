/**
 * پرسش‌های متداول. دست‌ساز می‌ماند: محتوای هر آیتم ReactNode است نه
 * فقط string (آیتم رجیستری فقط string می‌پذیرد) و تیتر در موبایل
 * یک پله کوچک‌تر می‌شود.
 */
import type { ReactNode } from "react";
import { Accordion } from "@/components/ui/accordion";

/** پرسش‌های متداول. چیدمان: هدینگ بالا + آکاردئون تمام‌عرض (حداکثر ۷۲۰px، راست‌چین)؛ حکم M2 ممیزی سخت‌گیرانهٔ ۱۶:۳۰. */
import { wrapLatinTerms } from "@/lib/inline-links";

export function FaqBlock({ title = "پرسش‌های متداول", description = "اگر جواب‌تان این‌جا نیست، بپرسید؛ معمولاً در یک روز کاری جواب می‌دهیم.", items, defaultOpen, toggleIcon, contentBlock }: { title?: string; description?: string; items: { id: string; title: string; content: ReactNode }[]; defaultOpen?: string[]; toggleIcon?: "chevron" | "plus-minus"; contentBlock?: boolean }) {
  return (
    <section className="px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-balance text-2xl sm:text-3xl">{title}</h2>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">{description}</p>
        {/* یافتهٔ F-089 (farsiui): واژه‌های لاتین تیتر پرسش (مثل TDAC) ایزولهٔ LTR می‌گیرند؛
            همان قاعدهٔ F-091 که روی جواب‌ها اعمال می‌شود. */}
        <div className="mt-8 max-w-[720px]"><Accordion items={items.map((it) => ({ ...it, title: wrapLatinTerms(it.title) }))} defaultOpen={defaultOpen ?? [items[0]?.id]} toggleIcon={toggleIcon} contentBlock={contentBlock} /></div>
      </div>
    </section>
  );
}