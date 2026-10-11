import type * as React from "react";
import { fa } from "@/lib/utils";

export interface Step { title: string; description: string; icon?: React.ComponentType<{ className?: string }> }

/** مراحل کار. Numbered steps with Persian digits joined by a dashed line on desktop. */
export function StepsBlock({ eyebrow, title, steps }: { eyebrow?: string; title?: string; steps: Step[] }) {
  return (
    <section className="px-6 py-16">
      {(eyebrow || title) && (
        <div className="mx-auto mb-12 max-w-2xl text-center">
          {eyebrow && <p className="text-sm font-semibold text-brand">{eyebrow}</p>}
          {title && <h2 className="mt-2 text-3xl font-bold">{title}</h2>}
        </div>
      )}
      <div className="relative mx-auto max-w-5xl">
        {/* خط نقطه‌چین اتصال‌دهنده: بیرون ol است چون فقط li/script/template فرزند معتبر ol هستند (F-002 بازرس) */}
        <div aria-hidden className="absolute inset-x-[16%] top-6 hidden border-t border-dashed border-border lg:block" />
        <ol className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.title} className="relative flex flex-col items-center text-center">
              <span className="flex size-12 items-center justify-center rounded-full border border-border bg-card text-lg font-bold tabular-nums shadow-sm">
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