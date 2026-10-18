import { ArrowLeft, MapPin, Moon } from "lucide-react";

interface ThailandTourCardProps {
  title: string;
  destination: string;
  price: number;
  nights: number;
  imageUrl: string;
  badgeText?: string;
  onReserve: () => void;
}

function toPersianNumber(num: number): string {
  const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  return num
    .toString()
    .replace(/\d/g, (d) => persianDigits[parseInt(d, 10)]);
}

function formatPrice(price: number): string {
  const parts = price.toLocaleString("en-US").split(",");
  return parts.map((part) => toPersianNumber(parseInt(part, 10))).join("٬");
}

export function ThailandTourCard({
  title,
  destination,
  price,
  nights,
  imageUrl,
  badgeText,
  onReserve,
}: ThailandTourCardProps) {
  return (
    <div className="group flex flex-col overflow-hidden rounded-[22px] border border-border bg-background transition duration-200 hover:border-muted-foreground/30">
      <div className="relative aspect-[16/10] overflow-hidden">
        <img
          src={imageUrl}
          alt={title}
          className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
        />
        {badgeText && (
          <span className="absolute start-3 top-3 rounded-lg bg-muted px-2 py-1 text-sm font-medium text-foreground">
            {badgeText}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <h3 className="font-pinar text-lg font-bold leading-tight text-foreground">
          {title}
        </h3>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span className="font-iransans">{destination}</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Moon className="h-4 w-4" />
          <span className="font-iransans">
            {toPersianNumber(nights)} شب
          </span>
        </div>
        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <div className="flex flex-col items-start gap-0.5">
            <span className="text-xs text-muted-foreground font-iransans">
              قیمت از
            </span>
            <span className="font-pinar text-lg font-bold text-foreground">
              {formatPrice(price)} تومان
            </span>
          </div>
          <button
            onClick={onReserve}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition duration-200 hover:bg-muted hover:text-foreground"
          >
            <span className="font-iransans">رزرو</span>
            <ArrowLeft className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
