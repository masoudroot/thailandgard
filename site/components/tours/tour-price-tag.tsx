function toPersianNumber(value: number): string {
  return new Intl.NumberFormat("fa", { maximumFractionDigits: 0 }).format(value);
}

export interface TourPriceTagProps {
  price: number;
  originalPrice?: number;
  currency?: string;
  label?: string;
  className?: string;
}

export function TourPriceTag({
  price,
  originalPrice,
  currency = "تومان",
  label,
  className,
}: TourPriceTagProps) {
  const hasDiscount =
    typeof originalPrice === "number" && originalPrice > price;
  const discountPercent = hasDiscount
    ? Math.round((1 - price / originalPrice) * 100)
    : 0;

  return (
    <div
      className={[
        "inline-flex items-center gap-1.5 border bg-background rounded-lg px-3 py-1.5 transition duration-200",
        className ?? "",
      ].join(" ")}
      dir="rtl"
    >
      {label ? (
        <span className="text-xs text-muted-foreground font-iransans">
          {label}
        </span>
      ) : null}
      <div className="flex items-center gap-2">
        {hasDiscount ? (
          <span className="text-sm text-muted-foreground line-through font-iransans">
            {toPersianNumber(originalPrice)} {currency}
          </span>
        ) : null}
        <span className="text-base font-bold text-foreground font-pinar">
          {toPersianNumber(price)} {currency}
        </span>
      </div>
      {hasDiscount ? (
        <span className="inline-flex items-center rounded-md bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-amber-600 font-iransans">
          {toPersianNumber(discountPercent)}٪ تخفیف
        </span>
      ) : null}
    </div>
  );
}
