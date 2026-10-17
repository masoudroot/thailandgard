import { MapPin, Clock, Star, ArrowLeft } from "lucide-react";

interface TourCardProps {
  title: string;
  destination: string;
  durationDays: number;
  price: number;
  rating: number;
  imageUrl: string;
  onBook?: () => void;
}

function toPersianNumber(num: number): string {
  const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  return num
    .toString()
    .split("")
    .map((char) => persianDigits[parseInt(char)] || char)
    .join("");
}

function formatPrice(price: number): string {
  const priceStr = price.toString();
  const parts: string[] = [];
  let remaining = priceStr;

  while (remaining.length > 3) {
    parts.unshift(remaining.slice(-3));
    remaining = remaining.slice(0, -3);
  }
  parts.unshift(remaining);

  const joined = parts.join("٬");
  return toPersianNumber(parseInt(joined.replace(/٬/g, "")));
}

export function TourCard({
  title,
  destination,
  durationDays,
  price,
  rating,
  imageUrl,
  onBook,
}: TourCardProps) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div className="bg-background border rounded-[22px] overflow-hidden transition duration-200 hover:bg-muted">
      <div className="relative">
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-48 object-cover"
        />
        <div className="absolute top-3 end-3">
          <span className="inline-flex items-center gap-1 bg-background border rounded-lg px-2 py-1 text-sm font-medium">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            <span className="font-pinar font-bold">{toPersianNumber(Math.round(rating * 10) / 10)}</span>
          </span>
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <h3 className="font-pinar font-bold text-lg text-foreground leading-tight">
            {title}
          </h3>
        </div>
        <div className="flex items-center gap-1 mb-3">
          <MapPin className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{destination}</span>
        </div>
        <div className="border-t pt-3 mb-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">مدت:</span>
            </div>
            <span className="font-iransans font-medium text-foreground">
              {toPersianNumber(durationDays)} روز
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">قیمت:</span>
            <span className="font-iransans font-bold text-foreground">
              {formatPrice(price)} تومان
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 mb-3">
          {Array.from({ length: fullStars }).map((_, index) => (
            <Star
              key={`full-${index}`}
              className="w-4 h-4 fill-amber-400 text-amber-400"
            />
          ))}
          {hasHalfStar && (
            <Star className="w-4 h-4 fill-amber-400/50 text-amber-400" />
          )}
          {Array.from({ length: emptyStars }).map((_, index) => (
            <Star
              key={`empty-${index}`}
              className="w-4 h-4 text-muted-foreground"
            />
          ))}
        </div>
        <button
          onClick={onBook}
          className="w-full inline-flex items-center justify-center gap-2 bg-background border rounded-lg px-4 py-2.5 text-sm font-medium text-foreground transition duration-200 hover:bg-muted"
        >
          <span>رزرو تور</span>
          <ArrowLeft className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
