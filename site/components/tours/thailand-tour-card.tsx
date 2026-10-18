import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { MapPin, Clock, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThailandTourCardProps {
  title: string;
  city: string;
  price: number;
  nights: number;
  rating: number;
  imageUrl: string;
  badgeText?: string;
  onBook?: () => void;
  className?: string;
}

function toPersianNumber(value: number): string {
  return value.toLocaleString("fa-IR");
}

export function ThailandTourCard({
  title,
  city,
  price,
  nights,
  rating,
  imageUrl,
  badgeText,
  onBook,
  className,
}: ThailandTourCardProps) {
  return (
    <Card
      className={cn(
        "overflow-hidden border bg-background rounded-[22px] transition duration-200 font-iransans",
        className
      )}
    >
      <div className="relative">
        <img
          src={imageUrl}
          alt={title}
          className="aspect-[4/3] w-full object-cover"
        />
        {badgeText ? (
          <Badge className="absolute start-4 top-4 bg-amber-100 text-amber-700 hover:bg-amber-100">
            {badgeText}
          </Badge>
        ) : null}
      </div>

      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-pinar text-lg font-bold text-foreground line-clamp-2">
            {title}
          </h3>
          <div className="flex items-center gap-1 text-amber-500">
            <Star className="h-4 w-4 fill-current" />
            <span className="text-sm font-medium">
              {toPersianNumber(rating)}
            </span>
          </div>
        </div>

        <div className="mt-2 flex items-center gap-1 text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span className="text-sm">{city}</span>
        </div>

        <div className="mt-3 flex items-center gap-1 text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span className="text-sm">{toPersianNumber(nights)} شب</span>
        </div>
      </CardContent>

      <Separator />

      <CardFooter className="flex items-center justify-between p-4">
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">قیمت از</span>
          <span className="font-pinar text-lg font-bold text-foreground">
            {toPersianNumber(price)} تومان
          </span>
        </div>
        <Button onClick={onBook} disabled={!onBook}>
          رزرو
        </Button>
      </CardFooter>
    </Card>
  );
}
