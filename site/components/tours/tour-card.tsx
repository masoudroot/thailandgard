import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, CalendarDays, MapPin, Star } from "lucide-react";

interface TourCardProps {
  /** شناسهٔ یکتای تور */
  id: string;
  /** عنوان تور */
  title: string;
  /** مقصد (شهر یا منطقه) */
  destination: string;
  /** نشانی تصویر تور */
  image: string;
  /** تعداد روزهای سفر */
  durationDays: number;
  /** تعداد شب‌های سفر */
  durationNights?: number;
  /** قیمت به تومان (هر نفر) */
  price: number;
  /** امتیاز تور از ۵ */
  rating: number;
  /** تعداد دیدگاه‌های ثبت‌شده */
  reviewsCount?: number;
  /** نامک صفحهٔ جزئیات تور */
  slug: string;
}

const PERSIAN_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

function toPersianDigits(value: number | string): string {
  return String(value).replace(/\d/g, (digit) => PERSIAN_DIGITS[Number(digit)]);
}

function formatToman(price: number): string {
  return price
    .toLocaleString("en-US")
    .replace(/,/g, "٬")
    .replace(/\d/g, (digit) => PERSIAN_DIGITS[Number(digit)]);
}

function formatRating(rating: number): string {
  return toPersianDigits(rating.toFixed(1)).replace(".", "٫");
}

export function TourCard({
  id,
  title,
  destination,
  image,
  durationDays,
  durationNights,
  price,
  rating,
  reviewsCount,
  slug,
}: TourCardProps) {
  const durationText =
    durationNights !== undefined
      ? `${toPersianDigits(durationDays)} روز و ${toPersianDigits(durationNights)} شب`
      : `${toPersianDigits(durationDays)} روز`;

  return (
    <article
      aria-labelledby={`tour-${id}-title`}
      className="flex h-full flex-col overflow-hidden rounded-[22px] border bg-background transition-colors duration-200 hover:border-foreground/25"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden">
        <Image
          src={image}
          alt={title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover"
        />
        <span className="absolute top-3 end-3 inline-flex items-center gap-1 rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium text-foreground">
          <Star
            className="size-3.5 fill-amber-500 text-amber-500"
            aria-hidden="true"
          />
          {formatRating(rating)}
        </span>
        <span className="absolute bottom-3 start-3 inline-flex items-center gap-1 rounded-full bg-muted/95 px-2.5 py-1 text-xs text-muted-foreground">
          <MapPin className="size-3.5" aria-hidden="true" />
          {destination}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5 font-iransans">
        <div className="flex flex-col gap-2">
          <h3
            id={`tour-${id}-title`}
            className="font-pinar text-lg font-bold leading-8 text-foreground"
          >
            {title}
          </h3>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <CalendarDays className="size-4 shrink-0" aria-hidden="true" />
            <span>{durationText}</span>
          </p>
        </div>

        <div role="separator" aria-orientation="horizontal" className="border-t" />

        <div className="flex flex-1 items-end justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">قیمت هر نفر</span>
            <span className="font-pinar text-base font-bold text-foreground">
              {formatToman(price)}
              <span className="ms-1 text-xs font-normal text-muted-foreground">
                تومان
              </span>
            </span>
          </div>
          {reviewsCount !== undefined && (
            <span className="text-xs text-muted-foreground">
              {toPersianDigits(reviewsCount)} دیدگاه
            </span>
          )}
        </div>

        <Link
          href={`/tours/${slug}`}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-colors duration-200 hover:bg-foreground/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
        >
          رزرو تور
          <ArrowLeft className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
