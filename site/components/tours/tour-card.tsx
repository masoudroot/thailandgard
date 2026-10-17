import { ArrowLeft } from 'lucide-react';

export interface TourCardProps {
  id?: string;
  title: string;
  price: number;
  duration: string;
  onReserve?: () => void;
}

const faDigits = '۰۱۲۳۴۵۶۷۸۹';

function toFaDigits(value: string): string {
  return value.replace(/\d/g, (d) => faDigits.charAt(Number(d)));
}

export function TourCard({ title, price, duration, onReserve }: TourCardProps) {
  return (
    <div className="w-full bg-background border border rounded-[22px] transition duration-200">
      <div className="p-6 flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <h3 className="font-pinar text-2xl text-start font-bold text-foreground">
            {title}
          </h3>
          <p className="font-iransans text-foreground text-base text-start">
            مدت سفر: {toFaDigits(duration)}
          </p>
          <p className="font-iransans text-foreground text-base text-start">
            قیمت از: {price.toLocaleString('fa-IR')} تومان
          </p>
        </div>
        <button
          className="flex items-center justify-center gap-2 bg-background text-foreground border border px-6 py-3 rounded-lg transition duration-200"
          onClick={onReserve}
        >
          <span className="font-iransans text-base">رزرو این تور</span>
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
