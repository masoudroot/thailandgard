/**
 * تیتر ساعت‌آگاه کارت «تماس مستقیم» صفحهٔ /contact (یافتهٔ M-2 تیم lead،
 * ۲۱ مهر ۱۴۰۵): ادعای «سریع‌ترین راه است» خارج از ساعت کاری با واقعیت
 * (کسی پشت خط نیست) و با نشانگر زنده تناقض داشت. داخل ساعت کاری تیتر
 * فعلی می‌ماند؛ خارج ساعت کاری جایگزین خنثی «تماس مستقیم تلفنی».
 * متن نهایی جایگزین‌ها با content است؛ این حداقلِ لازم برای رفع تناقض است.
 *
 * منطق از تک‌منبع `site/lib/working-hours.ts` (همان `isWithinWorkingHours`
 * نشانگر زنده) تا تیتر هرگز با نشانگر تناقض نسازد. کلاینت + پیش‌فرض SSR
 * داخل-ساعت (هوک `useNow`) تا پیش‌رندر استاتیک نشکند.
 */
"use client";

import { isWithinWorkingHours } from "@/lib/working-hours";
import { cn } from "@/lib/utils";
import { useNow } from "@/lib/use-now";

const TITLE_OPEN = "خودتان زنگ بزنید؛ سریع‌ترین راه است";
const TITLE_CLOSED = "تماس مستقیم تلفنی";

export function HourAwareCallTitle({ className }: { className?: string }) {
  // پیش‌فرض SSR: داخل ساعت کاری (همان تیتر فعلی) تا هایدریشن تکان نخورد.
  const now = useNow();
  const open = now === null ? true : isWithinWorkingHours(new Date(now));
  return (
    <h2 className={cn("text-balance text-xl font-semibold", className)}>
      {open ? TITLE_OPEN : TITLE_CLOSED}
    </h2>
  );
}
