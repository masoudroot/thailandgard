"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * ظهور هنگام اسکرول. Fades and rises when it enters the viewport; once only.
 * `durationMs` مدت انیمیشن است (پیش‌فرض ۷۰۰؛ برای هیرو ۲۰۰ پاس بده).
 *
 * Q3-05 (بودجهٔ کارایی): هیچ متنی برای دیده‌شدن منتظر هیدریشن نمی‌ماند.
 * - در SSR همه‌چیز مرئی است و «انیمیشن ورود» با تایمر CSS اجرا می‌شود؛ پس متن
 *   بالای صفحه در اولین رنگ‌آمیزی دیده می‌شود و LCP به پایان هیدریشن گره
 *   نمی‌خورد (قبلاً کلاس `opacity-0` در SSR بود و تا اجرای افکت پنهان می‌ماند).
 * - فقط بلوکی که بعد از هیدریشن هنوز بیرون از دید است پنهان می‌شود و با ورودش
 *   انیمیشن می‌گیرد؛ چون دیده نمی‌شود، پنهان‌شدنش پرش چشمی ندارد.
 * - بدون جاوااسکریپت هم همه‌چیز خوانده می‌شود (progressive enhancement).
 */
export function Reveal({
  children,
  delay = 0,
  durationMs = 700,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  durationMs?: number;
  className?: string;
}) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    // اگر همین حالا در دید (یا نزدیک آن) است، انیمیشن CSS را دست نزن.
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return;
    el.classList.add("reveal-deferred");
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        el.classList.remove("reveal-deferred");
        el.classList.add("reveal-in");
        io.disconnect();
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn("reveal", className)}
      style={
        {
          "--reveal-delay": `${delay}ms`,
          "--reveal-duration": `${durationMs}ms`,
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}
