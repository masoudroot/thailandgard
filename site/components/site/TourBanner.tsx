import { ArrowLeft, CalendarDays, MapPin, Phone } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Price } from "@/components/ui/price";
import { fa } from "@/lib/utils";
import { getSiteSettings } from "@/lib/db-content";
import type { Tour } from "@/lib/tours";
import { CoverImage } from "@/components/site/CoverImage";
import { TOUR_COVERS } from "@/lib/tour-covers";

/**
 * بنر «منتخب این هفته» برای بالای /tours (قابل استفاده در خانه).
 * D-189 (۲۱ مهر ۱۴۰۵): پنل کناری قبلاً فقط واژهٔ تزئینی غول‌پیکر
 * (shortTitle) بود و جای‌نگه‌دار خوانده می‌شد؛ با کاور واقعی تور
 * (همان نگاشت TourCard) جایگزین شد. بدون کاور: جای‌نگه‌دار مویی هم‌شکل.
 */
export async function TourBanner({ tour }: { tour: Tour }) {
  const { PHONE_MOBILE_LINK } = await getSiteSettings();
  const titleId = `tour-banner-${tour.slug}`;
  const cover = TOUR_COVERS[tour.slug];
  return (
    <Card
      aria-labelledby={titleId}
      role="region"
      className="grid gap-6 p-6 sm:p-8 md:grid-cols-[1fr_18rem]"
    >
      {/* ستون متن: در موبایل زیر پنل، در دسکتاپ راست (ابتدای خواندن) */}
      <div className="order-2 flex flex-col gap-6 md:order-1">
        <div className="space-y-4">
          {/* اورراید آگاهانهٔ بج (۲۱ مهر ۱۴۰۵، اجرای ۰۸): واریانت brand خود بج
              پیل ۱۵٪ است (bg-brand/15)؛ این‌جا فیل توپر کهربایی می‌خواهد
              (bg-brand) چون بج «منتخب این هفته» روی بنر باید از دور خوانده
              شود، نه مثل بج خنثی روی ماسک عکس. متن همیشه brand-foreground. */}
          <Badge variant="brand" className="bg-brand text-brand-foreground">منتخب این هفته</Badge>
          {/* S-020 (۲۰ مهر ۱۴۰۵): کارت ویژه هم h3 است مثل کارت‌های گرید؛
              زیر همان h2 بخشی می‌نشیند. */}
          <h3
            id={titleId}
            className="font-display text-balance text-3xl sm:text-4xl"
          >
            {tour.title}
          </h3>
          {/* D-048: خلاصهٔ تکراری کارت حذف شد؛ به‌جایش سه هایلایت یک‌خطی از
              دیتای همان تور تا بلوک «منتخب» توصیف متفاوت خودش را داشته باشد */}
          <p className="max-w-2xl text-pretty text-base leading-[1.8]">
            {tour.highlights && tour.highlights.length > 0
              ? tour.highlights.slice(0, 3).join("، ")
              : tour.summary}
          </p>
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
            <dt>قیمت پایه</dt>
            <Price amount={tour.priceFrom} size="md" />
          </div>
        </dl>

        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="brand" size="lg">
            <a href={PHONE_MOBILE_LINK} data-call-context="tour-banner">
              <Phone aria-hidden />
              تماس با مشاور سفر
            </a>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link href={`/tours/${tour.slug}`}>
              مشاهدهٔ جزئیات تور {tour.shortTitle}
              <ArrowLeft aria-hidden />
            </Link>
          </Button>
        </div>
      </div>

      {/* پنل تصویری مقصد: در موبایل بالا، در دسکتاپ ستون چپ (پایان خواندن).
          D-189: کاور واقعی تور به‌جای واژهٔ تزئینی؛ قاب ۱۶:۱۰ + ماسک
          graphite-soft (همان الگوی TourCard؛ سقف ۷۰٪ حکم ۶ design-ir).
          استثنای design-rules: جهت گرادیان ماسک خاصیت بصری است نه چیدمان. */}
      <div className="order-1 flex flex-col justify-center border-b border-border pb-6 md:order-2 md:border-b-0 md:border-s md:pb-0 md:ps-8">
        <figure className="relative aspect-[16/10] overflow-hidden border border-border">
          {cover ? (
            <CoverImage
              src={cover.src}
              alt={cover.alt}
              width={cover.w}
              height={cover.h}
              sizes="(max-width: 768px) 100vw, 288px"
            />
          ) : (
            // جای‌نگه‌دار مینیمال هم‌شکل (الگوی D-081 در TourCard)
            <div className="flex size-full flex-col items-center justify-center bg-secondary/50 p-6">
              <span aria-hidden className="block h-px w-16 bg-border" />
            </div>
          )}
          <div aria-hidden className="absolute inset-0 bg-frame-mask-card" />
        </figure>
      </div>
    </Card>
  );
}
