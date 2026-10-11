# چک سیستم رنگ و تایپوگرافی | تیم طراحی | ساعت ۰۵ | ۱۹ مهر ۱۴۰۵

مبنا: `site/app/globals.css` (تم graphite-soft) در برابر تصمیم‌های ثبت‌شدهٔ آرت‌دایرکشن
(`agents/artdir/TOKENS/token-sticky-bar-2026-10-11-04.md` و `token-sweep-2026-10-11-04.md`).
هیچ فایل `site/` دست نخورده؛ این سند فقط دیف کپی‌دقیق برای dev است.

## ۱) تأییدها (سالم، بدون اقدام)

- **صفر رنگ هاردکد:** هیچ `#hex` در کل `site/app` و `site/components` نیست (گرپ کامل، ۰ مورد).
- **گرادیان‌های اینلاین** (`blog-grid.tsx:28`، `contact.tsx:50`، `cta.tsx:9`، `not-found.tsx:12`)
  همه با `oklch(from var(--...) ...)` از توکن‌ها مشتق‌اند؛ رنگ خام تازه‌ای معرفی نمی‌کنند.
- **قانون مصرف برند رعایت شده:** `text-brand` تنها در هیچ‌جا نیست (۰ مورد)؛ همهٔ
  `bg-brand`ها با `text-brand-foreground` جفت‌اند (`layout.tsx:92`، `page.tsx:141`،
  `guide/page.tsx:25`، `contact/page.tsx:32`، `badge.tsx:12`، `button.tsx:12` برند).
- **فونت پینار درست سیم‌کشی شده:** هر ۴ وزن در `site/app/fonts/` هست و در
  `layout.tsx` با `next/font/local` به متغیر `--font-pinar` وصل‌اند؛
  `--font-sans` روی وزیرمتن و `--font-display` روی پینار است؛ `body` و
  `h1/h2/h3` در `globals.css` از همان‌ها می‌خوانند؛ `lang="fa"` و `dir="rtl"` سر جاست.
- **دیف‌های ساعت ۰۴ بسته‌اند:** توکن `--sticky-bar-clearance` در `:root` و نگاشت
  `--spacing-sticky-bar-clearance` در `@theme inline` ثبت شده و
  `tours/[slug]/page.tsx:255` حالا `pb-sticky-bar-clearance` دارد؛
  `flex-wrap` سطر قیمت هم در `components/ui/price.tsx` نشسته است.
- **نگه‌دارنده‌ها:** گارد ۱۶px فیلدها در iOS و `prefers-reduced-motion` در `globals.css` هست.

## ۲) یافته‌های قابل اعمال (دیف کپی‌دقیق، بدون تغییر بصری محسوس)

### قلم ۱ — دکمهٔ destructive از توکن foreground خودش نمی‌خواند
فایل: `site/components/ui/button.tsx`، خط ۱۳

قبل:
```
  destructive: "bg-destructive text-white hover:bg-destructive/90 shadow-control active:shadow-press",
```
بعد:
```
  destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-control active:shadow-press",
```
چرا: توکن `--color-destructive-foreground` در `@theme inline` تعریف شده (مقدارش عملاً سفید است)
ولی هیچ‌جا مصرف نمی‌شود؛ `text-white` رنگ خام و دور زدن توکن است.

### قلم ۲ — اسکریم شیت از رنگ خام مشکی است
فایل: `site/components/ui/sheet.tsx`، خط ۸۳

قبل:
```
          "absolute inset-0 bg-black/50 transition-[opacity,filter] ease-in-out",
```
بعد:
```
          "absolute inset-0 bg-foreground/50 transition-[opacity,filter] ease-in-out",
```
چرا: `--foreground` همان مشکی گرم تم است؛ اسکریم باید از توکن بیاید نه رنگ خام.
(این شیت منوی موبایل نوبار است؛ راستی‌آزمایی بصری: اسکریم باید مثل قبل تیره بماند.)

### قلم ۳ — سایهٔ شیت از توکن عمق نمی‌آید
فایل: `site/components/ui/sheet.tsx`، خط ۹۳

قبل:
```
          "absolute flex flex-col bg-popover text-popover-foreground shadow-2xl will-change-transform",
```
بعد:
```
          "absolute flex flex-col bg-popover text-popover-foreground shadow-overlay will-change-transform",
```
چرا: زبان گرافیت سایه را فقط از توکن‌های عمق می‌خواهد؛ `--shadow-overlay` دقیقاً برای همین
ساخته شده و `shadow-2xl` خامِ تیلویند است.

## ۳) یافته‌های نیازمند حکم آرت‌دایرکشن (بدون دیف؛ تغییر بصری دارد)

### مورد الف — توکن مردهٔ وزن دیسپلی + دو وزنی بودن h1
- `globals.css:38` توکن `--type-display-weight: 700` را تعریف می‌کند ولی هیچ‌جا خوانده نمی‌شود.
- هم‌زمان h1 سه صفحه (`guide/page.tsx:29`، `guide/[slug]/page.tsx:105`، `contact/page.tsx:36`)
  `font-extrabold` (۸۰۰) است و h1 چهارتای دیگر (`tours/page.tsx:23`، `tours/[slug]/page.tsx:113`،
  `hero.tsx:31`، `pillar-hero.tsx:31`) `font-bold` (۷۰۰).
- پیشنهاد به آرت‌دایرکشن: یا وزن واحد (مثلاً ۷۰۰ طبق توکن) حکم شود و توکن سیم‌کشی شود،
  یا تفکیک «صفحهٔ محتوایی در برابر هیرو» آگاهانه مستند شود و توکن مرده حذف شود.

### مورد ب — دریفت اندازهٔ h2 در موبایل
- سربرگ سکشن‌های صفحهٔ اصلی: `text-2xl sm:text-3xl` (موبایل ۲۴px).
- سربرگ همان جنس داخل بلوک‌ها (`faq.tsx:9`، `contact.tsx:36`، `cta.tsx:11`): `text-3xl` ثابت (موبایل ۳۰px).
- اگر بلوک داخل صفحهٔ اصلی هم رندر می‌شود، در موبایل دو مقیاس متفاوت برای یک سطح دیده می‌شود.
  حکم با آرت‌دایرکشن: یکدست‌سازی به `text-2xl sm:text-3xl` یا تأیید آگاهانهٔ تفکیک.

### مورد ج (میکرو، اختیاری) — عدد غول‌پیکر ۴۰۴ با فونت مونو
- `app/not-found.tsx:15`: «۴۰۴» با `font-mono` رندر می‌شود؛ ارقام فارسی‌اند و استک مونو
  لاتین است پس عملاً فالبک می‌خورد. پیشنهاد سبک: تعویض `font-mono` با `font-display`
  تا با پینار یکدست شود. اولویت پایین؛ اگر آرت‌دایرکشن خواست.

## ۴) معیار پذیرش برای qa (پس از اعمال قلم‌های ۱ تا ۳)
۱. گرپ `#` هگزا در `app` و `components` همچنان ۰ مورد.
۲. دکمهٔ destructive (اگر جایی رندر شده) متنش سفیدِ توکنی بماند، نه خاکستری.
۳. باز/بسته شدن منوی موبایل: اسکریم تیره و سایهٔ پنل مثل قبل دیده شود.
۴. بیلد سبز.
