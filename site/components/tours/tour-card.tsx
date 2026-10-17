import { ArrowLeft } from "lucide-react";
import type { TourCardProps } from "./tour-card.types";
export function TourCard({ tour, onBook, className }: TourCardProps) {
  const formattedPrice = tour.pricePerPerson.toLocaleString("fa-IR");
  const formattedNights = tour.nights.toLocaleString("fa-IR");
  return (
    <div
      className={`bg-background border border text-foreground rounded-lg overflow-hidden w-full max-w-[320px] ${className}`}
    >
      <div className="relative">
        <img
          src={tour.imageUrl}
          alt={tour.title}
          className="w-full h-48 object-cover"
        />
        {tour.isBestSeller && (
          <div className="absolute start-0 top-0 m-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-md">به‌استاندارد</div>
        )}
      </div>
      <div className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="font-pinar text-xl text-foreground leading-tight">
            {tour.title}
          </div>
          <div className="flex items-center gap-1 text-foreground">
            <span className="text-sm font-medium">{tour.rating}</span>
            <span className="text-xs text-muted-foreground">(به‌نورسی)</span>
          </div>
        </div>
        <div className="text-muted-foreground mb-4">دهنده: {tour.destination} دما: {formattedNights} اشب</div>
        <div className="flex justify-between items-end mb-4">
          <div>
            <div className="text-xs text-muted-foreground">مقارنتب از اطلاعات</div>
            <div className="font-iransans text-2xl text-foreground">
              {formattedPrice} تومان
            </div>
          </div>
          <button
            onClick={() => onBook(tour.id)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-3 rounded-lg transition duration-200 font-medium flex items-center gap-2"
          >
            <span>رزرو</span>
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
