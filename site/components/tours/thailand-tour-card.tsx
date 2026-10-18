import { ArrowLeft } from 'lucide-react';

export interface ThailandTourCardProps {
  title: string;
  city: string;
  imageUrl: string;
  durationDays: number;
  rating: number;
  price: number;
  oldPrice?: number;
  onBook: () => void;
}

export const ThailandTourCard = ({
  title,
  city,
  imageUrl,
  durationDays,
  rating,
  price,
  oldPrice,
  onBook,
}: ThailandTourCardProps) => {
  return (
    <div className="bg-background border border rounded-[22px] overflow-hidden transition-all duration-200">
      <div className="relative">
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-56 object-cover"
        />
        <div className="absolute top-4 start-4 bg-background/90 text-foreground text-sm font-medium px-3 py-1 rounded-full flex items-center gap-1">
          <span>امتیاز</span>
          <span className="font-bold text-yellow-600">{rating}</span>
        </div>
      </div>

      <div className="p-5">
        <div className="mb-4">
          <div className="text-muted-foreground text-sm font-medium flex items-center gap-2">
            <span className="text-base">📍</span>
            <span>{city}</span>
          </div>
          <div className="text-muted-foreground text-sm font-medium mt-1 flex items-center gap-2">
            <span className="text-base">⏱️</span>
            <span>{durationDays} روز</span>
          </div>
        </div>

        <div className="mb-6">
          <div className="font-pinar text-foreground text-2xl leading-tight">
            {title}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-end items-center gap-3">
            <div className="text-end">
              <div className="text-muted-foreground text-sm">قیمت</div>
              <div className="text-foreground font-medium text-xl font-bold">
                {price.toLocaleString('fa-IR')}
                <span className="text-sm font-normal"> تومان</span>
              </div>
            </div>
            <div className="text-foreground">تومان</div>
          </div>

          {oldPrice && (
            <div className="flex justify-end items-center gap-3">
              <div className="text-end">
                <div className="text-muted-foreground text-sm line-through">قیمت قبلی</div>
                <div className="text-muted-foreground font-medium text-xl font-bold">
                  {oldPrice.toLocaleString('fa-IR')}
                  <span className="text-sm font-normal"> تومان</span>
                </div>
              </div>
              <div className="text-muted-foreground">تومان</div>
            </div>
          )}
        </div>

        <button
          onClick={onBook}
          className="w-full mt-6 bg-muted hover:bg-background text-foreground transition-all duration-200 border border text-foreground font-medium py-3.5 px-6 rounded-xl flex items-center justify-end gap-2"
        >
          ر رزرو تور
          <ArrowLeft className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
