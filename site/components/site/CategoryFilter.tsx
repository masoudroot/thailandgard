"use client";

/**
 * فیلتر سریع صفحهٔ دسته‌بندی: چیپ‌های تعداد شب و بازهٔ قیمت + گرید کارت‌ها.
 * TourCard سرورکامپوننت است و نمی‌شود در کلاینت ایمپورتش کرد؛ پس کارت
 * همین‌جا inline با همان زبان بصری (Card، Price، بج shortTitle) ساخته شده.
 */
import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarDays, MapPin } from "lucide-react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Price } from "@/components/ui/price";
import { cn, fa } from "@/lib/utils";
import { formatJalali } from "@/lib/jalali";
import type { Tour } from "@/lib/tours";

/** قیمت‌ها به تومان‌اند؛ مرزهای میلیون‌تومانی بازه‌ها. */
const MILLION = 1_000_000;

type PriceBucket = "under50" | "mid" | "over80";

const PRICE_BUCKETS: { key: PriceBucket; label: string; test: (price: number) => boolean }[] = [
  { key: "under50", label: "زیر ۵۰ میلیون", test: (p) => p < 50 * MILLION },
  { key: "mid", label: "۵۰ تا ۸۰ میلیون", test: (p) => p >= 50 * MILLION && p <= 80 * MILLION },
  { key: "over80", label: "بالای ۸۰ میلیون", test: (p) => p > 80 * MILLION },
];

/**
 * تازگی قیمت از روی فیلد سرورمحاسبه‌شده می‌خوانیم (۲۶ مهر ۱۴۰۵؛ فیکس بیلد ورسل):
 * صدا زدن Date.now در رندر کامپوننت کلاینتی با cacheComponents بیلد استاتیک
 * را قرمز می‌کند («unstable value Date.now in a Client Component»).
 * سرور داخل «use cache» (getCategoryToursCached) همین مقدار را محاسبه و در
 * فیلد priceFresh هر تور می‌نشاند؛ این‌جا فقط می‌خوانیم. با هر دیپلوی تازه
 * محاسبه می‌شود که با ریتم انتشار پیوسته همان تازگی موردنظر است.
 */
function isPriceFresh(tour: Tour): boolean {
  return tour.priceFresh ?? false;
}

/** مرتب‌سازی: قیمت به‌روز اول، بعد ارزان‌تر، بی‌قیمت آخر. */
function sortTours(tours: Tour[]): Tour[] {
  return [...tours].sort((a, b) => {
    const freshA = isPriceFresh(a);
    const freshB = isPriceFresh(b);
    if (freshA !== freshB) return freshA ? -1 : 1;
    const pa = a.priceFrom ?? Number.POSITIVE_INFINITY;
    const pb = b.priceFrom ?? Number.POSITIVE_INFINITY;
    return pa - pb;
  });
}

function Chip({
  active,
  onClick,
  children,
  label,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "rounded-full border px-4 py-1.5 text-sm transition-colors duration-(--motion)",
        active
          ? "border-brand bg-brand/10 font-medium text-foreground"
          : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

/** کارت تور داخل گرید فیلتر؛ نسخهٔ سبک inline از همان زبان بصری TourCard. */
function TourMiniCard({ tour }: { tour: Tour }) {
  const updatedAt = tour.priceUpdatedAt ? new Date(tour.priceUpdatedAt) : null;
  const updatedLabel =
    updatedAt && !Number.isNaN(updatedAt.getTime()) ? formatJalali(updatedAt) : null;
  return (
    <Card className="flex h-full flex-col">
      <CardContent className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-center justify-between gap-2">
          <span className="rounded-full bg-brand px-2.5 py-0.5 text-xs font-medium text-brand-ink">
            {tour.shortTitle}
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <CalendarDays className="size-3.5" aria-hidden />
            {fa(tour.days)} روز و {fa(tour.nights)} شب
          </span>
        </div>
        <CardTitle className="text-lg leading-8">
          <Link
            href={`/tours/${tour.slug}`}
            className="rounded-sm transition-colors duration-(--motion) hover:text-brand focus-visible:bg-accent"
          >
            {tour.title}
          </Link>
        </CardTitle>
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          {tour.route}
        </p>
        <div className="flex flex-nowrap items-baseline justify-between gap-3 border-t border-border pt-3">
          <span className="text-sm text-muted-foreground">قیمت پایه</span>
          <Price amount={tour.priceFrom} size="sm" />
        </div>
        {updatedLabel && (
          <p className="text-xs text-muted-foreground">آخرین به‌روزرسانی قیمت: {updatedLabel}</p>
        )}
        <Link
          href={`/tours/${tour.slug}`}
          className="mt-auto inline-flex items-center justify-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors duration-(--motion) hover:bg-secondary focus-visible:bg-accent"
        >
          مشاهدهٔ جزئیات
          <ArrowLeft className="size-4" aria-hidden />
        </Link>
      </CardContent>
    </Card>
  );
}

export function CategoryFilter({ tours }: { tours: Tour[] }) {
  const [night, setNight] = useState<number | null>(null);
  const [bucket, setBucket] = useState<PriceBucket | null>(null);

  const nightOptions = useMemo(
    () => [...new Set(tours.map((t) => t.nights))].sort((a, b) => a - b),
    [tours],
  );

  const bucketOptions = useMemo(
    () =>
      PRICE_BUCKETS.filter((b) =>
        tours.some((t) => t.priceFrom != null && b.test(t.priceFrom)),
      ),
    [tours],
  );

  const filtered = useMemo(() => {
    const activeBucket = PRICE_BUCKETS.find((b) => b.key === bucket);
    return tours.filter(
      (t) =>
        (night == null || t.nights === night) &&
        (activeBucket == null || (t.priceFrom != null && activeBucket.test(t.priceFrom))),
    );
  }, [tours, night, bucket]);

  const shown = useMemo(() => sortTours(filtered).slice(0, 8), [filtered]);
  const hasFilters = night != null || bucket != null;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
        {nightOptions.length > 1 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">تعداد شب:</span>
            {nightOptions.map((n) => (
              <Chip
                key={n}
                active={night === n}
                label={`${fa(n)} شب`}
                onClick={() => setNight((cur) => (cur === n ? null : n))}
              >
                {fa(n)} شب
              </Chip>
            ))}
          </div>
        )}
        {bucketOptions.length > 1 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">بازهٔ قیمت:</span>
            {bucketOptions.map((b) => (
              <Chip
                key={b.key}
                active={bucket === b.key}
                label={b.label}
                onClick={() => setBucket((cur) => (cur === b.key ? null : b.key))}
              >
                {b.label}
              </Chip>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {fa(filtered.length)} تور
        </p>
        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              setNight(null);
              setBucket(null);
            }}
            className="rounded-sm text-sm text-muted-foreground underline decoration-muted-foreground/40 underline-offset-4 transition-colors duration-(--motion) hover:text-foreground focus-visible:bg-accent"
          >
            حذف فیلترها
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="mt-4 rounded-surface border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          با این فیلترها توری پیدا نشد؛ فیلترها را عوض کنید.
        </p>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((tour) => (
            <TourMiniCard key={tour.slug} tour={tour} />
          ))}
        </div>
      )}
    </div>
  );
}
