import React from 'react';
import Image from 'next/image';
import { Calendar, MapPin, Clock, ArrowLeft } from 'lucide-react';

export interface ThailandTourCardProps {
  id: string;
  title: string;
  destination: string;
  duration: string;
  startDate: string;
  price: string;
  imageUrl: string;
  badgeText?: string;
  onReserve?: (id: string) => void;
}

export function ThailandTourCard({
  id,
  title,
  destination,
  duration,
  startDate,
  price,
  imageUrl,
  badgeText = 'تایلندگرد',
  onReserve,
}: ThailandTourCardProps) {
  return (
    <div className="bg-background border border-border rounded-[22px] overflow-hidden transition-duration-200 duration-200 hover:border-foreground/40 flex flex-col w-full max-w-sm text-start font-iransans">
      {/* بخش تصویر و برچسب */}
      <div className="relative w-full h-52 bg-muted overflow-hidden">
        <Image
          src={imageUrl}
          alt={title}
          fill
          className="object-cover transition-transform duration-200 hover:scale-105"
        />
        {badgeText && (
          <span className="absolute top-3 start-3 bg-background/90 text-foreground text-xs px-3 py-1 rounded-full border border-border font-medium">
            {badgeText}
          </span>
        )}
      </div>

      {/* محتوای کارت */}
      <div className="p-5 flex flex-col flex-grow">
        {/* مقصد */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
          <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span>{destination}</span>
        </div>

        {/* تیتر تور */}
        <h3 className="font-pinar font-bold text-lg text-foreground mb-4 line-clamp-1">
          {title}
        </h3>

        {/* اطلاعات جزئی (مدت و تاریخ) */}
        <div className="space-y-2 mb-4 bg-muted/50 p-3 rounded-lg border border-border/50 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              مدت سفر:
            </span>
            <span className="text-foreground font-medium">{duration}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              تاریخ شروع:
            </span>
            <span className="text-foreground font-medium">{startDate}</span>
          </div>
        </div>

        {/* خط جداکننده */}
        <div className="border-t border-border my-1" />

        {/* قیمت و دکمه رزرو */}
        <div className="flex items-center justify-between pt-4 mt-auto">
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground">شروع قیمت از</span>
            <span className="font-pinar font-bold text-foreground text-base">
              {price}
            </span>
          </div>
          <button
            onClick={() => onReserve?.(id)}
            className="bg-foreground text-background text-xs font-medium px-4 py-2.5 rounded-lg flex items-center gap-2 hover:bg-foreground/90 transition-colors duration-200"
          >
            <span>رزرو تور</span>
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
