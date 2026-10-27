"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * دکمه‌های قبلی/بعدی گالری (F4). تنها بخش کلاینتی گالری است.
 *
 * چرا جدا شد: نسخهٔ قبلی کل گالری را کلاینتی می‌کرد، چون `Carousel` عرض اسلاید
 * را با `useState` و لیسنر `resize` حساب می‌کرد. عرض حالا در CSS است
 * (`w-[72vw] md:w-[30%]`) و فقط دو دکمه برای اسکرول جاوااسکریپت لازم دارند.
 * هیچ وضعیت یا ایندکسی نگه نمی‌دارد؛ فقط ترک را یک اسلاید جلو/عقب می‌برد.
 */
export function GalleryArrows({ trackId }: { trackId: string }) {
  // RTL: اسلایدهای بعدی سمت چپ‌اند و scrollLeft منفی می‌شود؛ پس «بعدی» = منفی.
  const go = (dir: 1 | -1) => {
    const el = document.getElementById(trackId);
    if (!el) return;
    const slide = el.firstElementChild as HTMLElement | null;
    const step = slide ? slide.getBoundingClientRect().width : el.clientWidth * 0.72;
    el.scrollBy({ left: -dir * step, behavior: "smooth" });
  };

  // D-408: ناحیهٔ لمس نامرئی برای تارگت ۴۴px؛ D-506: حلقهٔ فوکس کهربایی.
  const nav =
    "absolute top-1/2 z-10 flex size-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-border bg-background/80 text-foreground backdrop-blur transition-opacity duration-(--motion) hover:bg-accent before:absolute before:-inset-1 before:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

  return (
    <>
      <button type="button" aria-label="قبلی" title="قبلی" onClick={() => go(-1)} className={`${nav} start-2`}>
        <ChevronRight aria-hidden className="size-4" />
      </button>
      <button type="button" aria-label="بعدی" title="بعدی" onClick={() => go(1)} className={`${nav} end-2`}>
        <ChevronLeft aria-hidden className="size-4" />
      </button>
    </>
  );
}
