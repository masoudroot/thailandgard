# دستور اجرایی: توکن‌های قاب عکس + قاب تماس + بهداشت CTA | design ← dev | ۲۰ مهر ۱۴۰۵، اجرای teams-20261012-2235 (فاز ۲)

**پیشینه:** بریف artdir `agents/artdir/TOKENS/token-photo-frame-2026-10-12-04.md` (سه توکن ماسک گرادیان + شش قانون مصرف + دیف TourCard) و رأی زیبایی‌شناسی artdir برای F-100 (قاعدهٔ CTA دوگانه). وضعیت S-002 در ران ۲۲:۴۷ حسابرس: home ۲، ‎/tours ۳، ‎/guide ۵ تگ img با alt دارند؛ تور ترکیبی، one-bangkok، diamond-resort و ‎/contact صفر تگ img بدنه.

**نکتهٔ مهم دربارهٔ S-002:** راهنماهای بدون کاور (۱۳ راهنما) و تور ترکیبی طبق حکم artdir (F-015) قاب **تایپوگرافیک** می‌گیرند، نه عکس ناجور؛ پس صفر img در این نقاط «باگ» نیست، «الگوی مصوب» است. img واقعی وقتی می‌آید که content کاور را تأمین کند (فهرست معوق در §۵). تنها نقطهٔ واقعاً خالی از قاب، ‎/contact است که این سند پرش می‌کند.

## قلم ۱: توکن‌ها در `site/app/globals.css`

بلوک دقیق بریف artdir (بدون تغییر):

```css
:root {
  --frame-mask-card: linear-gradient(to top,
    oklch(0.982 0.0035 90 / 0.7) 0%,
    oklch(0.982 0.0035 90 / 0.25) 45%,
    transparent 82%);

  --frame-mask-deep: linear-gradient(to top,
    oklch(0.982 0.0035 90) 0%,
    oklch(0.982 0.0035 90 / 0.82) 30%,
    oklch(0.982 0.0035 90 / 0.35) 62%,
    transparent 92%);

  --frame-typographic: linear-gradient(155deg,
    oklch(0.993 0.002 90) 0%,
    oklch(0.955 0.005 90) 100%);
}

@theme inline {
  --background-image-frame-mask-card: var(--frame-mask-card);
  --background-image-frame-mask-deep: var(--frame-mask-deep);
  --background-image-frame-typographic: var(--frame-typographic);
}
```

## قلم ۲: جایگزینی ۴ گرادیان ادهاک با توکن (رفتار دیداری عوض نمی‌شود)

همهٔ این چهار نقطه دقیقاً همان ماسک موج اول‌اند؛ فقط توکن می‌شوند:

- `site/components/site/TourCard.tsx` خط ۵۲: `bg-gradient-to-t from-background/70 via-background/25 to-transparent` ← `bg-frame-mask-card`
- `site/app/guide/[slug]/page.tsx` خط ۱۷۱: همان رشته ← `bg-frame-mask-card`
- `site/app/guide/page.tsx` خط ۹۶: همان رشته ← `bg-frame-mask-card`
- `site/app/tours/[slug]/page.tsx` خط ۲۲۲: همان رشته ← `bg-frame-mask-card`

کامنت «استثنای design-rules: جهت گرادیان ماسک خاصیت بصری است نه چیدمان» در TourCard سر جایش می‌ماند (دربارهٔ جهت `to top` است، نه خود گرادیان).

## قلم ۳: قاب ‎/contact (اسلات S6؛ پوستر تایپوگرافیک)

**چرا تایپوگرافیک:** هیچ عکسی از دفتر/تیم در کتابخانه نیست و عکس ناجور ممنوع است (حکم artdir). وقتی content عکس واقعی آورد، همین قاب با ماسک `bg-frame-mask-card` و همین متن روی ماسک، عکسی می‌شود؛ کد تازه لازم نیست.

**جا:** `site/app/contact/page.tsx`، بین `</header>` و `<div className="mt-8 grid gap-6 lg:grid-cols-2">` (تمام‌عرض، بالای گرید دو کارت؛ سلسله‌مراتب کارت‌ها طبق حکم مدیر ۱۰:۱۵ دست نمی‌خورد).

**ساختار:**

```tsx
<div className="mt-8 overflow-hidden rounded-control border border-border bg-frame-typographic px-8 py-10 text-center sm:py-12">
  <p className="font-display text-2xl text-foreground sm:text-3xl">پاسخ‌گویی همه‌روزه</p>
</div>
```

- بدون ماسک (ماسک فقط روی عکس معنا دارد؛ این نقطه بی‌عکس است).
- بدون خط دوم: ساعت کاری در کارت «خودتان زنگ بزنید» همان صفحه هست و تکرار در همان ویوپورت نمی‌خواهیم.
- `font-display` همان Pinar تیترهاست؛ `rounded-control` = ۸ پیکسل (قاب، نه سطح).

## قلم ۴: بهداشت پیش‌فرض navbar (F-100؛ بدون تغییر دیداری)

`site/components/blocks/navbar.tsx` خط ۳۲: پیش‌فرض `secondary = { label: "تماس با مشاور سفر" }` با پیش‌فرض `primary` یکی است. در `layout.tsx` الان override شده («تماس با ما») و نمونهٔ زنده سالم است، ولی این پیش‌فرض برای هر مصرف بعدی تله است. تغییر یک‌خطی:

- `secondary = { label: "تماس با ما" }` (همان مصرف واقعی layout.tsx).

## §۵: کاورهای معوق (صف content، نه dev)

این نقاط الگوی تایپوگرافیکِ هم‌شکل دارند و img واقعی‌شان با تأمین عکس می‌آید. وقتی فایل در `site/public/images/` نشست، فقط ورودی `GUIDE_COVERS` / `TOUR_COVERS` اضافه می‌شود؛ کامپوننت‌ها (`CoverImage`، هدر جزئیات) خودشان برمی‌دارند:

- تور: `bangkok-phuket-8-days` (کاور generic: افق شهری + ساحل؛ کاور `tour-bangkok-pattaya-8-days.webp` مال تور دیگری است و این‌جا نمی‌آید)
- ۱۳ راهنما: `krabi-vs-phuket`، `tehran-bangkok-direct-flight`، `flights-from-iran-to-thailand`، `baht-price-two-month-low`، `lastminute-thailand-guide`، `loy-krathong-2026-chiang-mai`، `phuket-safety-tips`، `one-bangkok-second-anniversary`، `diamond-resort-phuket-review`، `bangkok-world-best-city-2026`، `pattaya-fireworks-festival-azar`، `thailand-high-season-planning`، `thailand-trip-cost`

## معیار پذیرش qa

۱. گرپ `from-background/70` در `site/components` و `site/app` صفر رخداد (همه توکنی شدند).
۲. رندر کارت تور و هدر راهنما/تور با قبلِ توکن‌سازی پیکسل‌به‌پیکسل یکسان (توکن = همان ماسک).
۳. ‎/contact یک قاب تایپوگرافیک تمام‌عرض با متن «پاسخ‌گویی همه‌روزه» دارد؛ بدون img (عکسی نیست)، بدون پلِیس‌هولدر خاکستری.
۴. در ۳۶۰ پیکسل و دسکتاپ، متن روی ماسک/قاب کنتراست AA دارد.
