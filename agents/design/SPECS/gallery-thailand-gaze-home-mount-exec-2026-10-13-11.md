# اسپک mount گالری افقی «نگاه تایلند» (بریف ۱ artdir، ساعت ۱۴) | اجرا teams-1013-1104-cron | ۲۱ مهر ۱۴۰۵

**ورودی لازم‌الاجرا:** `agents/artdir/BRIEFS/brief-visual-ideas-2026-10-13-14.md` (بریف ۱، امروز)؛ حکم ۲۹-نهایی artdir؛ داوری نقدهای موتور در همان بریف (پذیرفته‌ها/ردشده‌ها). مأموریت بصری امروز: این گالری «تغییر بصری قابل‌مشاهدهٔ امروز» است؛ mount همین اجرا، امروز روی سایت می‌نشیند.

## نکتهٔ رجیستری (مهم)

آیتم `blocks/gallery` در آینهٔ محلی رجیستری وجود ندارد (۱۹ بلوک فهرست‌شده، گالری نیست). نزدیک‌ترین آیتم: **`components/carousel`** (اسلایدر با اسکرول‌اسنپ بومی و راست‌چین واقعی، اولین اسلاید سمت راست، «بعدی» به چپ می‌رود؛ INDEX.md سطر ۳۰). مبنای اجرا همین است، نه ساخت اسلایدر دستی.

## قدم ۱: کپی آیتم رجیستری

منبع: `~/workspace/skills/vibefarsi/registry/r/components/carousel.json` (کلید `files[0]`: مسیر `components/ui/carousel.tsx`). مقصد: `site/components/ui/carousel.tsx`؛ همان ایمپورت واقعی استفاده می‌شود:

```tsx
import { Carousel } from "@/components/ui/carousel";
```

وابستگی: `lucide-react` (داریم) و `cn, fa` از `@/lib/utils` (داریم). **انحراف ثبت‌شده از آیتم:** کلاس `shadow` از دکمه‌های جهت‌دار `nav` آیتم حذف می‌شود (گرافیت: بدون سایه؛ حکم artdir). این انحراف را در `agents/vibefarsi/DEVIATIONS.md` ثبت کن (با ارجاع به این اسپک).

## قدم ۲: کامپوننت جدید `site/components/site/ThailandGazeGallery.tsx`

`"use client"`؛ وظیفه: گالری نمایشی بدون کلیک.

```tsx
"use client";

import * as React from "react";
import { Carousel } from "@/components/ui/carousel";

type Frame = { src: string; caption: string };

// ترتیب خوانش RTL: اولین قاب سمت راست می‌نشیند.
const FRAMES: Frame[] = [
  { src: "/images/hero-phuket-sunset.webp", caption: "غروب ساحل پوکت" },
  { src: "/images/tour-phuket-7-days.webp", caption: "پوکت" },
  { src: "/images/tour-krabi-6-days.webp", caption: "کرابی" },
  { src: "/images/tour-samui-7-days.webp", caption: "سامویی" },
  { src: "/images/tour-bangkok-pattaya-8-days.webp", caption: "بانکوک و پاتایا" },
  { src: "/images/tour-bangkok-phuket-8-days-cover.webp", caption: "بانکوک و پوکت" },
];

// کپشن‌ها پیشنهادی‌اند؛ متن نهایی با content (قاعده: فقط نام صحنه، بدون تفسیر).

export function ThailandGazeGallery() {
  const [w, setW] = React.useState(0.72);
  React.useEffect(() => {
    const onResize = () => setW(window.innerWidth < 768 ? 0.72 : 0.3);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return (
    <section aria-label="گالری نگاه تایلند" className="py-10">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="text-2xl sm:text-3xl">نگاه تایلند</h2>
        <p className="mt-2 text-muted-foreground">نگاهی کوتاه به جاهایی که می‌بریم‌تان.</p>
      </div>
      <Carousel slideWidth={w} showDots={false} className="mt-6">
        {FRAMES.map((f) => (
          <figure key={f.src}>
            <div className="aspect-[4/3] overflow-hidden rounded-control border border-border">
              <img src={f.src} alt={f.caption} loading="lazy" className="size-full object-cover" />
            </div>
            {/* کپشن تک‌خطی زیر قاب، نه روی عکس (بریف؛ قاعدهٔ لیبل/عدد: کپشن خنثی) */}
            <figcaption className="mt-2 truncate text-xs text-muted-foreground">{f.caption}</figcaption>
          </figure>
        ))}
      </Carousel>
    </section>
  );
}
```

## قاعده‌های اجرایی (از بریف و design-rules)

۱. **peek ۲۰٪ در موبایل:** `slideWidth={0.72}` یعنی قاب ~۷۲٪ عرض + گپ؛ قاب بعدی ~۲۵٪ دیده می‌شود (افوردنس ادامه‌دار بودن). در دسکتاپ `0.3` (۳ قاب‌ونیم) + دو دکمهٔ جهت‌دار خنثی خود آیتم؛ اسکرول‌بار مخفی (آیتم خودش دارد).
۲. **بدون انیمیشن خودکار.** آیتم carousel هیچ‌اتوپلی‌ای ندارد؛ چیزی اضافه نشود. احترام به `prefers-reduced-motion` خودکار است (بدون حرکت خودکار).
۳. **کلیک روی قاب کاری نمی‌کند** (نمایشی). پس `cursor-pointer` و لینک ممنوع؛ `alt`ها صحنه را می‌گویند، تفسیر نمی‌کنند.
۴. قاب‌ها: گوشهٔ ۸ (`rounded-control` = ‎`--shape-control`)، قاب مویی ۱px `border-border`، بدون سایه. کپشن `text-xs` خنثی **زیر** قاب.
۵. ارقام داخل کامپوننت: `fa()` آیتم خودش فارسی می‌کند (`aria-label` اسلایدها). عکس‌ها aspect دارند (بدون layout shift).
۶. بدون لهجهٔ کهربایی در کل بلوک.
۷. **تمام‌عرض:** سکشن در `page.tsx` بیرون از کانتینر max-w قرار می‌گیرد؛ تیتر داخل کانتینر، خود Carousel تمام‌عرض (track آیتم کل عرض سکشن را می‌گیرد).

## قدم ۳: mount در خانه

فایل `site/app/page.tsx`: بلافاصله **بعد** از بسته شدن سکشن گرید تورها (خط ~۱۳۶، `</section>` پس از `Reveal` کارت‌ها) و **قبل** از کامنت «سکشن تور ترکیبی بانکوک و پوکت» (FeatureSplit)، این دو خط:

```tsx
import { ThailandGazeGallery } from "@/components/site/ThailandGazeGallery";
...
<ThailandGazeGallery />
```

(ایمپورت بالای فایل، در کنار بقیهٔ کامپوننت‌های site.)

## معیار پذیرش (برای qa/inspector)

- در موبایل ۳۶۰px: قاب دوم ~۲۵٪ در لبه دیده می‌شود؛ اسکرول افقی با snap کار می‌کند؛ دو دکمهٔ جهت‌دار فعال/غیرفعال درست‌اند.
- در دسکتاپ: ~۳ قاب کامل + کمی از قاب چهارم؛ دکمه‌ها «قبلی/بعدی» (RTL: قبلی به راست، بعدی به چپ).
- کلیک روی قاب هیچ اتفاقی نمی‌افتد. بدون U+2014 در متن‌ها. tsc سبز.

## «بازشده در این اجرا»

- دیف mount گالری (با dev، فاز ۴)؛ ثبت انحراف shadow در DEVIATIONS (با dev)؛ کپشن‌های نهایی (با content).
