/**
 * پابرگ. دست‌ساز می‌ماند: سال شمسی ثابت ۱۴۰۵ است چون نسخهٔ رجیستری
 * با new Date() سال را زنده حساب می‌کند و در پیش‌رندر استاتیک Next خطا می‌دهد.
 * هر نوروز به‌روز شود.
 */
import { fa } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface FooterColumn { title: string; links: { label: React.ReactNode; href: string; ariaLabel?: string; /** D-104: لینک تماسی که باید دکمه باشد (مثل تلفن ثابت ستون تماس)؛ رندر secondary کوچک به‌جای لینک متنی */ button?: boolean }[] }

export interface FooterProps {
  logo: React.ReactNode;
  description?: string;
  columns: FooterColumn[];
  /** Slots for trust seals (e-namad, samandehi) or social icons; rendered as-is. */
  seals?: React.ReactNode;
  copyright?: string;
}

/** پابرگ. Brand column on the right, link columns beside it, Jalali copyright line at the bottom. */
export function FooterBlock({ logo, description, columns, seals, copyright }: FooterProps) {
  // سال شمسی ثابت است چون new Date() در پیش‌رندر استاتیک Next مجاز نیست؛ هر نوروز به‌روز شود.
  const year = fa(1405);
  return (
    <footer className="relative overflow-hidden bg-card px-6 py-14">
      {/* خط مویی گرم برند به‌جای مرز سرد بالا: ورود نرم به فوتر */}
      <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-brand/50 to-transparent" />
      {/* هالهٔ گرم ملایم پشت ستون برند: نفس انسانی، نه صفحهٔ اداری */}
      <div aria-hidden className="pointer-events-none absolute -top-28 start-[-12rem] size-[26rem] rounded-full bg-brand/[0.07] blur-3xl" />
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5">
        <div className="col-span-2 sm:col-span-3 lg:col-span-2">
          <div className="text-base font-bold">{logo}</div>
          {description && <p className="mt-3 max-w-xs text-sm leading-7 text-muted-foreground">{description}</p>}
          {seals && <div className="mt-5 flex flex-wrap items-center gap-3">{seals}</div>}
        </div>
        {columns.map((c) => (
          <nav key={c.title} aria-label={c.title}>
            <h3 className="text-sm font-semibold">{c.title}</h3>
            <ul className="mt-3 space-y-2.5">
              {c.links.map((l) => (
                <li key={l.href}>
                  {l.button ? (
                    <Button asChild variant="secondary" size="sm">
                      <a href={l.href} aria-label={l.ariaLabel}>{l.label}</a>
                    </Button>
                  ) : (
                    <a href={l.href} aria-label={l.ariaLabel} className="text-sm text-muted-foreground transition-[color,transform] hover:-translate-x-0.5 hover:text-brand-foreground">{l.label}</a>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="mx-auto mt-12 flex max-w-6xl flex-col gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>{copyright ?? `© ${year} تمام حقوق محفوظ است.`}</p>
        <p className="inline-flex items-center gap-2">
          <span aria-hidden className="inline-block size-1.5 rounded-full bg-brand" />
          <span className="text-brand-foreground">همسفر بلد تایلند شما</span>
        </p>
      </div>
    </footer>
  );
}