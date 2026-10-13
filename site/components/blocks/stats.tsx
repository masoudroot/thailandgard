import { cn } from "@/lib/utils";

export interface StatItem { value: string; label: string; hint?: string }

/** آمار. A strip of key numbers with hairline dividers; numbers should already be Persian. */
export function StatsBlock({ items, className }: { items: StatItem[]; className?: string }) {
  return (
    <section className={cn("px-6 py-12", className)}>
      <dl className="mx-auto grid max-w-5xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border lg:grid-cols-4">
        {items.map((s) => (
          <div key={s.label} className="flex flex-col bg-card p-6 text-center">
            <dt className="order-2 mt-1 text-sm text-muted-foreground">{s.label}</dt>
            <dd className="order-1 text-3xl font-bold tabular-nums">{s.value}</dd>
            {s.hint && (
              <dd className="order-3 mt-1 text-xs text-muted-foreground">{s.hint}</dd>
            )}
          </div>
        ))}
      </dl>
    </section>
  );
}