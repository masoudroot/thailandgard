"use client";

import { useEffect, useState } from "react";
import { MessageCircle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PHONE_MOBILE_LINK, WHATSAPP_LINK } from "@/lib/site";

/**
 * نوار CTA چسبان صفحهٔ تور (M3؛ بریف اجرایی artdir، ۱۹ مهر ۱۴۰۵، ساعت ۱۹؛
 * بازحکم ۲۰ مهر :۳۵: واتس‌اپ فقط CTA دوم فرعی).
 * فقط موبایل (md:hidden)؛ فقط از پایان هیرو به بعد (نگهبان #tour-hero-end)؛
 * دکمهٔ برند «تماس با کارشناس فروش» اول و پررنگ (~۷۰٪ عرض) + دکمهٔ دوم
 * «واتس‌اپ» (variant=secondary، آیکون MessageCircle، ~۳۰٪ عرض)؛ هم‌وزن ممنوع؛
 * بدون قیمت، بدون دکمهٔ بستن؛ max-h-[20vh]، گوشه‌های بالایی ۸،
 * کادر مویی ۱px در بالا، بدون سایه، env(safe-area-inset-bottom)؛
 * لینک‌ها فقط از ثابت‌های سراسری (هاردکد ممنوع).
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
        {/* بازحکم M3 (۰۹:۳۵): دو دکمهٔ h-11 هم‌ارتفاع یک دکمهٔ تمام‌عرض؛
            برند اول (~۷۰٪)، واتس‌اپِ فرعی دوم (~۳۰٪)؛ سقف ارتفاع تکان نخورد */}
        <div className="grid grid-cols-[7fr_3fr] gap-2">
          <Button asChild size="lg" variant="brand" className="h-11">
            <a href={PHONE_MOBILE_LINK}>
              <Phone />
              تماس با کارشناس فروش
            </a>
          </Button>
          <Button asChild size="lg" variant="secondary" className="h-11">
            <a href={WHATSAPP_LINK}>
              <MessageCircle />
              واتس‌اپ
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
