"use client";

import { useEffect, useState } from "react";
import { Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PHONE_MOBILE_LINK } from "@/lib/site";

/**
 * نوار CTA چسبان صفحهٔ تور (M3؛ بریف اجرایی artdir، ۱۹ مهر ۱۴۰۵، ساعت ۱۹).
 * فقط موبایل (md:hidden)؛ فقط از پایان هیرو به بعد (نگهبان #tour-hero-end)؛
 * فقط یک دکمهٔ تمام‌عرض «تماس با کارشناس فروش» (variant=brand، آیکون Phone)؛
 * بدون قیمت، بدون واتس‌اپ، بدون دکمهٔ بستن؛ max-h-[20vh]، گوشه‌های بالایی ۸،
 * کادر مویی ۱px در بالا، بدون سایه، env(safe-area-inset-bottom)؛
 * شماره فقط از ثابت سراسری PHONE_MOBILE_LINK (هاردکد ممنوع).
 */
export function TourStickyBar() {
  const [pastHero, setPastHero] = useState(false);

  useEffect(() => {
    const sentinel = document.getElementById("tour-hero-end");
    if (!sentinel) {
      setPastHero(true);
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => setPastHero(!entry.isIntersecting && entry.boundingClientRect.top < 0),
      { threshold: 0 },
    );
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, []);

  if (!pastHero) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 max-h-[20vh] overflow-hidden rounded-t-lg border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <div className="mx-auto max-w-5xl px-4 py-3">
        <Button asChild size="lg" variant="brand" className="w-full">
          <a href={PHONE_MOBILE_LINK}>
            <Phone />
            تماس با کارشناس فروش
          </a>
        </Button>
      </div>
    </div>
  );
}
