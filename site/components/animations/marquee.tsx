import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * نوار متحرک. محتوا دو بار تکرار می‌شود و از ‎-50%‎ تا ‎0‎ جابه‌جا می‌شود،
 * یعنی در جهت طبیعی راست‌به‌چپ می‌لغزد و بی‌درز حلقه می‌زند.
 * شرط بی‌درزی: هر نیمه دقیقاً «محتوا + یک شکاف انتهایی» باشد تا ‎-50%‎
 * دقیقاً یک دوره شود؛ پس شکاف بین دو نیمه حذف و به‌جایش ‎paddingRight‎
 * (به‌اندازهٔ همان شکاف) ته هر نیمه گذاشته شده. محو لبه‌ها با ماسک
 * گرادیانی روی ریشه انجام می‌شود.
 */
export function Marquee({ children, duration = 30, gap = "1rem", className }: { children: React.ReactNode; duration?: number; gap?: string; className?: string }) {
  return (
    <div className={cn("w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]", className)} dir="ltr">
      <div className="flex w-max" style={{ animation: `marquee ${duration}s linear infinite` }}>
        <div className="flex shrink-0 items-center" style={{ gap, paddingRight: gap }} dir="rtl">{children}</div>
        <div className="flex shrink-0 items-center" style={{ gap, paddingRight: gap }} dir="rtl" aria-hidden>{children}</div>
      </div>
    </div>
  );
}