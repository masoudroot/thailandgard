import { ArrowLeft, MapPin, Clock } from 'lucide-react';

export interface ThailandTourCardProps {
  title: string;
  description: string;
  price: number;
  imageUrl: string;
  location?: string;
  duration?: string;
}

export function ThailandTourCard({
  title,
  description,
  price,
  imageUrl,
  location,
  duration,
}: ThailandTourCardProps) {
  const toPersianNumber = (num: number): string => {
    const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return num
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, '٬')
      .replace(/\d/g, (d) => persianDigits[parseInt(d)]);
  };

  const formattedPrice = `${toPersianNumber(price)} تومان`;

  return (
    <div
      className="bg-background border rounded-lg overflow-hidden transition duration-200 max-w-sm"
      style={{ direction: 'rtl' }}
    >
      <img src={imageUrl} alt={title} className="w-full h-48 object-cover" />
      <div className="ps-4 pe-4 py-4">
        <h3 className="font-pinar font-bold text-foreground text-lg">
          {title}
        </h3>
        {location && (
          <div className="flex items-center gap-2 text-muted-foreground mt-2">
            <MapPin className="w-4 h-4" />
            <span className="font-iransans text-sm">{location}</span>
          </div>
        )}
        {duration && (
          <div className="flex items-center gap-2 text-muted-foreground mt-1">
            <Clock className="w-4 h-4" />
            <span className="font-iransans text-sm">{duration}</span>
          </div>
        )}
        <p className="font-iransans text-muted-foreground text-sm mt-2">
          {description}
        </p>
        <div className="flex items-center gap-2 mt-3">
          <span className="text-lg text-amber font-bold">
            {formattedPrice}
          </span>
          <button
            type="button"
            className="inline-flex items-center gap-2 bg-muted text-foreground border rounded-lg ps-3 pe-3 py-1 text-sm transition duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>رزرو</span>
          </button>
        </div>
      </div>
    </div>
  );
}
