import { ArrowLeft, Clock, MapPin, Star } from "lucide-react";

interface TourCardProps {
  tour: {
    id: string;
    title: string;
    city: string;
    nights: number;
    price: number;
    imageUrl: string;
    rating: number;
    isBestseller: boolean;
  };
  onReserve: (id: string) => void;
  className?: string;
}

function toPersianNumber(num: number): string {
  const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  return num
    .toString()
    .replace(/\d/g, (d) => persianDigits[parseInt(d, 10)]);
}

function formatPersianPrice(price: number): string {
  const parts = price.toString().split(/(?=(?:\d{3})+$)/);
  const persianParts = parts.map((part) => toPersianNumber(parseInt(part, 10)));
  return persianParts.join("٬");
}

export function TourCard({ tour, onReserve, className = "" }: TourCardProps) {
  const handleReserve = () => {
    onReserve(tour.id);
  };

  return (
    <div
      className={`bg-background border rounded-[22px] overflow-hidden transition duration-200 hover:border-muted-foreground/30 ${className}`}
    >
      <div className="relative">
        <img
          src={tour.imageUrl}
          alt={tour.title}
          className="w-full h-48 object-cover"
        />
        {tour.isBestseller && (
          <span className="absolute top-3 end-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-foreground">
            پرفروش
          </span>
        )}
        <div className="absolute bottom-3 start-3 inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-background/90 text-foreground text-sm">
          <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
          <span className="font-iransans">{toPersianNumber(tour.rating)}</span>
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-pinar font-bold text-foreground text-base leading-snug line-clamp-2">
          {tour.title}
        </h3>

        <div className="mt-2 flex items-center gap-1 text-muted-foreground text-sm">
          <MapPin className="w-4 h-4" />
          <span className="font-iransans">{tour.city}</span>
        </div>

        <div className="mt-2 flex items-center gap-1 text-muted-foreground text-sm">
          <Clock className="w-4 h-4" />
          <span className="font-iransans">
            {toPersianNumber(tour.nights)} شب
          </span>
        </div>

        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground font-iransans">
              شروع قیمت
            </span>
            <span className="font-iransans font-bold text-foreground text-lg">
              {formatPersianPrice(tour.price)} تومان
            </span>
          </div>
        </div>

        <button
          onClick={handleReserve}
          className="mt-3 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-foreground text-background font-iransans text-sm font-medium transition duration-200 hover:bg-foreground/90"
        >
          <span>رزرو تور</span>
          <ArrowLeft className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
