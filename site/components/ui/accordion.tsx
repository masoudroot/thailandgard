"use client";

/**
 * آکاردئون. دست‌ساز می‌ماند چون چهار نیاز بومی دارد: آیتم disabled (مثلاً
 * «به‌زودی» در FAQ که باز نمی‌شود و کم‌رنگ است)، آیکون باز/بستهٔ انتخابی
 * (toggleIcon: شورون پیش‌فرض یا پلاس/منهای خطی)، محتوای بلوکی (contentBlock:
 * رپر div به‌جای p وقتی جواب FAQ لیست دارد تا HTML نامعتبر نشود)، و حلقهٔ
 * فوکوس دسترس‌پذیر روی دکمهٔ هر آیتم.
 */

import * as React from "react";
import { ChevronDown, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AccordionItem {
  id: string;
  title: React.ReactNode;
  content: React.ReactNode;
  /** آیتم غیرفعال: باز نمی‌شود و کم‌رنگ است (مثلاً آیتم «به‌زودی» در FAQ). */
  disabled?: boolean;
}

export interface AccordionProps {
  items: AccordionItem[];
  /** Allow several panels open at once. */
  multiple?: boolean;
  defaultOpen?: string[];
  className?: string;
  /**
   * آیکون باز/بسته (اسپک FAQ تور، ۲۰ مهر ۱۴۰۵): پیش‌فرض شورون؛
   * plus-minus پلاس/منهای خطی خنثی می‌گذارد (text-muted-foreground، بدون چرخش/جابه‌جایی افقی).
   */
  toggleIcon?: "chevron" | "plus-minus";
  /**
   * رپر محتوای آیتم (یافتهٔ vibefarsi، ۲۰ مهر ۱۴۰۵): پیش‌فرض p است؛ وقتی محتوا
   * بلوک است (مثل ul بولت‌های FAQ تور) باید div باشد وگرنه HTML نامعتبر می‌شود.
   */
  contentBlock?: boolean;
}

/** آکاردئون. Chevron at the inline-end; height animates with CSS grid, no measuring. */
export function Accordion({ items, multiple, defaultOpen = [], className, toggleIcon = "chevron", contentBlock = false }: AccordionProps) {
  const [open, setOpen] = React.useState<string[]>(defaultOpen);
  const toggle = (id: string) =>
    setOpen((o) => (o.includes(id) ? o.filter((x) => x !== id) : multiple ? [...o, id] : [id]));

  return (
    <div className={cn("divide-y divide-border rounded-xl border border-border bg-card", className)}>
      {items.map((it) => {
        const isOpen = open.includes(it.id);
        return (
          <div key={it.id} id={`item-${it.id}`} className="scroll-mt-24">
            {/* D-251: انکر اسکرول ایستگاه‌ها روی رپر بیرونی آیتم است (scroll-mt-24 تا سربرگ روز زیر نوبار چسبان نرود)؛
                id منطقهٔ محتوا (acc-…) برای aria-controls سر جایش می‌ماند. */}
            <h3>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={`acc-${it.id}`}
                disabled={it.disabled}
                onClick={() => toggle(it.id)}
                className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-start text-sm font-medium transition-colors hover:bg-accent/40 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {it.title}
                {toggleIcon === "plus-minus" ? (
                  isOpen ? (
                    <Minus aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <Plus aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                  )
                ) : (
                  <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform duration-200", isOpen && "rotate-180")} />
                )}
              </button>
            </h3>
            <div id={`acc-${it.id}`} className={cn("grid transition-[grid-template-rows] duration-200 ease-out", isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
              <div className="overflow-hidden">
                {/* وقتی contentBlock=true، جواب FAQ ممکن است بلوک (مثل ul) داشته باشد پس رپر div می‌شود؛ وگرنه p معنایی است */}
                {contentBlock ? (
                  <div className="px-4 pb-4 text-sm leading-7 text-muted-foreground">{it.content}</div>
                ) : (
                  <p className="px-4 pb-4 text-sm leading-7 text-muted-foreground">{it.content}</p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}