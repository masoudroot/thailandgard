"use client";

import { Phone, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PHONE_MOBILE_LINK } from "@/lib/site";

/**
 * صفحهٔ خطای سراسری (۵۰۰). زبان همان not-found (۴۰۴) است؛ بدون انیمیشن ورودی.
 * متن نهایی با تیم محتوا («نتوانستیم این صفحه را بارگذاری کنیم.» موقت است).
 *
 * نکتهٔ سازگاری: داکس Next.js ۱۶ پراپ `retry` را ترجیح می‌دهد (`reset` قدیمی است)؛
 * هر دو را می‌پذیریم تا با هر نسخه‌ای که فریم‌ورک پاس داد کار کند.
 */
export default function Error({
  retry,
  reset,
}: {
  error: Error & { digest?: string };
  retry?: () => void;
  reset?: () => void;
}) {
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-6 py-16 text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_10%,transparent_65%)]"
        style={{ backgroundImage: "repeating-radial-gradient(circle at 50% 50%, oklch(from var(--foreground) l c h / 14%) 0 1px, transparent 1px 26px)" }}
      />
      <div className="relative w-full max-w-md text-center">
        <p className="font-display text-7xl font-bold tabular-nums text-foreground/15 sm:text-8xl">۵۰۰</p>
        <h1 className="mt-4 text-2xl">مشکلی پیش آمد</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          نتوانستیم این صفحه را بارگذاری کنیم.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <Button asChild size="lg">
            <a href={PHONE_MOBILE_LINK}>
              <Phone />
              تماس با کارشناس
            </a>
          </Button>
          <Button size="lg" variant="ghost" onClick={() => (retry ?? reset)?.()}>
            <RotateCcw />
            تلاش دوباره
          </Button>
        </div>
      </div>
    </div>
  );
}
