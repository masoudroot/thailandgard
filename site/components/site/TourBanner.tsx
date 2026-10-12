import { ArrowLeft, CalendarDays, MapPin, Phone } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Price } from "@/components/ui/price";
import { fa } from "@/lib/utils";
import { getSiteSettings } from "@/lib/db-content";
import type { Tour } from "@/lib/tours";

/**
 * بنر «منتخب این هفته» برای بالای /tours (قابل استفاده در خانه).
 * پوستر تایپوگرافیک: نام مقصد جای عکس. هیچ تصویری ندارد.
 */
export async function TourBanner({ tour }: { tour: Tour }) {
  const { PHONE_MOBILE_LINK } = await getSiteSettings();
  const titleId = `tour-banner-${tour.slug}`;
  return (
    <Card
      aria-labelledby={titleId}
      role="region"
      className="grid gap-6 p-6 sm:p-8 md:grid-cols-[1fr_18rem]"
    >
      {/* ستون متن: در موبایل زیر پنل، در دسکتاپ راست (ابتدای خواندن) */}
      <div className="order-2 flex flex-col gap-6 md:order-1">
        <div className="space-y-4">
          <Badge variant="brand">منتخب این هفته</Badge>
          <h2
            id={titleId}
            className="font-display text-3xl sm:text-4xl"
          >
            {tour.title}
          </h2>
          <p className="max-w-2xl text-base leading-[1.8]">{tour.summary}</p>
        </div>

        <dl className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <CalendarDays aria-hidden className="size-4" />
            <dt>مدت:</dt>
            <dd>
              {fa(tour.days)} روز و {fa(tour.nights)} شب
            </dd>
          </div>
          <div className="flex items-center gap-2">
            <MapPin aria-hidden className="size-4" />
            <dt>مسیر:</dt>
            <dd>{tour.route}</dd>
          </div>
          <div className="flex items-center gap-2">
            <dt>شروع قیمت</dt>
            <Price amount={tour.priceFrom} size="md" />
          </div>
        </dl>

        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="brand" size="lg">
            <a href={PHONE_MOBILE_LINK} data-call-context="tour-banner">
              <Phone aria-hidden />
              تماس با کارشناس فروش
            </a>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link href={`/tours/${tour.slug}`}>
              مشاهدهٔ جزئیات تور
              <ArrowLeft aria-hidden />
            </Link>
          </Button>
        </div>
      </div>

      {/* پنل تایپوگرافیک مقصد: در موبایل بالا، در دسکتاپ ستون چپ (پایان خواندن) */}
      <div className="order-1 flex flex-col justify-center border-b border-border pb-6 md:order-2 md:border-b-0 md:border-s md:pb-0 md:ps-8">
        <span aria-hidden className="block h-px w-16 bg-border" />
        <p className="mt-4 flex items-baseline justify-end gap-3 font-display text-5xl sm:text-6xl">
          {tour.shortTitle}
          <span aria-hidden className="block size-2.5 shrink-0 rounded-full bg-brand" />
        </p>
      </div>
    </Card>
  );
}
