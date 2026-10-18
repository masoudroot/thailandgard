import React from 'react';
import { ArrowLeft } from 'lucide-react';

export interface ThailandTourCardProps {
  tour: {
    id: string;
    title: string;
    destination: string;
    duration: number;
    price: number;
    image: string;
    rating: number;
  };
}

export default function ThailandTourCard({ tour }: ThailandTourCardProps) {
  const formattedPrice = new Intl.NumberFormat('fa-IR', { style: 'decimal' }).format(tour.price);
  const formattedDuration = new Intl.NumberFormat('fa-IR', { style: 'decimal' }).format(tour.duration);
  const formattedRating = new Intl.NumberFormat('fa-IR', { style: 'decimal' }).format(tour.rating);
  return (
    <div className="bg-background border border text-foreground rounded-[22px] overflow-hidden transition duration-200">
      <div className="relative">
        <img src={tour.image} alt={tour.title} className="w-full h-48 object-cover" />
        <div className="absolute top-4 end-4 bg-muted text-foreground text-sm px-3 py-1 rounded-full">
          {formattedRating}
        </div>
      </div>
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <span className="font-pinar text-foreground">تایلند</span>
            <span className="font-pinar text-foreground">ـ</span>
            <span className="text-muted-foreground text-sm">تور</span>
          </div>
          <button className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition duration-200">
            <span className="text-sm">جزئیات</span>
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>
        <h2 className="font-pinar text-foreground text-xl mb-3">{tour.title}</h2>
        <div className="flex items-center justify-between text-sm mb-6">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">مدت زمان</span>
            <span className="font-iransans text-foreground">{formattedDuration} روز</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-pinar text-foreground">از {formattedPrice}٬۰۰۰ تومان</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex">
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} className={`text-${i < Math.floor(tour.rating) ? 'foreground' : 'text-muted-foreground'} text-xl`}>★</span>
              ))}
            </div>
            <span className="text-muted-foreground text-sm">({tour.rating})</span>
          </div>
          <button className="bg-muted text-foreground px-6 py-3 rounded-lg font-iransans hover:bg-muted/90 transition duration-200">انتخاب تور</button>
        </div>
      </div>
    </div>
  );
}
