/**
 * کارت تور. دست‌ساز می‌ماند: نزدیک‌ترین معادل رجیستری (product-grid)
 * برای ویترین فروشگاه است نه تور؛ این کارت با ترکیب کامپوننت‌های
 * رجیستری (Card، Price، Badge) ساخته شده ولی ساختار فروش تور را دارد.
 *
 * اسلات تصویری S2/S3 (اسپک s002، ۲۰ مهر ۱۴۰۵): کاور ۱۶:۱۰ بالای کارت با
 * «قاب graphite-soft» (ماسک گرادیان از پایین + کادر مویی)؛ تیتر و ردیف قیمت
 * روی ماسک؛ alt فارسی یکتا. تور بدون کاور (D-127 به همهٔ تورها کاور داد؛
 * شاخهٔ جای‌نگه‌دار فقط برای اسلاگ‌های آینده نگه‌داشته شده) عکس ناجور
 * نمی‌گیرد؛ جای‌نگه‌دار هم‌شکل تایپوگرافیک.
 */
import { ArrowLeft, CalendarDays, MapPin, Phone } from "lucide-react";
import Link from "next/link";
import { Fragment } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Price } from "@/components/ui/price";
import { Separator } from "@/components/ui/separator";
import { PHONE_MOBILE_LINK } from "@/lib/site";
import { fa } from "@/lib/utils";
import type { Tour } from "@/lib/tours";
import { CoverImage } from "@/components/site/CoverImage";
import { TOUR_COVERS } from "@/lib/tour-covers";

/** اسلاگ تور ترکیبی (اسپک خانه ۲۰ مهر ۱۴۰۵): رندر شرطی روی یک ثابت متمرکز؛
    اگر seo اسلاگ نهایی را عوض کرد، فقط همین‌جا عوض می‌شود. */
export const COMBO_SLUG = "bangkok-phuket-8-days";

/* D-176 (ترتیب کانونی کارت‌ها): خانه و گرید /tours هر دو از همین منطق
   استفاده می‌کنند؛ تور ترکیبی اول می‌نشیند (راست‌ترین کارت در RTL)،
   بقیه با همان ترتیب موجود. اگر ترکیبی فعال نباشد، ترتیب دست نمی‌خورد. */
export function canonicalTourOrder<T extends { slug: string }>(tours: T[]): T[] {
  const i = tours.findIndex((t) => t.slug === COMBO_SLUG);
  if (i <= 0) return tours;
  return [tours[i], ...tours.slice(0, i), ...tours.slice(i + 1)];
}

