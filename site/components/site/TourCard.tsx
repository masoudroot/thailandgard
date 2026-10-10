import { ArrowLeft, CalendarDays, MapPin } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fa, formatToman } from "@/lib/utils";
import type { Tour } from "@/lib/tours";

/** کارت تور در فهرست و صفحهٔ خانه. */
export function TourCard({ tour }: { tour: Tour }) {
  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <Badge variant="brand">{tour.shortTitle}</Badge>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <CalendarDays className="size-3.5" />
            {fa(tour.days)} روزه
          </span>
        </div>
        <CardTitle className="mt-3 text-xl leading-8">{tour.title}</CardTitle>
        <CardDescription className="leading-7">{tour.summary}</CardDescription>
      </CardHeader>
      <CardContent className="mt-auto space-y-4 pt-2">
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="size-3.5" />
          {tour.route}
        </p>
        <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
          <div>
            <p className="text-xs text-muted-foreground">شروع قیمت از</p>
            <p className="text-lg font-bold">{formatToman(tour.priceFrom)}</p>
          </div>
          <Link href={`/tours/${tour.slug}`}>
            <Button variant="secondary">
              جزئیات و رزرو
              <ArrowLeft />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
