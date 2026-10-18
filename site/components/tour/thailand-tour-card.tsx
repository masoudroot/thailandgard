import { ArrowLeft, Star, Clock, Tag } from 'lucide-react';

interface TourProps {
  tour: {
    name: string;
    duration: string;
    price: number;
    currency: string;
    image: string;
    rating: number;
    reviewsCount: number;
    badge?: string;
  };
  variant?: 'standard' | 'compact';
  showDiscount?: boolean;
  onSelect?: (tour: TourProps['tour']) => void;
}

function formatPrice(amount: number, currency: string): string {
  const formatted = amount.toLocaleString('fa-IR');
  return `${formatted} ${currency}`;
}

export function ThailandTourCard({
  tour,
  variant = 'standard',
  showDiscount = false,
  onSelect,
}: TourProps) {
  const isCompact = variant === 'compact';

  return (
    <div
      className={`group relative flex flex-col bg-background border border-border rounded-lg transition duration-200 overflow-hidden ${
        isCompact ? 'max-w-[280px]' : 'max-w-[380px]'
      }`}
    >
      {/* Image container */}
      <div className="relative w-full h-48 overflow-hidden">
        <img
          src={tour.image}
          alt={tour.name}
          className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
        />
        {tour.badge && (
          <span className="absolute top-2 start-2 bg-background text-foreground text-xs font-iransans px-2 py-1 rounded-s rounded-e border border-border flex items-center gap-1">
            <Tag className="w-3 h-3" />
            <span>{tour.badge}</span>
          </span>
        )}
        {showDiscount && (
          <span className="absolute top-2 end-2 bg-amber-500 text-white text-xs font-iransans px-2 py-1 rounded-lg">
            {'کد تخفیف'}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col p-4 gap-2">
        {/* Title */}
        <h3 className={`font-pinar text-foreground ${isCompact ? 'text-base' : 'text-lg'}`}>
          {tour.name}
        </h3>

        {/* Duration & Rating */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-iransans">{tour.duration}</span>
          </div>
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-iransans text-foreground">
              {tour.rating.toLocaleString('fa-IR')}
            </span>
            <span className="text-xs font-iransans text-muted-foreground">
              ({tour.reviewsCount.toLocaleString('fa-IR')})
            </span>
          </div>
        </div>

        {/* Price */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex flex-col">
            <span className="text-xs font-iransans text-muted-foreground">
              {'قیمت'}
            </span>
            <span className="font-pinar text-lg text-foreground">
              {formatPrice(tour.price, tour.currency)}
            </span>
          </div>

          {/* CTA */}
          <button
            onClick={() => onSelect?.(tour)}
            className="flex items-center gap-1 px-3 py-2 bg-muted text-foreground border border-border rounded-lg text-sm font-iransans transition duration-200 hover:bg-foreground hover:text-background"
          >
            <span>{'جزئیات'}</span>
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