/** کارت تور در فهرست و صفحهٔ خانه. */
export function TourCard({ tour, detailsLabel }: { tour: Tour; detailsLabel?: string }) {
  const isCombo = tour.slug === COMBO_SLUG;
  const cover = TOUR_COVERS[tour.slug];
  return (
    <Card className="flex h-full flex-col overflow-hidden transition-transform duration-(--motion) ease-motion active:[transform:var(--press)]">
      {/* اسلات تصویری S2/S3: قاب ۱۶:۱۰ + ماسک graphite-soft از پایین.
          سقف شدت ماسک ۷۰٪ (حکم ۶ design-ir)؛ تایپ فقط روی ناحیهٔ ماسک. */}
      <div className="relative aspect-[16/10] overflow-hidden border-b border-border">
        {cover ? (
          <CoverImage
            src={cover.src}
            alt={cover.alt}
            width={cover.w}
            height={cover.h}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
          />
        ) : (
          // جای‌نگه‌دار مینیمال (D-081): واژهٔ تزئینی shortTitle حذف شد؛ تیتر کامل
          // روی ماسک (CardTitle) همان واژه را تکرار می‌کرد و تیتر تکراری می‌شد.
          // فقط خط‌حایل مویی می‌ماند تا اسلات شکلش را نگه دارد.
          <div className="flex size-full flex-col items-center justify-center bg-secondary/50 p-6">
            <span aria-hidden className="block h-px w-16 bg-border" />
          </div>
        )}
        {/* استثنای design-rules: جهت گرادیان ماسک خاصیت بصری است نه چیدمان */}
        <div aria-hidden className="absolute inset-0 bg-frame-mask-card" />
        <div className="absolute inset-x-0 bottom-0 p-4">
          {/* صفحهٔ مات روشن پشت نوار متن (D-225): خوانایی تیتر و قیمت روی نواحی
              روشن و شلوغ عکس؛ ماسک قاب دست نخورد (سقف شدت ۷۰٪، حکم ۶ design-ir)؛
              گرادیان تیره با تیتر تیره ناسازگار بود پس همین راه‌حل سبک اعمال شد. */}
          <div className="space-y-1.5 rounded-xl bg-background/60 px-4 py-3 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-2">
            {/* بج: برای ترکیبی فقط یک لکهٔ کهربایی «ترکیبی جدید»؛ بج shortTitle نمی‌آید (حکم ۲ بریف)
                یافتهٔ ۲ ممیزی وایب‌فارسی (۲۰ مهر ۱۴۰۵): متن کهرباییِ تنها روی ماسک روشن ممنوع؛
                فیل کهربایی + متن brand-foreground (اورراید در محل استفاده، قانون ۱۰) */}
            <Badge variant="brand" className="bg-brand text-brand-foreground">{isCombo ? "ترکیبی جدید" : tour.shortTitle}</Badge>
            {/* بج مدت‌زمان روی عکس (D-173): متن خاکستری تنها روی ماسک روشن
                کم‌کنتراست بود؛ چیپ توپر گرافیتی + متن زمینه (الگوی چیپ
                تخفیف Price در همین کارت)، خوانا روی عکس‌های روشن. */}
            <span className="inline-flex items-center gap-1 rounded-full bg-foreground px-2.5 py-0.5 text-xs font-medium text-background">
              <CalendarDays className="size-3.5" />
              {fa(tour.days)} روز و {fa(tour.nights)} شب
            </span>
          </div>
          <CardTitle className="text-xl">{tour.title}</CardTitle>
          {/* ردیف قیمت روی ماسک (حکم ۹ design-ir: لیبل در سمت راست/start، عدد در سمت چپ/end).
              الگوی یکسان هر ۵ کارت (D-056): بی‌قیمت هم همان ردیف لیبل+مقدار را دارد؛
              Price خودش «تماس بگیرید» رندر می‌کند (دستور مسعود، ۱۴۰۵/۰۷/۲۰). */}
          <div className="flex flex-nowrap items-baseline justify-between gap-3">
            <span className="text-sm text-muted-foreground">قیمت پایه</span>
            <Price amount={tour.priceFrom} size="md" />
          </div>
          </div>
        </div>
      </div>
      <CardContent className="flex flex-1 flex-col gap-3 p-5">
        <CardDescription className="leading-7">{tour.summary}</CardDescription>
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="size-3.5" />
          {tour.route}
        </p>
        {/* نوار پاهای تور ترکیبی (اسپک combo-card چرخهٔ ۰۶ §۱، ۲۱ مهر ۱۴۰۵):
            فقط وقتی تور پا دارد (قید ۱)؛ قرارداد دیداری بدنهٔ خود TourCard
            (ردیف flex با text-sm)، نه الگوی dl (یافتهٔ F-1 وایب‌فارسی).
            انحراف آگاهانه از «p» اسپک: جداکنندهٔ عمودی Separator یک div است و
            div داخل p نامعتبر است (کلاس باگ F-002)؛ پس ردیف div است.
            حکم ۲۶ design-ir: فقط یک MapPin در start کل ردیف، نه برای هر پا.
            جداکنندهٔ مویی با aria-hidden (F-096)؛ role="list"/"listitem" برای
            سمانتیک (F-097). ترتیب DOM = ترتیب سفر (بانکوک اول) تا در RTL
            راست بنشیند. */}
        {tour.legs && tour.legs.length > 0 && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground" role="list" aria-label="پاهای تور">
            <MapPin className="size-3.5" aria-hidden />
            {tour.legs.map((leg, i) => (
              <Fragment key={`${leg.destinationName}-${i}`}>
                {i > 0 && <Separator orientation="vertical" decorative aria-hidden="true" />}
                <span role="listitem">
                  {fa(leg.nights)} شب {leg.destinationName}
                </span>
              </Fragment>
            ))}
          </div>
        )}
        {/* حکم ۱ artdir (۰۹:۳۵، اسپک design قلم ۲): ردیف CTA دوتایی؛
            جزئیات اول (flex-1)، دکمهٔ آیکونی تماس دوم (outline، ۴۴px) */}
        <div className="mt-auto flex gap-2 pt-2">
          <Button asChild variant="secondary" className="flex-1">
            <Link href={`/tours/${tour.slug}`}>
              {detailsLabel ?? `مشاهدهٔ جزئیات تور ${tour.shortTitle}`}
              <ArrowLeft aria-hidden />
            </Link>
          </Button>
          <Button asChild variant="outline" size="icon" className="size-11 shrink-0" aria-label={`تماس با مشاور سفر؛ تور ${tour.shortTitle}`}><a href={PHONE_MOBILE_LINK} data-call-context="tour-card"><Phone aria-hidden /></a></Button>
        </div>
      </CardContent>
    </Card>
  );
}
