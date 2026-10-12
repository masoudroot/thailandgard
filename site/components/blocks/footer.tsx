/**
 * پابرگ. دست‌ساز می‌ماند: سال شمسی ثابت ۱۴۰۵ است چون نسخهٔ رجیستری
 * با new Date() سال را زنده حساب می‌کند و در پیش‌رندر استاتیک Next خطا می‌دهد.
 * هر نوروز به‌روز شود.
 */
import { fa } from "@/lib/utils";

export interface FooterColumn { title: string; links: { label: string; href: string; ariaLabel?: string }[] }

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
    <footer className="border-t border-border bg-card px-6 py-12">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5">
        <div className="col-span-2 sm:col-span-3 lg:col-span-2">
          <div className="text-base font-bold">{logo}</div>
          {description && <p className="mt-3 max-w-xs text-sm leading-7 text-muted-foreground">{description}</p>}
          {seals && <div className="mt-5 flex flex-wrap items-center gap-3">{seals}</div>}
        </div>
        {columns.map((c) => (
          <nav key={c.title} aria-label={c.title}>
            <h3 className="text-sm font-semibold">{c.title}</h3>
            <ul className="mt-3 space-y-2">
              {c.links.map((l) => <li key={l.label}><a href={l.href} aria-label={l.ariaLabel} className="text-sm text-muted-foreground transition-colors hover:text-foreground">{l.label}</a></li>)}
            </ul>
          </nav>
        ))}
      </div>
      <div className="mx-auto mt-10 flex max-w-6xl flex-col gap-2 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>{copyright ?? `© ${year} تمام حقوق محفوظ است.`}</p>
        <p>ساخته‌شده با وایب‌فارسی</p>
      </div>
    </footer>
  );
}