import React from 'react';
import Image from 'next/image';
import { Star, Clock, ArrowLeft } from 'lucide-react';

export interface PhuketIslandTourCardProps {
  title: string;
  price: number;
  duration: string;
  rating: number;
  imageUrl: string;
  badgeText?: string;
  onReserve: () => void;
  className?: string;
}

export function PhuketIslandTourCard({
  title,
  price,
  duration,
  rating,
  imageUrl,
  badgeText,
  onReserve,
  className = '',
}: PhuketIslandTourCardProps) {
  const formatPersianNumber = (num: number): string => {
    return new Intl.NumberFormat('fa-IR').format(num);
  };

  return (
    <div
      className={`group flex flex-col overflow-hidden rounded-[22px] border border-border bg-background transition-duration-200 hover:border-foreground/40 ${className}`}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        <Image
          src={imageUrl}
          alt={title}
          fill
          className="object-cover transition-duration-200 group-hover:scale-105"
        />
        {badgeText && (
          <span className="absolute start-3 top-3 z-10 rounded-lg bg-background/90 px-3 py-1 text-xs font-medium text-foreground backdrop-blur-sm border border-border">
            {badgeText}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col justify-between p-5">
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              <span>{duration}</span>
            </div>
            <div className="flex items-center gap-1 text-foreground">
              <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
              <span className="font-medium">{formatPersianNumber(rating)}</span>
            </div>
          </div>

          <h3 className="font-pinar text-lg font-bold text-foreground text-start line-clamp-2">
            {title}
          </h3>
        </div>

        <div className="mt-5 pt-4 border-t border-border flex items-center justify-between">
          <div className="flex flex-col text-start">
            <span className="text-xs text-muted-foreground">شروع قیمت از</span>
            <div className="flex items-baseline gap-1">
              <span className="font-pinar text-lg font-bold text-foreground">
                {formatPersianNumber(price)}
              </span>
              <span className="text-xs text-muted-foreground">تومان</span>
            </div>
          </div>

          <button
            onClick={onReserve}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-duration-200 hover:bg-foreground/90"
          >
            <span>رزرو تور</span>
            <ArrowLeft className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}