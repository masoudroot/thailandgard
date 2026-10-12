"use client";

import { useEffect } from "react";

/**
 * ردیاب تماس (قفل ۵ موتور رشد): شنوندهٔ سراسری کلیک روی لینک‌های tel:.
 * هیچ PII جمع نمی‌کند؛ فقط «کدام شماره» و «کدام صفحه».
 * ارسال با sendBeacon است تا ترک صفحه، ثبت را از دست ندهد.
 */
export function CallTracker() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest?.('a[href^="tel:"]') as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute("href") ?? "";
      if (!href.startsWith("tel:")) return;
      try {
        navigator.sendBeacon(
          "/api/track-call",
          JSON.stringify({
            href: href.slice(0, 64),
            page: window.location.pathname.slice(0, 128),
          }),
        );
      } catch {
        /* ردیابی هرگز تجربهٔ کاربر را نمی‌شکند */
      }
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
