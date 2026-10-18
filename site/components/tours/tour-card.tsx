import React from 'react';
import { CalendarDays, Star, ArrowLeft } from 'lucide-react';

export interface TourCardProps {
  tour: {
    id: string;
    title: string;
    destination: string;
    durationDays: number;
    price: number;
    oldPrice?: number;
    rating: number;
    imageSrc: string;
    imageAlt: string;
  };
  onOpen?: (id: string) => void;
  className?: string;
}

export function TourCard({ tour, onOpen, className }: TourCardProps) {
  const priceStr = new Intl.NumberFormat('fa-IR').format(tour.price);
  const oldPriceStr = tour.oldPrice ? new Intl.NumberFormat('fa-IR').format(tour.oldPrice) : null;
  const ratingStr = tour.rating.toFixed(1);
  const durationStr = tour.durationDays.toString();
  const handleClick = () => {
    if (onOpen) {
      onOpen(tour.id);
    }
  };
  return (
    <div className={className}>
      <div
        className="flex flex-col w-full bg-background border border bg-muted text-foreground rounded-[22px] shadow-none overflow-hidden transition-colors duration-200"
        onClick={handleClick}
      >
        <div className="relative">
          <img
            src={tour.imageSrc}
            alt={tour.imageAlt}
            className="w-full h-48 object-cover"
          />
          <div className="absolute end-3 top-3">
            <div className="flex items-center bg-background/95 border text-foreground rounded-lg px-3 py-1 text-xs font-medium">
              {tour.rating} <Star className="w-4 h-4 ms-1 fill-current" />
            </div>
          </div>
        </div>
        <div className="flex flex-col p-4">
          <h3 className="font-pinar text-lg leading-tight text-start mb-1.5">{tour.title}</h3>
          <p className="font-iransans text-sm text-muted-foreground text-start mb-4">{tour.destination}</p>
          <div className="flex items-center text-start mb-3">
            <CalendarDays className="w-4 h-4 text-muted-foreground ms-0 me-1.5" />
            <span className="font-iransans text-sm text-muted-foreground">{durationStr} روز</span>
          </div>
          <div className="flex justify-between items-center">
            <div className="text-start">
              <span className="font-iransans text-2xl font-medium">{priceStr}</span>
              {tour.oldPrice && (
                <>
                  <span className="block text-muted-foreground text-xs">قدیمی</span>
                  <span className="font-iransans text-sm line-through">{oldPriceStr}</span>
                </>
              )}
            </div>
            <button className="bg-muted text-foreground border text-foreground px-5 py-2 rounded-lg text-xs font-medium flex items-center transition-colors duration-200">
              <span>جزئیات</span>
              <ArrowLeft className="w-4 h-4 ms-1.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}