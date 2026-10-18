import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export interface TourCardProps {
  tour: {
    id: string;
    title: string;
    destination: string;
    durationNights: number;
    price: number;
    oldPrice?: number;
    rating: number;
    reviewsCount: number;
    imageSrc: string;
    imageAlt: string;
  };
  onBook?: (tourId: string) => void;
  className?: string;
}

export function TourCard({ tour, onBook, className }: TourCardProps) {
  const formattedPrice = new Intl.NumberFormat('fa-IR').format(tour.price);
  const formattedOldPrice = tour.oldPrice ? new Intl.NumberFormat('fa-IR').format(tour.oldPrice) : null;

  const handleBook = () => {
    if (onBook) {
      onBook(tour.id);
    }
  };

  return (
    <div className={className}>
      <Card className="w-full max-w-sm mx-auto border border bg-muted rounded-[22px] transition duration-200 hover:shadow-none">
        <div className="relative h-48">
          <img
            src={tour.imageSrc}
            alt={tour.imageAlt}
            className="w-full h-full object-cover rounded-t-[22px]"
          />
          <Badge className="absolute top-3 start-3 bg-background text-foreground px-3 py-1 font-medium">بهترین انتخاب</Badge>
        </div>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className={`text-amber-500 text-xl ${i < Math.floor(tour.rating) ? '' : 'opacity-40'}`}>
                    ★
                  </span>
                ))}
              </div>
              <span className="text-foreground font-medium text-sm">{tour.rating}</span>
            </div>
            <div className="text-muted-foreground text-sm font-medium">{tour.reviewsCount}</div>
          </div>
          <h3 className="font-bold text-foreground text-xl leading-tight mb-2 line-clamp-2">{tour.title}</h3>
          <p className="text-muted-foreground text-sm mb-4">مقصد: {tour.destination}</p>
          <Separator className="my-4" />
          <div className="flex items-center justify-between">
            <div className="text-foreground text-2xl font-medium">{formattedPrice} تومان</div>
            {formattedOldPrice && (
              <div className="text-muted-foreground text-sm line-through">{formattedOldPrice} تومان</div>
            )}
          </div>
        </CardContent>
        <CardFooter className="p-4 pt-0">
          <Button
            onClick={handleBook}
            className="w-full bg-foreground text-background hover:bg-foreground/90 text-base font-medium h-11 rounded-xl flex items-center justify-center gap-2"
          >
            <span>رزرو تور</span>
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
