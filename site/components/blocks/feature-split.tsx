import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SplitFeature {
  eyebrow?: string;
  title: string;
  description: string;
  bullets?: string[];
  /** Screenshot or illustration; a D-117 typographic placeholder is drawn when absent. */
  media?: React.ReactNode;
}

/** ویژگی دو ستونه. Text beside media, sides alternating row by row; stacks on mobile. */
export function FeatureSplit({ items }: { items: SplitFeature[] }) {
  return (
    <section className="px-6 py-16">
      <div className="mx-auto flex max-w-5xl flex-col gap-20">
        {items.map((f, i) => (
          <div key={f.title} className={cn("grid items-center gap-10 md:grid-cols-2", i % 2 === 1 && "md:[&>*:first-child]:order-last")}>
            <div>
              {/* تطبیق بریف artdir (اسپک ۱۴۰۵/۰۷/۲۱): روتیتر با الگوی «پل برند»
                  به‌جای text-brand تنها؛ یکدستی با steps-block */}
              {f.eyebrow && <p className="inline-flex items-center gap-2 rounded-full bg-brand/15 px-3 py-1 text-xs font-semibold text-brand-foreground">{f.eyebrow}</p>}
              {/* تطبیق بریف artdir: وزن تیتر از توکن تایپوگرافی font-display می‌آید؛
                  font-bold دستی ممنوع */}
              <h3 className="mt-2 text-2xl font-display text-balance sm:text-3xl">{f.title}</h3>
              <p className="mt-3 leading-8 text-muted-foreground">{f.description}</p>
              {f.bullets && (
                <ul className="mt-5 space-y-2 text-sm">
                  {f.bullets.map((b) => <li key={b} className="flex items-start gap-2"><Check className="mt-1 size-4 shrink-0 text-brand" />{b}</li>)}
                </ul>
              )}
            </div>
            <div className="aspect-[4/3] overflow-hidden rounded-2xl border border-border bg-secondary">
              {f.media ?? (
                /* D-212 (الگوی جای‌نگه‌دار تایپوگرافیک D-117): اگر مدیا داده نشد،
                   به‌جای قاب خالی، پوستر تایپوگرافیک عمدی با عنوان خود آیتم */
                <div aria-hidden className="flex size-full flex-col items-center justify-center gap-4 bg-secondary/40 px-8 text-center">
                  <span className="size-1.5 rotate-45 bg-brand/60" />
                  <span className="font-display text-2xl leading-relaxed text-foreground/55">{f.title}</span>
                  <span className="h-px w-12 bg-border" />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}