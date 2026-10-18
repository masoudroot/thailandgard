import { ArrowRight, Calendar, MapPin, Star } from "lucide-react";

interface Tour {
  id: string;
  title: string;
  destination: string;
  durationNights: number;
  priceToman: number;
  oldPriceToman?: number;
  rating: number;
  imageSrc: string;
  imageAlt: string;
  badges?: string[];
}

interface ThailandTourCardProps {
  tour: Tour;
  onOpenDetails?: (id: string) => void;
  className?: string;
}

function toPersianNumber(num: number): string {
  const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  return num
    .toString()
    .replace(/\d/g, (digit) => persianDigits[parseInt(digit)]);
}

function formatPrice(price: number): string {
  const persian = toPersianNumber(price);
  return persian.replace(/(\d)(?=(\d{3})+$)/g, "$1٬");
}

export function ThailandTourCard({
  tour,
  onOpenDetails,
  className,
}: ThailandTourCardProps) {
  const handleOpenDetails = () => {
    if (onOpenDetails) {
      onOpenDetails(tour.id);
    }
  };

  return (
    <div
      className={`group flex flex-col bg-background border rounded-[22px] overflow-hidden transition-all duration-200 hover:border-amber-500/50 ${className || ""}`}
    >
      {/* Image Section */}
      <div className="relative aspect-[16/10] overflow-hidden">
        <img
          src={tour.imageSrc}
          alt={tour.imageAlt}
          className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
        />
        {tour.badges && tour.badges.length > 0 && (
          <div className="absolute top-3 end-3 flex flex-col gap-1.5">
            {tour.badges.map((badge, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2.5 py-1 bg-background/90 backdrop-blur-sm text-foreground text-xs font-medium rounded-lg border"
              >
                {badge}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="flex flex-col flex-1 p-4 gap-3">
        {/* Title */}
        <h3 className="font-pinar font-bold text-foreground text-base leading-relaxed line-clamp-2">
          {tour.title}
        </h3>

        {/* Info Rows */}
        <div className="flex flex-col gap-2">
          {/* Destination */}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-sm">مقصد</span>
            <div className="flex items-center gap-1 text-foreground text-sm">
              <MapPin className="w-3.5 h-3.5" />
              <span>{tour.destination}</span>
            </div>
          </div>

          {/* Duration */}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-sm">مدت اقامت</span>
            <div className="flex items-center gap-1 text-foreground text-sm">
              <Calendar className="w-3.5 h-3.5" />
              <span>{toPersianNumber(tour.durationNights)} شب</span>
            </div>
          </div>

          {/* Rating */}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-sm">امتیاز</span>
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              <span className="text-foreground text-sm font-medium">
                {toPersianNumber(tour.rating)}
              </span>
            </div>
          </div>
        </div>

        {/* Separator */}
        <div className="border-t" />

        {/* Price Section */}
        <div className="flex flex-col gap-1">
          {tour.oldPriceToman !== undefined && tour.oldPriceToman > tour.priceToman && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs">قیمت قبل</span>
              <span className="text-muted-foreground text-sm line-through">
                {formatPrice(tour.oldPriceToman)} تومان
              </span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-sm">قیمت نهایی</span>
            <span className="text-amber-600 font-bold text-lg">
              {formatPrice(tour.priceToman)} تومان
            </span>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleOpenDetails}
          className="flex items-center justify-center gap-2 w-full mt-1 py-2.5 px-4 bg-foreground text-background font-medium text-sm rounded-lg transition-colors duration-200 hover:bg-foreground/90"
        >
          <span>مشاهده جزئیات تور</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
