import { Phone } from "lucide-react";

export interface UrgentCallButtonProps {
  label?: string;
  phone?: string;
  href?: string;
  badge?: string;
  className?: string;
}

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

function toPersianDigits(value: string): string {
  return value.replace(/\d/g, (digit) => PERSIAN_DIGITS[Number(digit)] ?? digit);
}

function formatPersianPhone(value: string): string {
  const digits = value.replace(/\D/g, "");

  if (digits.length === 11 && digits.startsWith("09")) {
    return toPersianDigits(
      `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`,
    );
  }

  if (digits.length === 11) {
    return toPersianDigits(
      `${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7)}`,
    );
  }

  if (digits.length === 10) {
    return toPersianDigits(
      `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`,
    );
  }

  if (digits.length === 8) {
    return toPersianDigits(`${digits.slice(0, 4)} ${digits.slice(4)}`);
  }

  return toPersianDigits(value.trim());
}

function toTelHref(phone: string, href?: string): string {
  if (href) {
    return href;
  }

  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

export function UrgentCallButton({
  label = "تماس فوری",
  phone = "02191002100",
  href,
  badge = "فوری",
  className,
}: UrgentCallButtonProps) {
  const displayPhone = formatPersianPhone(phone);
  const telHref = toTelHref(phone, href);
  const classes = [
    "flex w-full items-center justify-between gap-3 rounded-[22px] border bg-background px-4 py-3 text-foreground transition duration-200 hover:bg-muted focus-visible:outline-none focus-visible:border-amber-500",
    className,
  ]
    .filter((item): item is string => Boolean(item))
    .join(" ");

  return (
    <a href={telHref} dir="rtl" className={classes}>
      <span className="inline-flex items-center gap-2 text-start">
        <Phone className="size-4 shrink-0 text-amber-500" aria-hidden="true" />
        <span className="font-pinar text-base font-bold">{label}</span>
        {badge ? (
          <span className="inline-flex items-center rounded-lg border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 font-iransans text-xs text-amber-500">
            {badge}
          </span>
        ) : null}
      </span>
      <span dir="ltr" className="font-iransans text-sm text-foreground">
        {displayPhone}
      </span>
    </a>
  );
}
