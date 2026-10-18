import { ArrowLeft } from 'lucide-react';

export interface PhuketTourCardProps {
  title: string;
  nights: number;
  priceToman: number;
  rating: number;
  imageUrl: string;
  onReserve?: () => void;
}

export function PhuketTourCard({
  title,
  nights,
  priceToman,
  rating,
  imageUrl,
  onReserve,
}: PhuketTourCardProps) {
  const priceStr = priceToman.toLocaleString('fa-IR');
  return (
    <div className="group w-full max-w-sm border border-border bg-background rounded-[22px] overflow-hidden transition-all duration-200 hover:ring-1 hover:ring-border">
      <div className="relative">
        <img src={imageUrl} alt={title} className="w-full h-48 object-cover" />
        <div className="absolute top-4 start-4 bg-muted text-foreground text-[10px] font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" />
          <span>بعدی</span>
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-pinar text-foreground text-[17px] leading-none">{title}</h3>
        <div className="flex items-center justify-end gap-1 mt-3">
          <span className="text-muted-foreground text-xs">مدت اقامت</span>
          <span className="text-foreground font-medium">{nights} شب</span>
        </div>
        <div className="flex items-center justify-end gap-3 mt-6">
          <span className="text-muted-foreground text-xs">امتیاز</span>
          <div className="flex items-center gap-0.5">
            {Array.from({ length: Math.floor(rating) }).map((_, i) => (
              <span key={i} className="text-foreground">★</span>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between mt-6">
          <div className="text-end">
            <div className="flex items-center justify-end gap-1">
              <span className="text-muted-foreground text-xs">هر نفر</span>
              <span className="text-foreground font-semibold text-base">{priceStr}</span>
            </div>
            <div className="text-muted-foreground text-[10px] mt-1">تومان</div>
          </div>
          <button
            onClick={onReserve}
            className="bg-background text-foreground text-xs font-medium border border-border px-4 py-2 rounded-lg hover:bg-muted transition-colors"
          >
            رزرو
          </button>
        </div>
      </div>
    </div>
  );
}