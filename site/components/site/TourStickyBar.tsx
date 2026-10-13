"use client";

import { useEffect, useState } from "react";
import { MessageCircle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PHONE_MOBILE_LINK, WHATSAPP_LINK } from "@/lib/site";
import { clarityEvent } from "@/lib/clarity";
import { isWithinWorkingHours } from "@/lib/working-hours";

/**
 * نوار CTA چسبان صفحهٔ تور (M3؛ بریف اجرایی artdir، ۱۹ مهر ۱۴۰۵، ساعت ۱۹؛
 * بازحکم ساختاری آرت‌دایرکشن (۲۱ مهر ۱۴۰۵، ~۰۴:۴۵، دور دوم):
 * در ۳۶۰px گرید 7fr/3fr ردیف را بیرون می‌زد؛ نوار در موبایل دو ردیفه شد
 * (الگوی MobileOctoberBar): ردیف ۱ «تماس با مشاور سفر» تمام‌عرض
 * (variant=brand، ‏h-11‏، text-base، رفتار ساعت کاری دست‌نخورده)؛
 * ردیف ۲ «مشاوره واتس‌اپی» تمام‌عرض (variant=secondary، ‏h-10‏، text-sm).
 * چیدمان flex-col + gap-2 جای گرید؛ بقیهٔ اسپک M3 تکان نخورد
 * (سقف 20vh، کادر مویی، بدون سایه، md:hidden، نگهبان #tour-hero-end).
 * بودجهٔ ارتفاع ~۱۱۷px در سقف ۱۲۸px.
 * راستی‌آزمایی D-158 (۲۱ مهر ۱۴۰۵، نبض دیزاین): سقف 20vh روی ویوپورت ۵۶۸px
 * ≈۱۱۴px می‌شود در برابر استک ذاتی ۱۱۷px (۹۲px دکمه‌ها + ۲۴px پدینگ + ۱px
 * کادر)؛ سرریز حداکثر ~۳٫۴px که فقط از پدینگ پایینی ۱۲px قاب خورده می‌شود؛
 * هر دو دکمه همیشه کامل دیده می‌شوند (در دستگاه‌های دارای home indicator
 * قد ویوپورت ≥۸۱۲px است و سقف 20vh همیشه از استک + inset بزرگ‌تر می‌ماند).
 * پس بریدگی محتوایی نیست و دست‌کاری اسپک لازم نشد؛ یافتهٔ کاذب.
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
    <div role="region" aria-label="اقدام سریع" className="fixed inset-x-0 bottom-0 z-40 max-h-[20vh] overflow-hidden rounded-t-lg border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <div className="mx-auto max-w-5xl px-4 py-3">
        {/* بازحکم ساختاری آرت‌دایرکشن (۰۴:۴۵ دور دوم): الگوی MobileOctoberBar —
            flex-col + gap-2 جای گرید 7fr/3fr؛ ردیف ۱ تمام‌عرض برند h-11،
            ردیف ۲ تمام‌عرض ثانویه h-10؛ ترتیب DOM همان می‌ماند. */}
        <div className="flex flex-col gap-2">
          <Button asChild variant="brand" className="h-11 w-full px-6 text-base">
            {/* قلم ۳ اسپک موبایل (۲۱ مهر ۱۴۰۵): خارج از ساعت کاری شماره‌گیری
                نمی‌کند؛ اسکرول نرم به فرم #callback. واتس‌اپ دست نمی‌خورد. */}
            <a
              href={PHONE_MOBILE_LINK}
              data-call-context="sticky-bar"
              onClick={(e) => {
                if (isWithinWorkingHours()) return;
                e.preventDefault();
                clarityEvent("tel_outside_hours_redirect", { context: "sticky-bar" });
                document.getElementById("callback")?.scrollIntoView({ behavior: "smooth", block: "start" });
                const notice = document.getElementById("callback-hours-notice");
                if (notice) {
                  notice.setAttribute("tabindex", "-1");
                  notice.focus({ preventScroll: true });
                }
              }}
            >
              <Phone aria-hidden />
              تماس با مشاور سفر
            </a>
          </Button>
          <Button asChild variant="secondary" className="h-10 w-full px-6 text-sm">
            <a href={WHATSAPP_LINK}>
              <MessageCircle aria-hidden />
              مشاوره واتس‌اپی
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
