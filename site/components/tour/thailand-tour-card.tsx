import { ArrowLeft } from 'lucide-react';

export interface ThailandTourCardProps {
  image: string;
  title: string;
  subtitle: string;
  rating: number;
  reviews: number;
  price: number;
  duration: string;
}

export function ThailandTourCard({ image, title, subtitle, rating, reviews, price, duration }: ThailandTourCardProps) {
  return (
    <div className="bg-background border rounded-lg overflow-hidden transition duration-200">
      <div className="relative">
        <img src={image} alt={title} className="w-full h-48 object-cover" />
        <div className="absolute top-3 end-3 bg-background px-3 py-1 rounded-lg border">
          <div className="flex items-center gap-1">
            <span className="text-foreground">{rating.toLocaleString('fa-IR')}</span>
            <span className="text-muted-foreground text-sm">•</span>
            <span className="text-muted-foreground text-sm">{reviews.toLocaleString('fa-IR')}</span>
          </div>
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-pinar text-foreground text-xl leading-tight mb-1">{title}</h3>
        <p className="font-iransans text-muted-foreground text-base leading-relaxed mb-4">{subtitle}</p>
        <div className="flex items-center justify-between text-sm mb-4">
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">مدت زمان</span>
            <span className="font-iransans text-foreground">{duration}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-foreground">قیمت از</span>
            <span className="font-iransans text-foreground">{price.toLocaleString('fa-IR')} تومان</span>
          </div>
        </div>
        <button className="w-full bg-background border text-foreground hover:bg-muted transition duration-200 py-3 rounded-lg flex items-center justify-center gap-2 text-sm font-iransans">
          <span>جزئیات تور</span>
          <ArrowLeft className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
