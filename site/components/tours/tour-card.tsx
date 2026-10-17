import { ArrowLeft } from 'lucide-react';

export interface TourCardProps {
  title: string;
  destination: string;
  durationDays: number;
  price: number;
  imageUrl: string;
  isBestseller?: boolean;
  onReserve?: () => void;
}

export function TourCard({
  title,
  destination,
  durationDays,
  price,
  imageUrl,
  isBestseller,
  onReserve,
}: TourCardProps) {
  const formatNumber = (num: number) => num.toLocaleString('fa-IR');

  return (
    <div className="group overflow-hidden rounded-[22px] bg-background border border-foreground text-foreground transition duration-200">
      <div className="relative">
        <img src={imageUrl} alt={title} className="h-48 w-full object-cover" />
        {isBestseller && (
          <div className="absolute end-0 start-0 rounded-t-[22px] bg-muted px-3 py-1 text-center text-xs font-medium text-muted-foreground">
            پرفروش
          </div>
        )}
      </div>

      <div className="space-y-3 p-4">
        <h3 className="font-pinar text-xl leading-tight text-start">{title}</h3>
        <p className="font-iransans text-sm text-muted-foreground text-start">مقصد: {destination}</p>
        <p className="font-iransans text-sm text-muted-foreground text-start">مدت سفر: {durationDays} روز</p>
        <p className="font-iransans text-2xl font-medium text-foreground text-start">قیمت: {formatNumber(price)} تومان</p>
        <button
          onClick={onReserve}
          className="group-hover:bg-muted flex w-full items-center justify-between rounded-[22px] border border-foreground px-5 py-3 transition duration-200 text-start"
        >
          <span className="text-muted-foreground font-iransans text-sm">رزرو</span>
          <ArrowLeft className="h-5 w-5 text-muted-foreground transition duration-200" />
        </button>
      </div>
    </div>
  );
}
