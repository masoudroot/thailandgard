import type * as React from "react";
import { cn } from "@/lib/utils";

/**
 * ظهور CSS-only برای بلوک‌های بالا و پایین صفحه؛ نسخهٔ بدون جاوااسکریپت `Reveal`.
 *
 * چرا هست (F4 - کاهش هیدریشن): `Reveal` کلاینتی است چون برای بلوک‌های پایین صفحه
 * `IntersectionObserver` لازم دارد. بلوک‌هایی که همیشه (حتی بدون اسکرول) دیده
 * می‌شوند به آبزرور نیاز ندارند؛ همین `animation` CSS کافی است. استفاده از این
 * نسخه در هیرو باعث می‌شود کل هیرو روی سرور رندر شود و هیچ جاوااسکریپتی برای
 * انیمیشن ورودش دانلود نشود.
 *
 * کلاس `reveal` و کی‌فریم‌ها در `app/globals.css` تعریف شده‌اند (همان قرارداد
 * `--reveal-delay` و `--reveal-duration` و همان احترام به reduced-motion).
 */
export function RevealStatic({
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
  return (
    <div
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
