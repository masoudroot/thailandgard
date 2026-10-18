import { ArrowLeft } from 'lucide-react';

export interface TourCardProps {
  image: string;
  title: string;
  days: string;
  price: string;
}

export function TourCard({ image, title, days, price }: TourCardProps) {
  return (
    <div className="group relative flex flex-col bg-background border border overflow-hidden transition duration-200 rounded-[22px]">
      <div className="relative h-48 overflow-hidden">
        <img
          src={image}
          alt={title}
          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
        />
      </div>
      <div className="flex flex-col gap-3 p-4">
        <h3 className="font-pinar text-xl text-foreground">{title}</h3>
        <p className="font-iransans text-base text-muted-foreground">{days}</p>
        <div className="mt-auto flex items-center justify-between">
          <p className="font-iransans text-base text-foreground">{price}</p>
          <button className="flex items-center gap-1 text-sm font-iransans text-foreground hover:text-muted-foreground transition duration-200">
            رزرو
            <ArrowLeft className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}