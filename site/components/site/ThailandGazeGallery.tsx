/**
 * گالری افقی «تایلند در یک نگاه» (تغییر بصری امروز، ۲۱ مهر ۱۴۰۵).
 * اسپک: `agents/design/SPECS/gallery-thailand-gaze-home-mount-exec-2026-10-13-11.md`
 * ایمپورت واقعی آیتم رجیستری `components/carousel` (کپی: `site/components/ui/carousel.tsx`).
 *
 * حکم‌های لازم‌الاجرای design-ir (اجرا ۱۱):
 * - حکم ۴۶: تیتر «تایلند در یک نگاه» (نه «نگاه تایلند») + زیرتیتر هم‌رجیستر با هیرو.
 * - حکم ۴۷: کپشن‌ها هم‌سطح «نام مقصد + حس صحنه»؛ قاب‌های پکیجی (نام تور) حذف شدند
 *   و با قاب‌های تکی جایگزین شدند (وات‌آرون بانکوک از پیشنهاد خود حکم).
 * - حکم ۴۸: قاب اولِ غروبِ تکراری (همان عکس سکشن بعدی) حذف شد.
 * - حکم ۴۹: قاب انسانی asset آماده ندارد؛ تأمینش با content است (ثبت در گزارش، نه skeleton).
 *
 * قاعده‌های اجرایی: بدون انیمیشن خودکار؛ کلیک روی قاب کاری نمی‌کند (نمایشی)؛
 * کپشن تک‌خطی زیر قاب؛ ارقام فارسی؛ بدون لهجهٔ کهربایی؛ بدون U+2014.
 */
"use client";

import * as React from "react";
import { Carousel } from "@/components/ui/carousel";

type Frame = { src: string; caption: string };

// ترتیب خوانش RTL: اولین قاب سمت راست می‌نشیند.
const FRAMES: Frame[] = [
  { src: "/images/tour-phuket-7-days.webp", caption: "پوکت؛ قایق دم‌بلند روی آب فیروزه‌ای" },
  { src: "/images/tour-bangkok-pattaya-8-days.webp", caption: "بانکوک؛ سیلوئت وات‌آرون بر کرانهٔ رود" },
  { src: "/images/tour-samui-7-days.webp", caption: "سامویی؛ خلیج آرام با نخل" },
  { src: "/images/tour-krabi-6-days.webp", caption: "کرابی؛ ساحل آرام با جزیرهٔ صخره‌ای" },
];

export function ThailandGazeGallery() {
  const [w, setW] = React.useState(0.72);
  React.useEffect(() => {
    const onResize = () => setW(window.innerWidth < 768 ? 0.72 : 0.3);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return (
    <section aria-label="گالری تایلند در یک نگاه" className="py-12">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="text-balance text-2xl sm:text-3xl">تایلند در یک نگاه</h2>
        <p className="mt-2 text-muted-foreground">یه نگاه کوتاه به جاهایی که قراره ببریمتون</p>
      </div>
      <Carousel slideWidth={w} showDots={false} className="mt-6">
        {FRAMES.map((f) => (
          <figure key={f.src}>
            <div className="aspect-[4/3] overflow-hidden rounded-control border border-border">
              <img src={f.src} alt={f.caption} loading="lazy" decoding="async" className="size-full object-cover" />
            </div>
            {/* کپشن تک‌خطی زیر قاب، نه روی عکس (بریف؛ حکم ۴۷: فقط نام صحنه، بدون تفسیر) */}
            <figcaption title={f.caption} className="mt-2 truncate text-xs text-muted-foreground">{f.caption}</figcaption>
          </figure>
        ))}
      </Carousel>
    </section>
  );
}
