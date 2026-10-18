import { MapPin, Calendar, ArrowLeft } from "lucide-react";
import { TourPriceTag } from "./tour-price-tag";

function toPersianNumber(value: number): string {
  return new Intl.NumberFormat("fa", { maximumFractionDigits: 0 }).format(value);
}

export interface TourCardProps {
  title: string;
  image: string;
  destination: string;
  duration: number;
  price: number;
  originalPrice?: number;
  href?: string;
}

export function TourCard({
  title,
  image,
  destination,
  duration,
  price,
  originalPrice,
  href = "#",
}: TourCardProps) {
  return (
    <a
      href={href}
      className="group flex flex-col overflow-hidden border bg-background rounded-[22px] transition duration-200 hover:bg-muted"
      dir="rtl"
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <img
          src={image}
          alt={title}
          className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
        />
      </div>
      <div className="flex flex-col gap-3 p-4">
        <h3 className="font-pinar text-lg font-bold text-foreground line-clamp-2">
          {title}
        </h3>
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground font-iransans">
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            {destination}
          </span>
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {toPersianNumber(duration)} شب
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <TourPriceTag price={price} originalPrice={originalPrice} label="از" />
          <span className="inline-flex items-center gap-1 text-sm font-medium text-foreground font-iransans transition duration-200 group-hover:text-amber-600">
            مشاهدهٔ جزئیات
            <ArrowLeft className="h-4 w-4" />
          </span>
        </div>
      </div>
    </a>
  );
}
