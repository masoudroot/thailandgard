/**
 * کارت تور. دست‌ساز می‌ماند: نزدیک‌ترین معادل رجیستری (product-grid)
 * برای ویترین فروشگاه است نه تور؛ این کارت با ترکیب کامپوننت‌های
 * رجیستری (Card، Price، Badge) ساخته شده ولی ساختار فروش تور را دارد.
 */
import { ArrowLeft, CalendarDays, MapPin, Phone } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Price } from "@/components/ui/price";
import { Separator } from "@/components/ui/separator";
import { PHONE_MOBILE_LINK } from "@/lib/site";
import { fa } from "@/lib/utils";
import type { Tour } from "@/lib/tours";

/** اسلاگ تور ترکیبی (اسپک خانه ۲۰ مهر ۱۴۰۵): رندر شرطی روی یک ثابت متمرکز؛
    اگر seo اسلاگ نهایی را عوض کرد، فقط همین‌جا عوض می‌شود. */
export const COMBO_SLUG = "bangkok-phuket-8-days";

/** کارت تور در فهرست و صفحهٔ خانه. */
export function TourCard({ tour }: { tour: Tour }) {
  // دروازهٔ mount (اسپک ۲۰ مهر): رکورد DB + قیمت مسعود. بدون این دو،
  // هیچ تور ترکیبی در payload نیست و این شرط‌ها کد مرده‌اند؛ چیزی mount نمی‌شود.
  const isCombo = tour.slug === COMBO_SLUG;
  return (
    <Card className="flex h-full flex-col overflow-hidden transition-transform duration-(--motion) ease-motion active:[transform:var(--press)]">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          {/* بج: برای ترکیبی فقط یک لکهٔ کهربایی «ترکیبی جدید»؛ بج shortTitle نمی‌آید (حکم ۲ بریف) */}
          <Badge variant="brand">{isCombo ? "ترکیبی جدید" : tour.shortTitle}</Badge>
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <CalendarDays className="size-3.5" />
            {fa(tour.days)} روزه
          </span>
        </div>
        <CardTitle className="mt-3 text-xl">{tour.title}</CardTitle>
        <CardDescription className="leading-7">{tour.summary}</CardDescription>
        <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="size-3.5" />
          {tour.route}
        </p>
      </CardHeader>
      <CardContent className="mt-auto space-y-4 pt-2">
        <Separator />
        {/* ردیف قیمت: برای ترکیبی (بدون عدد) Price و لیبل «شروع قیمت» نمی‌آیند؛
            میکروکپی ثابت در همان کانتینر می‌نشیند تا هم‌قدی کارت‌ها حفظ شود (قلم ۳ اسپک).
            با رسیدن عدد مسعود: Price + برچسب «اعتبار نرخ تا» (در این اسپک پیاده نمی‌شود). */}
        <div className="flex flex-nowrap items-baseline justify-between gap-3">
          {isCombo ? (
            <span className="text-sm text-muted-foreground">قیمت روز بر اساس تاریخ سفر و هتل انتخابی؛ تلفنی</span>
          ) : (
            <>
              <span className="text-sm text-muted-foreground">شروع قیمت</span>
              <Price amount={tour.priceFrom} size="md" />
            </>
          )}
        </div>
        {/* حکم ۱ artdir (۰۹:۳۵، اسپک design قلم ۲): ردیف CTA دوتایی؛
            جزئیات اول (flex-1)، دکمهٔ آیکونی تماس دوم (outline، ۴۴px) */}
        <div className="flex gap-2">
          <Button asChild variant="secondary" className="flex-1">
            <Link href={`/tours/${tour.slug}`}>
              مشاهدهٔ جزئیات تور {tour.shortTitle}
              <ArrowLeft aria-hidden />
            </Link>
          </Button>
          <Button asChild variant="outline" size="icon" className="size-11 shrink-0" aria-label="تماس با کارشناس فروش">
            <a href={PHONE_MOBILE_LINK} data-call-context="tour-card">
              <Phone />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
