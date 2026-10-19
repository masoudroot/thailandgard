import React from 'react';
import { Calendar, MapPin, ArrowLeft, Percent, Clock } from 'lucide-react';

export interface ThailandTourCardProps {
  title?: string;
  destination?: string;
  duration?: string;
  startDate?: string;
  originalPrice?: string;
  discountedPrice?: string;
  discountPercent?: string;
  badgeText?: string;
  onSelect?: () => void;
}

export function ThailandTourCard({
  title = 'تور ویژه پوکت و بانکوک',
  destination = 'تایلند، پوکت و بانکوک',
  duration = '۷ روز و ۶ شب',
  startDate = '۱۵ اردیبهشت ۱۴۰۴',
  originalPrice = '۳۵٬۰۰۰٬۰۰۰',
  discountedPrice = '۲۸٬۰۰۰٬۰۰۰',
  discountPercent = '۲۰٪',
  badgeText = 'تخفیف فصلی',
  onSelect,
}: ThailandTourCardProps) {
  return (
    <div className="flex flex-col rounded-[22px] border border-border bg-background p-5 transition-all duration-200 hover:border-foreground/3">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground">
          <Percent className="h-3.5 w-3.5 text-amber-600" />
          {badgeText}
        </span>
        <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-600">
          {discountPercent} تخفیف
        </span>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <h3 className="font-pinar text-xl font-bold text-foreground text-start">
          {title}
        </h3>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 shrink-0" />
          <span className="text-start">{destination}</span>
        </div>
      </div>

      <div className="my-4 h-[1px] w-full bg-border" />

      <div className="flex flex-col gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 shrink-0" />
          <span className="text-start">مدت اقامت: {duration}</span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 shrink-0" />
          <span className="text-start">تاریخ حرکت: {startDate}</span>
        </div>
      </div>

      <div className="mt-6 flex items-end justify-between border-t border-border pt-4">
        <div className="flex flex-col text-start">
          <span className="text-xs text-muted-foreground line-through">
            {originalPrice} تومان
          </span>
          <span className="font-pinar text-lg font-bold text-foreground">
            {discountedPrice} <span className="text-xs font-normal text-muted-foreground">تومان</span>
          </span>
        </div>
        <button
          onClick={onSelect}
          className="inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-colors duration-200 hover:opacity-90"
        >
          <span>رزرو تور</span>
          <ArrowLeft className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
