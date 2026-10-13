# اسپک mount کاورهای قهرمان راهنماها (کلاس S-002) | اجرا teams-1013-1104-cron | ۲۱ مهر ۱۴۰۵

**ریشهٔ یافته:** `GUIDE_COVERS` در `site/lib/guide-covers.ts` فقط ۵ راهنما را پوشش می‌دهد؛ ۱۳ راهنمای تازه‌تر هیچ ورودی‌ای ندارند پس صفحه‌هایشان با جای‌نگه‌دار تایپوگرافیک رندر می‌شوند و در HTML زنده صفر تگ `<img>` دارند (S-002، S-095، S-118، S-126، S-130، S-138، S-144، S-151، S-155). assetها آماده‌اند: `site/public/images/generated/guide-<slug>.webp` (هر ۱۳ تا ۱۶۰۰×۱۰۰۰، ۲۰۰ می‌دهند). og:image همان‌ها از قبل روی dev در `og-slugs.ts` نشسته (کامیت 31238c2)؛ این اسپک فقط کاور قهرمان صفحهٔ جزئیات (slot هیرو) را می‌بندد.

## دیف: `site/lib/guide-covers.ts`

هر ۱۳ ورودی را به آخر `GUIDE_COVERS` اضافه کن (فرمت عین ورودی‌های موجود؛ `alt`ها پیشنهادی، مالک نهایی content):

```ts
  "lastminute-thailand-guide": {
    src: "/images/generated/guide-lastminute-thailand-guide.webp",
    alt: "کارت راهنمای تور لحظه آخری تایلند",
    w: 1600,
    h: 1000,
  },
  "loy-krathong-2026-chiang-mai": {
    src: "/images/generated/guide-loy-krathong-2026-chiang-mai.webp",
    alt: "کارت راهنمای جشن لوی کراتنگ ۲۰۲۶",
    w: 1600,
    h: 1000,
  },
  "one-bangkok-second-anniversary": {
    src: "/images/generated/guide-one-bangkok-second-anniversary.webp",
    alt: "کارت خبری دومین سالگرد وان بانکوک",
    w: 1600,
    h: 1000,
  },
  "pattaya-fireworks-festival-azar": {
    src: "/images/generated/guide-pattaya-fireworks-festival-azar.webp",
    alt: "کارت راهنمای فستیوال آتش‌بازی پاتایا در آذر",
    w: 1600,
    h: 1000,
  },
  "baht-price-two-month-low": {
    src: "/images/generated/guide-baht-price-two-month-low.webp",
    alt: "کارت راهنمای قیمت بات تایلند در کف دوماهه",
    w: 1600,
    h: 1000,
  },
  "bangkok-world-best-city-2026": {
    src: "/images/generated/guide-bangkok-world-best-city-2026.webp",
    alt: "کارت خبری انتخاب بانکوک به‌عنوان بهترین شهر جهان در ۲۰۲۶",
    w: 1600,
    h: 1000,
  },
  "krabi-vs-phuket": {
    src: "/images/generated/guide-krabi-vs-phuket.webp",
    alt: "کارت مقایسهٔ کرابی و پوکت",
    w: 1600,
    h: 1000,
  },
  "thailand-trip-cost": {
    src: "/images/generated/guide-thailand-trip-cost.webp",
    alt: "کارت راهنمای هزینهٔ سفر به تایلند",
    w: 1600,
    h: 1000,
  },
  "phuket-safety-tips": {
    src: "/images/generated/guide-phuket-safety-tips.webp",
    alt: "کارت راهنمای نکات ایمنی سفر به پوکت",
    w: 1600,
    h: 1000,
  },
  "tehran-bangkok-direct-flight": {
    src: "/images/generated/guide-tehran-bangkok-direct-flight.webp",
    alt: "کارت راهنمای پرواز مستقیم تهران به بانکوک",
    w: 1600,
    h: 1000,
  },
  "flights-from-iran-to-thailand": {
    src: "/images/generated/guide-flights-from-iran-to-thailand.webp",
    alt: "کارت راهنمای مسیرهای پروازی ایران به تایلند",
    w: 1600,
    h: 1000,
  },
  "thailand-high-season-planning": {
    src: "/images/generated/guide-thailand-high-season-planning.webp",
    alt: "کارت راهنمای برنامه‌ریزی سفر پاییزی به تایلند",
    w: 1600,
    h: 1000,
  },
  "diamond-resort-phuket-review": {
    src: "/images/generated/guide-diamond-resort-phuket-review.webp",
    alt: "کارت بررسی هتل دایموند ریزورت پوکت",
    w: 1600,
    h: 1000,
  },
```

تغییر دیگری در کد لازم نیست: قاب قهرمان `site/app/guide/[slug]/page.tsx` (خط ~۱۸۲) و `articleImage` اسکیما (خط ~۱۲۷) خودکار از همین نگاشت می‌خوانند؛ جای‌نگه‌دار تایپوگرافیک برای راهنماهای بدون کاور سر جایش می‌ماند (عکس ناجور ممنوع).

## چه آیتم‌هایی با این اسپک «آمادهٔ راستی‌آزمایی» می‌شوند (بستن فقط با حسابرس)

- S-118 (لوی کراتنگ)، S-126 (هزینهٔ سفر)، S-130 (کرابی-پوکت)، S-138 (بات)، S-144 (بانکوک بهترین شهر)، S-151 (وان بانکوک)، S-155 (فستیوال پاتایا)، S-095 (لحظه‌آخری)، و بخش راهنماهای S-002: پس از mount، هر کدام ۱ تگ `<img>` با alt در بدنه می‌گیرند + کلید `image` اسکیما (از قبل سیم‌کشی است).
- S-081 (بخش og) و S-085 (بخش og) روی dev از قبل بسته‌اند (og-slugs.ts)؛ راستی‌آزمایی زنده‌شان با فوروارد main.

## چه می‌ماند و چرا (صادقانه)

- **phuket-in-october (S-157، بند ۴):** برای این اسلاگ هیچ asset تصویری در `generated/` یا کتابخانه نیست. mountی نمی‌توانم بدهم؛ تأمین asset با content (اولویت) یا تولید کارت تازه. تا آن روز این بند باز می‌ماند.
- altها پیشنهادی‌اند؛ content هر کدام را که صحنه‌ای نمی‌گوید بازنویسی کند (قاعدهٔ «alt صحنه را می‌گوید، تفسیر نمی‌کند»).

## «بازشده در این اجرا»

- دیف ۱۳ ورودی GUIDE_COVERS (با dev، فاز ۴)؛ altهای نهایی (با content)؛ راستی‌آزمایی زندهٔ ۱۳ صفحه پس از mount + فوروارد (با seo-strict، ران بعدی‌اش).
