import { ArrowLeft, CalendarDays, MapPin } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Price } from "@/components/ui/price";
import { Separator } from "@/components/ui/separator";
import { fa } from "@/lib/utils";
import type { Tour } from "@/lib/tours";

/** کارت تور در فهرست و صفحهٔ خانه. */
export function TourCard({ tour }: { tour: Tour }) {
  return (
    <Card className="flex h-full flex-col overflow-hidden transition-transform duration-(--motion) ease-motion hover:-translate-y-0.5">
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
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="size-3.5" />
          {tour.route}
        </p>
      </CardHeader>
      <CardContent className="mt-auto space-y-4 pt-2">
        <Separator />
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <span className="text-xs text-muted-foreground">شروع قیمت از</span>
          <Price amount={tour.priceFrom} size="md" />
        </div>
        <Button asChild variant="secondary" className="w-full">
          <Link href={`/tours/${tour.slug}`}>
            مشاهدهٔ جزئیات
            <ArrowLeft />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
