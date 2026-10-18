import React from 'react';
import { ArrowLeft } from 'lucide-react';

export interface TourCardProps {
  price: number;
  duration: number;
  title: string;
  imageUrl: string;
}

export const TourCard: React.FC<TourCardProps> = ({ price, duration, title, imageUrl }) => {
  const formatNumber = (num: number): string => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };
  const formattedPrice = formatNumber(price);
  return (
    <div className="w-full max-w-[320px] bg-background border border text-foreground rounded-[22px] overflow-hidden transition duration-200">
      <div className="relative">
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-[200px] object-cover"
        />
        <div className="absolute top-4 end-4 bg-muted px-3 py-1 rounded-lg text-sm font-bold flex items-center gap-2">
          <span className="text-foreground">هفته</span>
          <span className="text-foreground">{duration}</span>
          <ArrowLeft className="w-4 h-4" />
        </div>
      </div>
      <div className="p-5">
        <h3 className="font-pinar text-2xl leading-tight mb-4 text-foreground">{title}</h3>
        <div className="flex items-center justify-between">
          <div className="text-foreground">
            از <span className="font-bold">{formattedPrice}</span> تومان
          </div>
          <button className="bg-muted px-6 py-3 rounded-lg text-foreground font-bold flex items-center gap-2 hover:bg-muted/90 transition duration-200">
            رزرو <ArrowLeft className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};