"use client";

import { useEffect, useState } from "react";
import { Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Price } from "@/components/ui/price";

/**
 * نوار چسبان موبایل لندینگ «پوکت؛ نیمهٔ دوم اکتبر»؛ حکم ۲ artdir:
 * فقط از پایان هیرو به بعد (با نگهبان #october-hero-end)؛ ارتفاع حداکثر
 * ۲۰٪ دید؛ کادر مویی ۱px در بالا؛ بدون سایه؛ گوشه‌های بالایی ۸؛
 * env(safe-area-inset-bottom)؛ فقط سه چیز: قیمت «شروع از» (ارقام فارسی +
 * «تومان» و «هر نفر»، هرگز حذف نمی‌شوند) + دو CTA («تماس فوری» فیل اول،
 * «مشاوره در واتس‌اپ» outline دوم؛ دو فیل هم‌وزن ممنوع)؛ بدون دکمهٔ بستن.
 */
export function MobileOctoberBar({
  priceFrom,
  phoneHref,
  whatsappHref,
}: {
  priceFrom: number;
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
    <div className="fixed inset-x-0 bottom-0 z-40 max-h-[20vh] overflow-hidden rounded-t-lg border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">شروع قیمت از</p>
          <p className="mt-0.5">
            <Price amount={priceFrom} size="sm" />
            <span className="mr-1 text-xs text-muted-foreground">هر نفر</span>
          </p>
        </div>
        <Button asChild size="lg" variant="brand">
          <a href={phoneHref}>
            <Phone />
            تماس فوری
          </a>
        </Button>
        <Button asChild size="lg" variant="outline">
          <a href={whatsappHref}>مشاوره در واتس‌اپ</a>
        </Button>
      </div>
    </div>
  );
}
