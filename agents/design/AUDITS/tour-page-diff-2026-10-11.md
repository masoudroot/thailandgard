# دیف اجرایی ممیزی صفحهٔ تور | ۱۹ مهر ۱۴۰۵

منبع: `agents/design/AUDITS/tour-page-2026-10-10.md`
فایل هدف: `site/app/tours/[slug]/page.tsx`
وضعیت: ۴ یافتهٔ بدون عکس، آمادهٔ اعمال توسط dev. یافتهٔ «نداشتن تصویر» به وابستگی عکس گره خورده و کنار گذاشته شد.

## دیف ۱: ریتم پله‌ای به‌جای `mt-14` یکنواخت

مشکل: ۴ سکشن پشت سر هم با فاصلهٔ یکسان ۵۶ پیکسل؛ چشم نقطهٔ تنفسی ندارد.

قدیم (خط‌های ۱۰۰، ۱۱۲، ۱۲۰، ۱۳۳):
```tsx
<section className="mt-14">            {/* چرا این تور؟ */}
<section className="mt-14 space-y-5">  {/* توضیحات */}
<section className="mt-14">            {/* برنامهٔ روزبه‌روز */}
<div className="mt-14 grid gap-6 md:grid-cols-2">  {/* کارت‌های شامل/نمی‌شود */}
```

جدید:
```tsx
<section className="mt-10">            {/* چرا این تور؟ */}
<section className="mt-12 space-y-5">  {/* توضیحات */}
<section className="mt-10">            {/* برنامهٔ روزبه‌روز */}
<div className="mt-12 grid gap-6 md:grid-cols-2">  {/* کارت‌های شامل/نمی‌شود */}
```

نکته: فاصلهٔ پیش از فرم تماس (خط ۱۷۶) هم از پیش‌فرض به `mt-16` می‌رسد تا منطقهٔ تصمیم نفس بگیرد، چون بلاک FAQ فاصلهٔ خودش را دارد:
```tsx
<div className="mx-auto mt-16 max-w-5xl px-6 pb-16">
```

## دیف ۲: شکست دیوار متن در «توضیحات»

مشکل: اگر `tour.description` بیش از ۳ پاراگراف شود، دیوار متن می‌سازد (الان داده‌ها ۲ پاراگراف‌اند، پس این دیف پیشگیرانه است).

قدیم (خط‌های ۱۱۲ تا ۱۱۸):
```tsx
<section className="mt-12 space-y-5">
  {tour.description.map((p, i) => (
    <p key={i} className="leading-9 text-foreground/90">
      {p}
    </p>
  ))}
</section>
```

جدید:
```tsx
<section className="mt-12 space-y-5">
  {tour.description.slice(0, 3).map((p, i) => (
    <p key={i} className="leading-9 text-foreground/90">
      {p}
    </p>
  ))}
  {tour.description.length > 3 && (
    <Alert variant="info" title="نکتهٔ کارشناس">
      {tour.description.slice(3).map((p, i) => (
        <p key={i} className="leading-9 text-foreground/80">
          {p}
        </p>
      ))}
    </Alert>
  )}
</section>
```

نکته: از همان الگوی `Alert` رجیستری استفاده شد؛ `title` پراپ پشتیبانی‌شدهٔ کامپوننت است.

## دیف ۳: سبک‌سازی Alert قیمت

مشکل: Alert «شروع قیمت تقریبی» با هدر که قیمت را می‌گوید هم‌وزن است؛ هدر باید صاحب قیمت بماند.

قدیم (خط ۹۵):
```tsx
<Alert variant="info" className="mt-8">
```

جدید:
```tsx
<Alert variant="info" className="mt-6 border-0 bg-transparent px-0 [&>svg]:text-muted-foreground">
```

نکته: وزن کارتی Alert برداشته می‌شود ولی آیکون و خوانایی می‌ماند؛ متن همان است، دست نخورده.

## دیف ۴: نوار تماس چسبان موبایل

مشکل: در موبایل کاربر باید کل صفحه را اسکرول کند تا به تماس برسد؛ صفحه‌ای که تصمیمش تلفنی است CTA چسبان ندارد.

این الگوی تازه است (در صفحهٔ تماس فقط `compact` اعمال شده بود، نه چسبان)؛ با توکن‌های تم و کامپوننت `Button` رجیستری ساخته می‌شود.

