import React from 'react';
import { Star } from 'lucide-react';

export interface Review {
  id: string;
  name: string;
  avatarUrl?: string;
  rating: 1 | 2 | 3 | 4 | 5;
  tourName: string;
  comment: string;
  date: string;
}

export interface TravelerTestimonialsProps {
  title: string;
  subtitle?: string;
  reviews: Review[];
  className?: string;
}

function toPersianNumber(num: number | string): string {
  const persianDigits: Record<string, string> = {
    '0': '۰',
    '1': '۱',
    '2': '۲',
    '3': '۳',
    '4': '۴',
    '5': '۵',
    '6': '۶',
    '7': '۷',
    '8': '۸',
    '9': '۹',
  };
  return String(num).replace(/[0-9]/g, (match) => persianDigits[match] || match);
}

export function TravelerTestimonials({
  title,
  subtitle,
  reviews,
  className = '',
}: TravelerTestimonialsProps) {
  return (
    <section className={`py-12 bg-background text-foreground ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-3xl font-bold font-pinar mb-3 text-foreground">
            {title}
          </h2>
          {subtitle && (
            <p className="text-muted-foreground font-iransans text-base">
              {subtitle}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reviews.map((review) => {
            const ratingCount = Math.min(Math.max(review.rating, 1), 5);
            const stars = Array.from({ length: 5 }, (_, index) => index < ratingCount);

            return (
              <div
                key={review.id}
                className="rounded-[22px] border border-border bg-background p-6 flex flex-col justify-between transition duration-200 hover:border-amber-500/50"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {review.avatarUrl ? (
                        <img
                          src={review.avatarUrl}
                          alt={review.name}
                          className="w-12 h-12 rounded-full object-cover border border-border"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center font-bold text-foreground border border-border">
                          {review.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <h3 className="font-bold font-pinar text-foreground">
                          {review.name}
                        </h3>
                        <span className="text-xs text-muted-foreground font-iransans">
                          {review.tourName}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 mb-3">
                    {stars.map((isFilled, idx) => (
                      <Star
                        key={idx}
                        className={`w-4 h-4 ${isFilled ? 'fill-amber-500 text-amber-500' : 'text-muted-foreground'}`}
                      />
                    ))}
                  </div>

                  <p className="text-muted-foreground font-iransans text-sm leading-relaxed mb-4">
                    {review.comment}
                  </p>
                </div>

                <div className="pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground font-iransans">
                  <span>تاریخ: {toPersianNumber(review.date)}</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-foreground border border-border">
                    امتیاز: {toPersianNumber(review.rating)} از ۵
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
