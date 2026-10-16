import { Star } from "lucide-react";

interface TravelerReviewCardProps {
  travelerName: string;
  tourName: string;
  rating: number;
  comment: string;
  dateJalali: string;
  avatarUrl?: string;
}

function toPersianNumber(num: number): string {
  const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  return num
    .toString()
    .split("")
    .map((char) => (char >= "0" && char <= "9" ? persianDigits[parseInt(char)] : char))
    .join("");
}

export function TravelerReviewCard({
  travelerName,
  tourName,
  rating,
  comment,
  dateJalali,
  avatarUrl,
}: TravelerReviewCardProps) {
  const safeRating = Math.min(Math.max(rating, 1), 5);

  return (
    <div className="rounded-2xl border border-border bg-background p-5 transition duration-200">
      <div className="flex items-start gap-3">
        <div className="shrink-0">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={travelerName}
              className="h-12 w-12 rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
              <span className="font-pinar text-sm font-bold text-foreground">
                {travelerName.charAt(0)}
              </span>
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-pinar text-base font-bold text-foreground truncate" dir="auto">
              {travelerName}
            </h3>
            <span className="shrink-0 font-iransans text-sm text-muted-foreground">
              {dateJalali}
            </span>
          </div>

          <p className="mt-1 font-iransans text-sm text-muted-foreground truncate" dir="auto">
            {tourName}
          </p>

          <div className="mt-2 flex items-center gap-1">
            {Array.from({ length: 5 }, (_, index) => (
              <Star
                key={index}
                className={`h-4 w-4 ${
                  index < safeRating
                    ? "fill-amber-500 text-amber-500"
                    : "fill-muted text-muted"
                }`}
              />
            ))}
            <span className="me-2 font-iransans text-sm text-foreground">
              {toPersianNumber(safeRating)}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 border-t border-border pt-4">
        <p className="font-iransans text-sm leading-relaxed text-foreground">
          {comment}
        </p>
      </div>
    </div>
  );
}