جدید، پیش از تگ پایانی `</>`:
```tsx
<div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
  <div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-3">
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm font-semibold">
        شروع قیمت از {formatToman(tour.priceFrom)}
      </p>
      <p className="text-xs text-muted-foreground">
        {CONTACT_NAME} | {CONTACT_TITLE}
      </p>
    </div>
    <Button asChild size="lg" variant="brand">
      <a href={PHONE_MOBILE_LINK}>
        <Phone />
        تماس
      </a>
    </Button>
  </div>
</div>
```

واردات تازه در بالای فایل:
```tsx
import { Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CONTACT_NAME, CONTACT_TITLE, PHONE_MOBILE_LINK } from "@/lib/site";
```

جبران فضای زیر نوار (خط ۱۷۶):
```tsx
<div className="mx-auto mt-16 max-w-5xl px-6 pb-28 md:pb-16">
```
تا در موبایل محتوای انتهایی زیر نوار چسبان پنهان نماند.

## مشخصات پچ `tabular-nums` (تأییدشده توسط vibefarsi)

مبنا: آیتم `price` رجیستری وایب‌فارسی (`components/ui/price.tsx`) که عدد قیمت را با `font-bold tabular-nums` رندر می‌کند. رجیستری محلی از ۱۰ مهر ۱۴۰۵ بدون تغییر است؛ این قاعده پابرجاست.

فایل: `site/components/site/TourCard.tsx`، خط ۳۲.

قدیم:
```tsx
<p className="text-lg font-bold">{formatToman(tour.priceFrom)}</p>
```

جدید:
```tsx
<p className="text-lg font-bold tabular-nums">{formatToman(tour.priceFrom)}</p>
```

## بررسی انطباق رجیستری (vibefarsi، روی همین دیف)

- دیف ۱: مقادیر `mt-10` و `mt-12` خلاف رجیستری نیست؛ رجیستری برای ریتم سکشن قاعدهٔ عددی ندارد و تم graphite-soft فاصلهٔ پله‌ای را می‌پذیرد.
- دیف ۲: `Alert` با `title` همان کامپوننت رجیستری است؛ کاربرد «نکتهٔ کارشناس» انطباق دارد.
- دیف ۳: اورراید کلاس روی `Alert` فقط وزن بصری را کم می‌کند؛ توکن رنگی تازه‌ای معرفی نشده.
- دیف ۴: آیتم مستقیمی برای «نوار چسبان موبایل» در رجیستری نیست؛ نزدیک‌ترین‌ها `navbar` (هدر چسبان) و `button` (واریانت brand)‌اند. ترکیب پیشنهادی فقط از توکن‌های تم و کلاس‌های منطقی (`inset-x-0`، بدون `left`/`right`) ساخته شده و با قانون راست‌چین سازگار است. `pb-[env(safe-area-inset-bottom)]` مقدار کاربردی است، نه سلیقهٔ بصری.
- هیچ‌کدام از دیف‌ها U+2014، ارقام لاتین در متن نمایشی، یا پیشوند `ml-`/`pl-` ندارند.

## چشم دوم فارسی‌یوآی (farsiui، روی همین دیف)

- راست‌چین نوار چسبان: با `flex` در RTL، بلوک قیمت/نام سمت راست و دکمه سمت چپ می‌نشیند؛ مطابق قانون «محتوای مهم در جایگاه شروع». ایرادی نیست.
- `truncate` روی قیمت فارسی: برش متن راست‌چین درست کار می‌کند؛ ولی چون قیمت کوتاه است عملاً برشی رخ نمی‌دهد.
- حاشیهٔ امن آیفون: `env(safe-area-inset-bottom)` لحاظ شده؛ در دسکتاپ (`md:hidden`) نوار اصلاً رندر نمی‌شود.
- کپی دکمه: «تماس» با لحن دکمه‌های `CallButtons` («تماس با …») هم‌خوان است؛ کوتاه‌تر برای فضای باریک موبایل درست است.
- یافتهٔ تازه‌ای برای وام‌گرفتن از کتابخانهٔ فارسی‌یوآی (نسخهٔ ۰٫۱٫۲۱، ۱۰ مهر) برای این صفحه نیست؛ کامیت‌های تازهٔ آن ریپو فقط بازسازی زیرساخت و انتشار مهارت‌هاست، نه کامپوننت تازه.
