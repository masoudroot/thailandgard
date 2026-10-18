import Image from "next/image";
import { ArrowLeft, Star, MapPin, Calendar, Users } from "lucide-react";

interface ThailandTourCardProps {
  title: string;
  image: string;
  price: number;
  rating: number;
  reviewCount: number;
  duration: number;
  city: string;
  groupSize: number;
  startDate: string;
  href?: string;
}

function toPersianNumber(num: number | string): string {
  const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  return num
    .toString()
    .split("")
    .map((char) => {
      const digit = parseInt(char, 10);
      return isNaN(digit) ? char : persianDigits[digit];
    })
    .join("");
}

function formatPersianPrice(price: number): string {
  const priceStr = price.toString();
  const parts: string[] = [];
  for (let i = priceStr.length; i > 0; i -= 3) {
    parts.unshift(priceStr.slice(Math.max(0, i - 3), i));
  }
  const persianParts = parts.map((part) => toPersianNumber(part));
  return persianParts.join("٬");
}

export function ThailandTourCard({
  title,
  image,
  price,
  rating,
  reviewCount,
  duration,
  city,
  groupSize,
  startDate,
  href = "#",
}: ThailandTourCardProps) {
  const roundedRating = Math.round(rating * 10) / 10;
  const ratingInteger = Math.floor(roundedRating);
  const ratingDecimal = Math.round((roundedRating - ratingInteger) * 10);

  let ratingDisplay: string;
  if (ratingDecimal === 0) {
    ratingDisplay = toPersianNumber(ratingInteger);
  } else {
    ratingDisplay = toPersianNumber(ratingInteger) + "." + toPersianNumber(ratingDecimal);
  }

  const fullStars = Math.floor(roundedRating);
  const hasHalfStar = roundedRating - fullStars >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div className="group flex flex-col bg-background border rounded-[22px] overflow-hidden transition duration-200 hover:bg-muted">
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={image}
          alt={title}
          fill
          className="object-cover transition duration-200 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        <div className="absolute top-3 end-3">
          <span className="inline-flex items-center rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium text-foreground backdrop-blur-sm">
            <Calendar className="me-1 h-3 w-3" />
            <span className="font-iransans">{toPersianNumber(duration)} شب</span>
          </span>
        </div>
      </div>

      <div className="flex flex-col flex-1 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-pinar text-lg font-bold text-foreground leading-tight">
            {title}
          </h3>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-0.5">
            {Array.from({ length: fullStars }).map((_, i) => (
              <Star
                key={`full-${i}`}
                className="h-4 w-4 fill-amber-500 text-amber-500"
              />
            ))}
            {hasHalfStar && (
              <Star className="h-4 w-4 fill-amber-500/50 text-amber-500" />
            )}
            {Array.from({ length: Math.max(0, emptyStars) }).map((_, i) => (
              <Star
                key={`empty-${i}`}
                className="h-4 w-4 text-muted-foreground"
              />
            ))}
          </div>
          <span className="text-sm text-muted-foreground font-iransans">
            {ratingDisplay} ({toPersianNumber(reviewCount)} نظر)
          </span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            <span className="font-iransans">{city}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span className="font-iransans">{toPersianNumber(groupSize)} نفر</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span className="font-iransans">{startDate}</span>
          </div>
        </div>

        <div className="mt-4 flex items-end justify-between gap-2">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground font-iransans">
              شروع از
            </span>
            <span className="font-pinar text-xl font-bold text-foreground">
              {formatPersianPrice(price)} تومان
            </span>
          </div>
        </div>

        <a
          href={href}
          className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-background border px-4 py-2.5 text-sm font-medium text-foreground transition duration-200 hover:bg-muted hover:text-foreground"
        >
          <span className="font-iransans">مشاهده جزئیات</span>
          <ArrowLeft className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}