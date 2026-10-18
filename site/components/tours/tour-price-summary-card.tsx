import React from 'react';

import { ArrowLeft } from 'lucide-react';

export interface TourPriceSummaryCardProps {
  tour: {
    title: string;
    city: 'bangkok' | 'pattaya' | 'phuket';
    durationNights: number;
    pricePerPerson: number;
    oldPrice?: number;
    rating?: number;
  };
  onReserve: () => void;
  variant?: 'default' | 'featured';
  className?: string;
}

export const TourPriceSummaryCard: React.FC<TourPriceSummaryCardProps> = ({ tour, onReserve, variant = 'default', className = '' }) => {
  const isFeatured = variant === 'featured';
  const titleFontClass = 'font-pinar';
  const bodyFontClass = 'font-iransans';
  const numberClass = 'font-pinar';

  const formatPrice = (price: number): string => {
    return price.toLocaleString('fa-IR').replace(/,/g, '،');
  };

  const getCityName = (city: string): string => {
    switch (city) {
      case 'bangkok': return 'بانکوک';
      case 'pattaya': return 'پاتایا';
      case 'phuket': return 'پوکت';
      default: return '';
    }
  };

  const formatDuration = (nights: number): string => {
    return nights === 1 ? '۱ شب' : `${nights} شب`;
  };

  const reserveButtonText = tour.oldPrice ? 'رزرو' : 'خرید';

  return (
    <div className={`bg-background text-foreground border border border-rounded-[22px] transition-all duration-200 overflow-hidden ${className}`}>
      <div className="p-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className={`text-sm text-muted-foreground mb-1 ${bodyFontClass}`}>مدت تور</div>
            <div className={`text-2xl font-bold text-foreground ${numberClass}`}>{formatDuration(tour.durationNights)}</div>
          </div>
          <div className="flex items-center justify-end gap-1">
            <div className="text-sm text-muted-foreground ${bodyFontClass}">امتیاز</div>
            <div className="text-xl font-bold text-foreground ${numberClass}">{tour.rating ? Math.round(tour.rating * 10) / 10 : '۰'}</div>
            <div className="text-lg">★</div>
          </div>
        </div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <div className={`text-sm text-muted-foreground mb-1 ${bodyFontClass}`}>شهر</div>
            <div className={`text-xl font-bold text-foreground ${numberClass}`}>{getCityName(tour.city)}</div>
          </div>
          <div className="flex items-center gap-1">
            <div className={`text-sm text-muted-foreground ${bodyFontClass}`}>قیمت</div>
            <div className={`text-2xl font-bold text-foreground ${numberClass}`}>{formatPrice(tour.pricePerPerson)}</div>
            <div className="text-sm text-muted-foreground">تومان</div>
          </div>
        </div>
        {tour.oldPrice && (
          <div className="flex items-center justify-between mb-6">
            <div className="flex-1">
              <div className={`text-sm text-muted-foreground mb-1 ${bodyFontClass}`}>قبلی</div>
              <div className={`text-xl font-bold text-foreground ${numberClass}`}>{formatPrice(tour.oldPrice)}</div>
            </div>
            <div className="text-sm text-muted-foreground">تومان</div>
          </div>
        )}
        <button
          onClick={onReserve}
          className="w-full bg-muted text-foreground font-bold py-3 px-4 rounded-[22px] transition-colors duration-200 hover:bg-background flex items-center justify-between group"
        >
          <span className={`text-sm ${bodyFontClass}`}>{reserveButtonText}</span>
          <ArrowLeft className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
        </button>
      </div>
    </div>
  );
};