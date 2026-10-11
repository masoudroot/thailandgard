"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * خط زمانی سه‌ایستگاهی لندینگ «پوکت؛ نیمهٔ دوم اکتبر»؛ حکم ۱ artdir:
 * خط مویی ۱px پیوسته (توکن border، هرگز کهربایی)؛ نقطه‌های ۸px دقیقاً روی خط؛
 * خوانش راست‌به‌چپ (ایستگاه اول سمت راست)؛ ایستگاه پیش‌رو نقطهٔ کهربایی،
 * ایستگاه سپری‌شده نقطهٔ خنثی کم‌رنگ (بدون برچسب «به پایان رسید»)؛
 * موبایل افقی، برچسب‌ها حداکثر دوخطی.
 * وضعیت سپری‌شده/پیش‌رو در کلاینت حساب می‌شود (Date.now در پره‌رندر سرور ممنوع است).
 */
const STATIONS = [
  { dateLabel: "۱۰ اکتبر", label: "جشنوارهٔ گیاه‌خواران", time: new Date("2026-10-10T23:59:59+03:30").getTime() },
  { dateLabel: "۱۵ اکتبر", label: "بازگشایی سیمیلان", time: new Date("2026-10-15T23:59:59+03:30").getTime() },
  { dateLabel: "۱۸ اکتبر", label: "پرواز مستقیم هیترو", time: new Date("2026-10-18T23:59:59+03:30").getTime() },
];

export function OctoberTimeline() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
  }, []);

  return (
    <div className="relative mx-auto mt-14 max-w-3xl pb-14 sm:pb-20" dir="rtl">
      <div aria-hidden className="absolute inset-x-14 top-1 h-px bg-border" />
      <ol className="relative flex items-start justify-between">
        {STATIONS.map((st) => {
          const elapsed = now !== null && now > st.time;
          return (
            <li key={st.dateLabel} className="flex w-28 flex-col items-center">
              <span
                aria-hidden
                className={cn("size-2 rounded-full", elapsed ? "bg-muted-foreground/40" : "bg-brand")}
              />
              <span className="mt-3 text-sm font-semibold tabular-nums">{st.dateLabel}</span>
              <span className="mt-1 line-clamp-2 text-center text-xs leading-5 text-muted-foreground">
                {st.label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
