'use client';

import React from 'react';
import Image from 'next/image';
import { Star, Clock, MapPin, ArrowLeft } from 'lucide-react';

export interface TourSummary {
  id: string;
  title: string;
  destination: string;
  durationDays: number;
  price: number;
  oldPrice?: number;
  rating?: number;
  image: string;
  slug: string;
}

export interface TourCardProps {
  tour: TourSummary;
  onCTA?: (slug: string) => void;
  variant?: 'default' | 'compact';
}

function toPersianDigits(num: number | string): string {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return num
    .toString()
    .replace(/\d/g, (x) => persianDigits[parseInt(x, 10)]);
}

function formatPrice(amount: number): string {
  const formatted = amount.toLocaleString('en-US');
  return toPersianDigits(formatted);
}

export function TourCard({
  tour,
  onCTA,
  variant = 'default',
}: TourCardProps) {
  const handleCardClick = () => {
    if (onCTA) {
      onCTA(tour.slug);
    }
  };

  const isCompact = variant === 'compact';

  return (
    <div
      onClick={handleCardClick}
      className={`group relative flex flex-col overflow-hidden rounded-[22px] border border-border bg-background transition-all duration-200 hover:border-muted-foreground/50 cursor-pointer`}
    >
      {/* Image Container */}
      <div
        className={`relative w-full overflow-hidden bg-muted ${
          isCompact ? 'h-40' : 'h-52'
        }`}
      >
        <Image
          src={tour.image}
          alt={tour.title}
          fill
          className="object-cover transition-transform duration-200 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, 33vw"
        />
        {tour.destination && (
          <div className="absolute top-3 start-3 flex items-center gap-1 rounded-full bg-background/90 px-3 py-1 text-xs font-medium text-foreground backdrop-blur-sm">
            <MapPin className="h-3.5 w-3.5 text-amber-500" />
            <span>{tour.destination}</span>
          </div>
        )}
      </div>

      {/* Content Container */}
      <div className="flex flex-1 flex-col justify-between p-4">
        <div className="flex flex-col gap-3">
          {/* Rating and Duration */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              <span>مدت: {toPersianDigits(tour.durationDays)} روز</span>
            </div>
            {tour.rating !== undefined && ( 
              <div className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                <span className="font-medium text-foreground">
                  {toPersianDigits(tour.rating.toFixed(1))}
                </span>
              </div>
            )}
          </div>

          {/* Title */}
          <h3
            className={`font-pinar font-bold text-foreground line-clamp-2 ${
              isCompact ? 'text-base' : 'text-lg'
            }`}
          >
            {tour.title}
          </h3>
        </div>

        {/* Footer / Price & CTA */}
        <div className="mt-4 flex flex-col gap-3 pt-3 border-t border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">قیمت از</span>
            <div className="flex flex-col items-end">
              {tour.oldPrice && (
                <span className="text-xs text-muted-foreground line-through">
                  {formatPrice(tour.oldPrice)} تومان
                </span>
              )}
              <span className="font-pinar text-base font-bold text-foreground">
                {formatPrice(tour.price)} تومان
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onCTA) onCTA(tour.slug);
            }}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-muted py-2.5 text-xs font-medium text-foreground transition-colors duration-200 hover:bg-muted/80"
          >
            <span>مشاهدهٔ جزئیات</span>
            <ArrowLeft className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
