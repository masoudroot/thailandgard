/**
 * نشانگر زندهٔ وضعیت پاسخ‌گویی (پیشنهاد lead، ۲۱ مهر ۱۴۰۵؛ PROPOSAL-1405-07-21-live-status-chip.md).
 *
 * منطق ساعت از تک‌منبع `site/lib/working-hours.ts` می‌آید (همان `isWithinWorkingHours`
 * که SmartTelLink استفاده می‌کند) تا متن نشانگر هرگز با رفتار لینک tel: تناقض نسازد.
 * رندر سمت کاربر (client) تا ساعت دستگاه کاربر ملاک باشد؛ پیش‌فرض SSR نسخهٔ
 * داخل-ساعت-کاری است (الگوی درس ۱۵:۰۵: useState-null + useEffect تا پیش‌رندر استاتیک نشکند).
 *
 * داخل ساعت کاری: نقطهٔ سبز + «الان پاسخ‌گوییم».
 * خارج ساعت کاری: نقطهٔ خاکستری + «خارج از ساعت کاری‌ایم؛ درخواست‌تان را بگذارید،
 * {روز} زنگ می‌زنیم» + لینک مستقیم به فرم. نام روز از `nextCallbackDayName`
 * می‌آید (حکم ۱۶ design-ir: قول تماس «روز معلوم» است، نه «به‌زودی»).
 */
"use client";

import * as React from "react";
import Link from "next/link";
import { isWithinWorkingHours, nextCallbackDayName } from "@/lib/working-hours";
import { cn } from "@/lib/utils";

export function LiveStatusChip({
  className,
  callbackHref = "#callback",
}: {
  className?: string;
  callbackHref?: string;
}) {
  const [open, setOpen] = React.useState<boolean | null>(null);
  const [day, setDay] = React.useState("");
  React.useEffect(() => {
    const now = new Date();
    setOpen(isWithinWorkingHours(now));
    setDay(nextCallbackDayName(now));
  }, []);
  const isOpen = open ?? true; // پیش‌فرض SSR: داخل ساعت کاری
  return (
    <p role="status" className={cn("flex items-center gap-2 text-sm", className)}>
      <span
        aria-hidden
        className={cn(
          "size-2 shrink-0 rounded-full",
          isOpen ? "bg-emerald-500" : "bg-muted-foreground/50"
        )}
      />
      {isOpen ? (
        <span>الان پاسخ‌گوییم</span>
      ) : (
        <span>
          خارج از ساعت کاری‌ایم؛ درخواست‌تان را بگذارید، {day} زنگ می‌زنیم.{" "}
          <Link href={callbackHref} className="underline underline-offset-4">
            درخواست تماس
          </Link>
        </span>
      )}
    </p>
  );
}
