import type * as React from "react";
import { cn } from "@/lib/utils";

/**
 * ظهور هنگام اسکرول، بدون جاوااسکریپت (F4 - کاهش بار کلاینت).
 *
 * قبلاً این کامپوننت کلاینتی بود: یک `IntersectionObserver` روی هر بلوک
 * می‌نشست تا با ورودش کلاس انیمیشن بگذارد. همان کار حالا با «انیمیشن
 * وابسته به اسکرول» بومی CSS انجام می‌شود (`animation-timeline: view()`)
 * و مرورگری که پشتیبانی نکند فقط انیمیشن را ندارد؛ محتوا در هر حال خوانا
 * و مرئی است (بدون جاوااسکریپت هم کامل دیده می‌شود).
 *
 * API دست‌نخورده مانده است (`delay`، `durationMs`، `className`) تا هیچ
 * فراخواننده‌ای عوض نشود.
 *
 * کلاس `reveal-view` و کی‌فریم‌ها در `app/globals.css` هستند و
 * `prefers-reduced-motion` در همان‌جا خاموش می‌کند.
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
  return (
    <div
      className={cn("reveal-view", className)}
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
