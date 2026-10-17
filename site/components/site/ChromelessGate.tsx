"use client";

/**
 * ChromelessGate: فقط روی کلاینت اجرا می‌شود (ssr:false).
 * اگر مسیر chromeless باشد (/login یا /dashboard)، پوستهٔ سایت را با
 * CSS مخفی می‌کند تا هیچ هدر/فوتر/اسکریپتی روی آن‌ها نماند.
 */

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { isChromelessPath } from "./SiteChrome";

export default function ChromelessGate() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname && isChromelessPath(pathname)) {
      const el = document.querySelector("[data-site-chrome]");
      if (el) {
        (el as HTMLElement).style.display = "none";
      }
      // اسکریپت Clarity را هم غیرفعال کن
      document.getElementById("clarity")?.remove();
    }
  }, [pathname]);

  return null;
}
