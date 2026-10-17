import { ArrowRight, Clock, MapPin, Star } from "lucide-react";

interface Tour {
  id: string;
  title: string;
  destination: string;
  durationNights: number;
  price: number;
  imageUrl: string;
  rating?: number;
  isBestSeller?: boolean;
}

interface TourCardProps {
  tour: Tour;
  onReserve?: (id: string) => void;
  className?: string;
}

function toPersianNumber(num: number): string {
  const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  return num.toString().replace(/\d/g, (d) => persianDigits[parseInt(d)]);
}

function formatPersianPrice(price: number): string {
  const formatted = price.toLocaleString("en-US");
  const persianFormatted = toPersianNumber(parseInt(formatted.replace(/,/g, "")));
  const withCommas = persianFormatted.replace(/\B(?=(\d{3})+(?!\d))/g, "٬");
  return `${withCommas} تومان`;
}

export function TourCard({ tour, onReserve, className }: TourCardProps) {
  const handleReserve = () => {
    if (onReserve) {
      onReserve(tour.id);
    }
  };

  return (
    <div
      className={`group flex flex-col bg-background border border-border rounded-2xl overflow-hidden transition-all duration-200 hover:border-muted-foreground ${className || ""}`}
    >
      <div className="relative overflow-hidden">
        <img
          src={tour.imageUrl}
          alt={tour.title}
          className="w-full h-48 object-cover transition-transform duration-200 group-hover:scale-105"
        />
        {tour.isBestSeller && (
          <span className="absolute top-3 end-3 inline-flex items-center px-2.5 py-0.5 rounded-lg bg-muted text-foreground text-xs font-pinar font-bold">
            پرفروش
          </span>
        )}
      </div>

      <div className="flex flex-col flex-1 p-4 gap-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-pinar font-bold text-foreground text-base leading-relaxed line-clamp-2 flex-1">
            {tour.title}
          </h3>
          {tour.rating !== undefined && tour.rating > 0 && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
              <span className="text-sm text-foreground font-iransans">
                {toPersianNumber(tour.rating)}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <MapPin className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm font-iransans">{tour.destination}</span>
          </div>

          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm font-iransans">
              {toPersianNumber(tour.durationNights)} شب اقامت
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 pt-2 mt-auto border-t border-border">
          <span className="font-pinar font-bold text-foreground text-base">
            {formatPersianPrice(tour.price)}
          </span>

          <button
            onClick={handleReserve}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-background text-foreground border border-border rounded-lg text-sm font-iransans font-medium transition-all duration-200 hover:bg-muted focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-border"
          >
            رزرو
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
