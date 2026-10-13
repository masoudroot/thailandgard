import { Fragment } from "react";
import { cn, faNumber, faPercent } from "@/lib/utils";

export interface PriceProps {
  /** مبلغ به تومان؛ null یعنی «قیمت نامشخص» و «تماس بگیرید» رندر می‌شود (دستور مسعود، ۱۴۰۵/۰۷/۲۰). */
  amount: number | null;
  /** Original price before discount; renders struck through with the computed percent. */
  original?: number;
  unit?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = { sm: "text-base", md: "text-2xl", lg: "text-4xl" };

/**
 * جداکنندهٔ هزارگان فارسی (٬) در وزن بولد روی ماسک عکس مثل کامای لاتین
 * خوانده می‌شود (D-102)؛ ارقام بولد می‌مانند و فقط جداکننده‌ها به وزن
 * عادی برمی‌گردند تا الگوی بصری «٬» همه‌جا یکدست بماند.
 */
function PriceDigits({ value }: { value: number }) {
  const parts = faNumber(value).split("٬");
  return (
    <>
      {parts.map((part, i) => (
        <Fragment key={i}>
          {i > 0 && <span className="font-normal">٬</span>}
          {part}
        </Fragment>
      ))}
    </>
  );
}

/** قیمت. Thousands separator «٬», unit after the number, discount computed for you. */
export function Price({ amount, original, unit = "تومان", size = "md", className }: PriceProps) {
  // قانون نمایش قیمت (دستور مسعود، ۱۴۰۵/۰۷/۲۰): بی‌قیمت ← «تماس بگیرید»؛ باقیمت ← «از X تومان».
  if (amount == null) {
    return (
      <span className={cn("font-bold", sizes[size], className)}>تماس بگیرید</span>
    );
  }
  const off = original && original > amount ? Math.round((1 - amount / original) * 100) : 0;
  return (
    <div className={cn("inline-flex flex-col", className)}>
      <span className="flex flex-wrap items-baseline gap-x-1.5">
        <span className="text-sm text-muted-foreground">از</span>
        <span className={cn("font-bold tabular-nums", sizes[size])}>
          <PriceDigits value={amount} />
        </span>
        <span className="text-sm text-muted-foreground">{unit}</span>
      </span>
      {off > 0 && (
        <span className="mt-0.5 flex items-center gap-2 text-xs">
          <span className="text-muted-foreground line-through tabular-nums">{faNumber(original!)}</span>
          <span className="rounded-full bg-foreground px-1.5 py-px text-xs font-semibold text-background">{faPercent(off)} تخفیف</span>
        </span>
      )}
    </div>
  );
}