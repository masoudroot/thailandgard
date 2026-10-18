import React from 'react';
import { ArrowLeft } from 'lucide-react';

export interface TourCardProps {
  title: string;
  subtitle: string;
  price: number;
  duration: string;
  image: string;
  rating: number;
  category: string;
  onReserve: () => void;
}

export const TourCard: React.FC<TourCardProps> = ({ title, subtitle, price, duration, image, rating, category, onReserve }) => {
  const formatPrice = (p: number): string => {
    const formatted = p.toLocaleString('fa-IR');
    return formatted.replace(/,/g, '،') + ' تومان';
  };
  return (
    <div className="group flex flex-col h-full bg-background border border rounded-[22px] overflow-hidden transition duration-200 hover:border-muted">
      <div className="relative h-56">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-4 end-4 bg-background text-foreground text-sm font-bold px-3 py-1 rounded-full">
          {category}
        </div>
      </div>
      <div className="p-6 flex-1 flex flex-col">
        <div className="font-pinar text-foreground text-xl mb-2 leading-tight">
          {title}
        </div>
        <div className="font-iransans text-muted-foreground text-sm mb-4">
          {subtitle}
        </div>
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center">
            <span className="font-bold text-foreground text-lg">{rating}</span>
            <span className="text-muted-foreground text-sm ms-1">امتیاز</span>
          </div>
          <div className="flex items-center">
            <span className="font-bold text-foreground text-lg">{formatPrice(price)}</span>
          </div>
        </div>
        <div className="flex justify-between items-center mt-auto">
          <div className="font-iransans text-foreground text-sm">
            مدت زمان: {duration}
          </div>
          <button
            onClick={onReserve}
            className="flex items-center bg-background text-foreground border border px-6 py-3 rounded-[22px] transition duration-200 hover:bg-muted text-end"
          >
            <span className="font-iransans text-sm me-2">رزرو</span>
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};