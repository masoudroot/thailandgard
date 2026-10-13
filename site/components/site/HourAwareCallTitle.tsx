/**
 * تیتر ساعت‌آگاه کارت «تماس مستقیم» صفحهٔ /contact (یافتهٔ M-2 تیم lead،
 * ۲۱ مهر ۱۴۰۵): ادعای «سریع‌ترین راه است» خارج از ساعت کاری با واقعیت
 * (کسی پشت خط نیست) و با نشانگر زنده تناقض داشت. داخل ساعت کاری تیتر
 * فعلی می‌ماند؛ خارج ساعت کاری جایگزین خنثی «تماس مستقیم تلفنی».
 * متن نهایی جایگزین‌ها با content است؛ این حداقلِ لازم برای رفع تناقض است.
 *
 * منطق از تک‌منبع `site/lib/working-hours.ts` (همان `isWithinWorkingHours`
 * نشانگر زنده) تا تیتر هرگز با نشانگر تناقض نسازد. کلاینت + پیش‌فرض SSR
 * داخل-ساعت (الگوی درس ۱۵:۰۵) تا پیش‌رندر استاتیک نشکند.
 */
"use client";

import * as React from "react";
import { isWithinWorkingHours } from "@/lib/working-hours";
import { cn } from "@/lib/utils";

const TITLE_OPEN = "خودتان زنگ بزنید؛ سریع‌ترین راه است";
const TITLE_CLOSED = "تماس مستقیم تلفنی";

export function HourAwareCallTitle({ className }: { className?: string }) {
  const [open, setOpen] = React.useState<boolean | null>(null);
  React.useEffect(() => {
    setOpen(isWithinWorkingHours(new Date()));
  }, []);
  // پیش‌فرض SSR: داخل ساعت کاری (همان تیتر فعلی) تا هایدریشن تکان نخورد.
  return (
    <h2 className={cn("text-xl font-semibold", className)}>
      {open === false ? TITLE_CLOSED : TITLE_OPEN}
    </h2>
  );
}
