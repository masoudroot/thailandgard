import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, MapPin } from 'lucide-react';

export interface DestinationCardProps {
  image: string;
  title: string;
  toursCount: number;
  priceFrom: number;
  href: string;
  badge?: string;
}

function toPersianDigits(num: number): string {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return num.toString().replace(/\d/g, (x) => persianDigits[parseInt(x, 10)]);
}

export function DestinationCard({
  image,
  title,
  toursCount,
  priceFrom,
  href,
  badge,
}: DestinationCardProps) {
  const formattedToursCount = toPersianDigits(toursCount);
  const formattedPrice = toPersianDigits(priceFrom);

  return (
    <Link
      href={href}
      className="group block rounded-[22px] border border-border bg-background duration-200 hover:border-foreground/40 overflow-hidden"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        <Image
          src={image}
          alt={title}
          fill
          className="object-cover transition-transform duration-200 group-hover:scale-105"
        />
        {badge && (
          <div className="absolute top-3 start-3 z-10 rounded-full bg-background/90 px-3 py-1 text-xs font-medium text-foreground backdrop-blur-sm border border-border">
            {badge}
          </div>
        )}
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-pinar text-xl font-bold text-foreground">
              {title}
            </h3>
            <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 text-amber-500" />
              <span>{formattedToursCount} تور فعال</span>
            </div>
          </div>

          <div className="text-end">
            <span className="block text-xs text-muted-foreground">
              شروع قیمت از
            </span>
            <span className="font-iransans font-bold text-foreground">
              {formattedPrice} <span className="text-xs font-normal text-muted-foreground">تومان</span>
            </span>
          </div>
        </div>

        <div className="mt-4 border-t border-border pt-4 flex items-center justify-between text-sm text-muted-foreground group-hover:text-foreground">
          <span>مشاهده تورها</span>
          <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1 text-amber-500" />
        </div>
      </div>
    </Link>
  );
}
