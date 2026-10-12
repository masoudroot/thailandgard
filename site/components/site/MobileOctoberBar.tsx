"use client";

import { useEffect, useState } from "react";
import { Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Price } from "@/components/ui/price";

/**
 * نوار چسبان موبایل لندینگ «پوکت؛ نیمهٔ دوم اکتبر»؛ حکم ۲ artdir + جهت M5
 * (یافتهٔ مهم qa، ۱۹ مهر ۱۴۰۵ :۳۵):
 * فقط از پایان هیرو به بعد (با نگهبان #october-hero-end)؛ ارتفاع حداکثر
 * ۲۰٪ دید؛ کادر مویی ۱px در بالا؛ بدون سایه؛ گوشه‌های بالایی ۸؛
 * env(safe-area-inset-bottom)؛ لی‌اوت دو ردیفه در کل بازهٔ موبایل:
 * ردیف ۱ قیمت یک‌خطهٔ کامل («از» + عدد فارسی + «تومان» + «هر نفر»، یا «تماس بگیرید» اگر قیمت null است؛
 * هیچ‌کدام حذف یا collapse نمی‌شوند؛ wrap احتیاطی با تراز راست)؛
 * ردیف ۲ دو دکمهٔ flex-1 با h-11 (کف لمسی ۴۴px؛ بازحکم artdir ۱۴۰۵/۰۷/۲۰): «تماس فوری» فیل کهربایی (RTL: راست) و
 * «واتس‌اپ» outline خنثی (RTL: چپ)؛ بدون دکمهٔ بستن.
 */
export function MobileOctoberBar({
  priceFrom,
  phoneHref,
  whatsappHref,
}: {
  priceFrom: number | null;
  phoneHref: string;
  whatsappHref: string;
}) {
  const [pastHero, setPastHero] = useState(false);

  useEffect(() => {
    const sentinel = document.getElementById("october-hero-end");
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
    <div role="region" aria-label="اقدام سریع" className="fixed inset-x-0 bottom-0 z-40 max-h-[20vh] overflow-hidden rounded-t-lg border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      {/* M5 (جهت artdir ۱۹ مهر ۱۴۰۵ :۳۵): دو ردیف در کل بازهٔ موبایل؛ قیمت از
          ردیف دکمه‌ها جدا شد چون در ۳۶۰px زیر کف خوانایی بود. بودجهٔ ارتفاع:
          pt-2 + ردیف قیمت + gap-1.5 + ردیف دکمه‌ها (h-11) + pb-2 + safe-area. */}
      <div className="mx-auto flex max-w-5xl flex-col gap-1.5 px-4 pt-2 pb-2">
        {/* ردیف ۱: قیمت — «از X تومان هر نفر» یا «تماس بگیرید» (قانون نمایش قیمت، دستور مسعود ۱۴۰۵/۰۷/۲۰) */}
        <p className="flex flex-wrap items-baseline justify-end gap-x-1.5 text-right">
          <Price amount={priceFrom} size="sm" />
          {priceFrom != null && <span className="text-sm text-muted-foreground">هر نفر</span>}
        </p>
        {/* ردیف ۲: دکمه‌ها — RTL: «تماس فوری» راست (اول DOM)، «واتس‌اپ» چپ */}
        <div className="flex gap-2">
          <Button asChild size="md" variant="brand" className="flex-1 h-11">
            <a href={phoneHref} data-call-context="mobile-october-bar">
              <Phone />
              تماس فوری
            </a>
          </Button>
          <Button asChild size="md" variant="outline" className="flex-1 h-11">
            <a href={whatsappHref}>واتس‌اپ</a>
          </Button>
        </div>
      </div>
    </div>
  );
}
