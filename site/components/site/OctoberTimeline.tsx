"use client";

import { useEffect, useState } from "react";
import { cn, fa } from "@/lib/utils";
import { formatJalali } from "@/lib/jalali";

/**
 * خط زمانی سه‌ایستگاهی لندینگ «پوکت؛ نیمهٔ دوم اکتبر»؛ حکم ۱ artdir + حکم جهت (اجرای :۳۵، ۲۰ مهر ۱۴۰۵):
 * خط مویی ۱px پیوسته (توکن border، هرگز کهربایی)؛ نقطه‌های ۸px دقیقاً روی خط
 * (size-2.5 آیتم رجیستری سوار نشد؛ حکم ۱ پابرجاست)؛ خوانش راست‌به‌چپ (ایستگاه اول سمت راست)؛
 * ایستگاه پیش‌رو نقطهٔ کهربایی، ایستگاه سپری‌شده نقطهٔ خنثی کم‌رنگ (بدون برچسب «به پایان رسید»)؛
 * موبایل افقی، برچسب‌ها حداکثر دوخطی.
 * الگوی activeIndex آیتم رجیستری components/timeline برای وضعیت فعال/سپری‌شده
 * (به‌جای محاسبهٔ خام هر آیتم): activeIndex = نخستین ایستگاهی که هنوز سپری نشده؛
 * آیتم‌های پیش از آن سپری‌شده، بقیه پیش‌رو.
 * تاریخ‌ها با formatJalali: شمسی اصلی + میلادی کمکی، مثل «۱۸ مهر (۱۰ اکتبر)».
 * جهت افقی: انحراف آگاهانه از آیتم عمودی رجیستری (ثبت در agents/vibefarsi/DEVIATIONS.md)؛
 * این تایم‌لاین فهرست رویداد نیست، نوار شمارش فشردهٔ کمپین است.
 * وضعیت در کلاینت حساب می‌شود (Date.now در پره‌رندر سرور ممنوع است).
 */
const STATIONS = [
  { date: new Date("2026-10-10T23:59:59+03:30"), gLabel: "۱۰ اکتبر", label: "جشنوارهٔ گیاه‌خواران" },
  { date: new Date("2026-10-15T23:59:59+03:30"), gLabel: "۱۵ اکتبر", label: "بازگشایی سیمیلان" },
  { date: new Date("2026-10-18T23:59:59+03:30"), gLabel: "۱۸ اکتبر", label: "پرواز مستقیم هیترو" },
];

export function OctoberTimeline() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
  }, []);

  // الگوی activeIndex آیتم رجیستری: یک ایندکس واحد وضعیت را می‌راند، نه محاسبهٔ خام هر آیتم.
  const rawIndex = STATIONS.findIndex((st) => now === null || now <= st.date.getTime());
  const activeIndex = rawIndex === -1 ? STATIONS.length : rawIndex;

  return (
    <div className="relative mx-auto mt-14 max-w-3xl pb-14 sm:pb-20" dir="rtl">
      <div aria-hidden className="absolute inset-x-14 top-1 h-px bg-border" />
      <ol className="relative flex items-start justify-between">
        {STATIONS.map((st, i) => {
          const elapsed = i < activeIndex;
          // شمارش معکوس پویا برای ایستگاه میانی (به‌جای «۵ روز بعد» ثابت که با
          // گذر روزها غلط می‌شد؛ امروز ۲۰ مهر: ۳ روز مانده). با سپری‌شدن، نامرئی
          // می‌ماند تا ریتم مساوی فاصله‌ها (قلم ۵ artdir) به‌هم نریزد.
          // D-075: تفاضل روی مرز روز تقویمی حساب می‌شود، نه میلی‌ثانیهٔ خام؛
          // وگرنه ceil در ساعت‌های پایانی روز یک روز اضافه نشان می‌داد
          // (مثلاً شب ۲۰ مهر «۴ روز بعد» به‌جای ۳ روز مانده تا ۲۳ مهر).
          const startOfDay = (t: number) => {
            const d = new Date(t);
            d.setHours(0, 0, 0, 0);
            return d.getTime();
          };
          const daysLeft =
            now === null
              ? null
              : Math.round(
                  (startOfDay(st.date.getTime()) - startOfDay(now)) / 86400000,
                );
          return (
            <li key={st.gLabel} className="flex w-28 flex-col items-center">
              <span
                aria-hidden
                className={cn("size-2 rounded-full", elapsed ? "bg-muted-foreground/40" : "bg-brand")}
              />
              <span className="mt-3 text-sm font-semibold tabular-nums">
                {formatJalali(st.date, { year: false })} ({st.gLabel})
              </span>
              <span className="mt-1 line-clamp-2 text-center text-sm leading-6 text-muted-foreground">
                {st.label}
              </span>
              {/* قلم ۵ artdir (۰۹:۰۵): برچسب فاصله زیر ایستگاه میانی؛ فاصله‌های ایستگاه‌ها مساوی می‌مانند؛
                  حکم ۲ artdir (۰۹:۳۵): کف text-sm؛ برگشت به text-xs بدون حکم تازه ممنوع */}
              {i === 1 && daysLeft !== null && (
                <span
                  className={cn(
                    "mt-1 text-sm text-muted-foreground",
                    (elapsed || daysLeft <= 0) && "invisible"
                  )}
                  aria-hidden={elapsed || daysLeft <= 0}
                >
                  {fa(Math.max(daysLeft, 1))} روز بعد
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
