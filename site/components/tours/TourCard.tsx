import { ArrowLeft } from 'lucide-react';

export interface TourCardProps {
  name: string;
  price: number;
  duration: string;
  image?: string;
  reserveLink?: string;
}

export default function TourCard({ name, price, duration, image, reserveLink }: TourCardProps) {
  return (
    <div className="bg-background border border border rounded-[22px] overflow-hidden transition duration-200 hover:scale-[1.02]">
      {image && (
        <div className="relative h-48 w-full">
          <img src={image} alt={name} className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-6">
        <h2 className="font-pinar text-foreground text-xl mb-4">{name}</h2>
        <p className="font-iransans text-muted-foreground text-base mb-6">مدت: {duration}</p>
        <div className="flex justify-between items-end mb-8">
          <div className="text-foreground">
            <span className="font-iransans text-3xl">{price.toLocaleString('fa-IR').replace(/,/g, '،')}</span>
            <span className="font-iransans text-muted-foreground ms-2">تومان</span>
          </div>
          <a
            href={reserveLink || '#'}
            className="bg-muted px-8 py-3 rounded-[22px] flex items-center gap-2 text-foreground transition duration-200 hover:bg-background hover:text-foreground"
          >
            رزرو <ArrowLeft className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
}