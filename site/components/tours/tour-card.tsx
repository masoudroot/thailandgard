import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Star } from 'lucide-react';
export interface TourCardProps {
  image: string;
  title: string;
  duration: string;
  rating: string;
  price: string;
}
export function TourCard({ image, title, duration, rating, price }: TourCardProps) {
  return (
    <div className="bg-background border border flex flex-col h-full rounded-[22px] overflow-hidden transition-all duration-200 hover:-translate-y-1">
      <div className="relative">
        <img src={image} alt={title} className="w-full h-48 object-cover" />
        <Badge className="absolute top-4 start-4 bg-muted text-muted-foreground px-3 py-1.5 font-iransans text-sm rounded-[22px]">به زودی</Badge>
      </div>
      <div className="p-6 flex flex-col flex-1">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src="https://picsum.photos/id/1015/32/32" alt="مقصد" />
            <AvatarFallback className="bg-muted">🌏</AvatarFallback>
          </Avatar>
          <div className="font-iransans text-sm text-foreground">تایلند</div>
        </div>
        <h3 className="font-pinar text-2xl leading-tight text-foreground mb-2">تور تایلند</h3>
        <div className="flex items-center gap-2 mb-4 text-muted-foreground">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-foreground" />
            <span className="font-iransans">۴.۸</span>
          </div>
          <Separator className="w-4 bg-border" />
          <div className="font-iransans text-sm">مدت: ۷ روز</div>
        </div>
        <div className="mt-auto">
          <div className="flex items-baseline justify-end gap-1">
            <span className="font-iransans text-2xl font-semibold text-foreground">۱۲٬۵۰۰٬۰۰۰</span>
            <span className="font-iransans text-sm text-muted-foreground">تومان</span>
          </div>
          <Button className="w-full bg-foreground text-background hover:bg-foreground/90 font-iransans text-base h-12 rounded-[22px] mt-4 flex items-center justify-center gap-2">
            رزرو <ArrowLeft className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}