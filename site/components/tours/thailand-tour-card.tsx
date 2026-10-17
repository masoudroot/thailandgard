import React from 'react';
import Image from 'next/image';
import { Calendar, MapPin, Star, ArrowLeft } from 'lucide-react';

export interface ThailandTourCardProps {
  tour: {
    id: string;
    title: string;
    destination: string;
    durationDays: number;
    price: number;
    imageUrl: string;
    rating?: number;
  };
  onReserve?: (tourId: string) => void;
  className?: string;
}

export function ThailandTourCard({ tour, onReserve, className = '' }: ThailandTourCardProps) {
  const toPersianNumbers = (num: number): string => {
    const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return num.toLocaleString('fa-IR').replace(/\d/g, (d) => persianDigits[parseInt(d, 10)]);
  };

  return (
    <div className={`flex flex-col bg-background border rounded-lg overflow-hidden transition duration-200 ${className}`}>
      <div className="relative w-full h-48 bg-muted">
        <Image
          src={tour.imageUrl}
          alt={tour.title}
          fill
          className="object-cover"
        />
        {tour.rating !== undefined && (
          <div className="absolute top-3 start-3 flex items-center gap-1 bg-background/90 text-foreground px-2 py-1 rounded-md text-xs font-medium border">
            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
            <span>{toPersianNumbers(tour.rating)}</span>
          </div>
        )}
      </div>

      <div className="flex flex-col flex-grow p-4 gap-4 text-start">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="w-3.5 h-3.5" />
            <span>{tour.destination}</span>
          </div>
          <h3 className="font-pinar font-bold text-lg text-foreground line-clamp-1">
            {tour.title}
          </h3>
        </div>

        <div className="flex flex-col gap-2 pt-2 border-t border-muted">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">مدت سفر:</span>
            <div className="flex items-center gap-1 text-foreground font-medium">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span>{toPersianNumbers(tour.durationDays)} روز</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">قیمت از:</span>
            <span className="font-bold text-foreground">
              {toPersianNumbers(tour.price)} تومان
            </span>
          </div>
        </div>

        <button
          onClick={() => onReserve?.(tour.id)}
          className="mt-auto flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-muted text-foreground hover:bg-amber-500 hover:text-white rounded-md transition duration-200 font-medium text-sm"
        >
          <span>رزرو تور</span>
          <ArrowLeft className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}