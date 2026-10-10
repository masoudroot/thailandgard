# دیف اجرایی بریف آرت‌دایرکشن: کارت تور با زبان «لوکس خاموش»

منبع بریف: `agents/artdir/CONCEPTS/tour-card-quiet-luxury-2026-10-11-01.md`
فایل هدف: `site/components/site/TourCard.tsx` (تنها فایل؛ هیچ فیلد دادهٔ تازه‌ای اضافه نمی‌شود)
وضعیت: ۴ دیف، آمادهٔ اعمال خط‌به‌خط توسط dev در همین اجرا. خود تیم طراحی کد سایتی را دست نزده.

نزدیک‌ترین آیتم‌های رجیستری (از آینهٔ محلی `~/workspace/skills/vibefarsi/registry/r/`):
`card` (ui) → بدنه؛ `badge` (ui) → بج مقصد با variant ‏brand؛ `button` (ui) → دکمهٔ تمام‌عرض variant ‏secondary؛ `price` (ui، در سایت نصب است: `site/components/ui/price.tsx`) → ردیف قیمت به‌جای `formatToman` دستی؛ `separator` (ui، در سایت نصب است: `site/components/ui/separator.tsx`) → خط مویی.

## دیف ۱: ایمپورت‌ها (خط‌های ۱ تا ۷)

مشکل: قیمت با `formatToman` دستی رندر می‌شود و با بقیهٔ سایت یکدست نیست؛ `Separator` و `Price` ایمپورت نشده‌اند.

قدیم:
```tsx
import { ArrowLeft, CalendarDays, MapPin } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fa, formatToman } from "@/lib/utils";
import type { Tour } from "@/lib/tours";
```

جدید:
```tsx
import { ArrowLeft, CalendarDays, MapPin } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Price } from "@/components/ui/price";
import { Separator } from "@/components/ui/separator";
import { fa } from "@/lib/utils";
import type { Tour } from "@/lib/tours";
```

نکته: `fa` می‌ماند (خط ۱۸، «N روزه»)؛ `formatToman` فقط در خط ۳۲ استفاده شده و حذفش بی‌خطر است؛ `MapPin` و `CalendarDays` و `ArrowLeft` و `Link` همچنان لازم‌اند.

## دیف ۲: هاور ظریف کارت (خط ۱۲)

مشکل: کارت هیچ بازخورد هاوری ندارد؛ بریف «لوکس خاموش» جابه‌جایی ظریف بدون سایه می‌خواهد.

قدیم:
```tsx
<Card className="flex h-full flex-col overflow-hidden">
```

جدید:
```tsx
<Card className="flex h-full flex-col overflow-hidden transition-transform duration-(--motion) ease-motion hover:-translate-y-0.5">
```

نکته: `duration-(--motion)` دقیقاً همان توکن تم graphite است (‏`--motion: 200ms` در `~/workspace/skills/vibefarsi/themes/graphite.css`)؛ سقف ۲۰۰ میلی‌ثانیهٔ بریف با توکن تم، نه عدد دستی. سایهٔ هاور اضافه نمی‌شود (پایهٔ `shadow-surface` رجیستری کارت سر جایش می‌ماند). الگوی «فشردن scale» (`--press`) و حلقهٔ `focus-visible` از قبل در خود `Button` تعبیه‌اند و نیازی به تغییر ندارند.

## دیف ۳: انتقال خط مسیر به زیر خلاصه (خط‌های ۲۱ تا ۲۸)

مشکل: مسیر (`route`) در بدنهٔ پایینی کارت، ردیف خرید را از بخش سفر جدا می‌کند و ریتم عمودی را می‌شکند؛ باید «متای سفر» باشد، چسبیده به خلاصه.

قدیم:
```tsx
<CardTitle className="mt-3 text-xl leading-8">{tour.title}</CardTitle>
<CardDescription className="leading-7">{tour.summary}</CardDescription>
</CardHeader>
<CardContent className="mt-auto space-y-4 pt-2">
  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
    <MapPin className="size-3.5" />
    {tour.route}
  </p>
```

جدید:
```tsx
<CardTitle className="mt-3 text-xl leading-8">{tour.title}</CardTitle>
<CardDescription className="leading-7">{tour.summary}</CardDescription>
<p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
  <MapPin className="size-3.5" />
  {tour.route}
</p>
</CardHeader>
<CardContent className="mt-auto space-y-4 pt-2">
```

نکته: استایل خط مسیر دست نخورده (xs، muted، آیکون MapPin)؛ فقط جایش عوض شد. `mt-2` چون `CardHeader` فلکس‌ستونی با `gap-1` است، خط را به خلاصه می‌چسباند.

## دیف ۴: خط مویی + ردیف قیمت یک‌خطی + دکمهٔ تمام‌عرض (خط‌های ۲۹ تا ۴۰)

مشکل: (۱) قیمت انباشتهٔ عمودی است و لنگر بصری کارت نیست؛ (۲) جداکننده با `border-t` دستی ساخته شده نه کامپوننت `Separator`؛ (۳) ردیف پایین در موبایل باریک فشرده می‌شود؛ (۴) `<Button>` داخل `<Link>` تودرتوست (HTML نامعتبر).

قدیم:
```tsx
<div className="flex items-center justify-between gap-3 border-t border-border pt-4">
  <div>
    <p className="text-xs text-muted-foreground">شروع قیمت از</p>
    <p className="text-lg font-bold tabular-nums">{formatToman(tour.priceFrom)}</p>
  </div>
  <Link href={`/tours/${tour.slug}`}>
    <Button variant="secondary">
      مشاهدهٔ جزئیات
      <ArrowLeft />
    </Button>
  </Link>
</div>
```

جدید:
```tsx
<Separator />
<div className="flex items-baseline justify-between gap-3">
  <span className="text-xs text-muted-foreground">شروع قیمت از</span>
  <Price amount={tour.priceFrom} size="md" />
</div>
<Button asChild variant="secondary" className="w-full">
  <Link href={`/tours/${tour.slug}`}>
    مشاهدهٔ جزئیات
    <ArrowLeft />
  </Link>
</Button>
```

نکته‌ها:
- قیمت حالا لنگر کارت است: لیبل «شروع قیمت از» سمت راست (xs، muted) و عدد سمت چپ با کامپوننت `Price` (عدد `text-2xl` بولد + «تومان» کوچک muted؛ ارقام فارسی و جداکنندهٔ «٬» از `faNumber` می‌آید). قانون راست‌چین: توضیح راست، عدد چپ.
- `items-baseline` به‌جای `items-center`: خط مبنای لیبل کوچک با خط مبنای عدد بزرگ تراز می‌شود.
- `Separator` رجیستری (`role="none"`، خط مویی از توکن `border`) جای `border-t` دستی را می‌گیرد؛ صرفاً بصری است و اسکرین‌ریدر را اذیت نمی‌کند.
- دکمه با `asChild` رندر می‌شود: کلاس‌های باتن روی همان `<Link>` می‌نشیند، پس هم تمام‌عرض (`w-full`) است، هم حلقهٔ `focus-visible` کیبورد حفظ می‌شود، هم تودرتویی نامعتبر `<button>` داخل `<a>` از بین می‌رود. آیکون `ArrowLeft` می‌ماند.
- `CardContent` همچنان `mt-auto` دارد: چون ارتفاع خلاصه‌ها فرق می‌کند، بلاک پایینی (خط مویی + قیمت + دکمه) در همهٔ کارت‌ها ته‌نشین و هم‌تراز می‌ماند؛ ردیف قیمت در همهٔ کارت‌ها یک خطی است.

## خودنقدی پیش از اجرا (طبق پلی‌بوک)

۱. نقد فارسی‌نویسی: متن‌های «شروع قیمت از» و «مشاهدهٔ جزئیات» تمیزند؛ هیچ خط تیرهٔ بلندی نیست؛ ارقام از مسیر `faNumber`/`fa` می‌آیند (فارسی)؛ «تومان» بعد از عدد. تمیز.
۲. نقد بصری و راست‌چین: کهربایی فقط در بج `brand` (فیل کوچک + متن brand-foreground)؛ عدد قیمت به رنگ جوهر؛ ترتیب راست‌به‌چپ (لیبل راست، عدد چپ) رعایت شده؛ `Separator` از توکن تم. تمیز.
۳. نقد حرکت: هاور فقط ۲ پیکسل بالا‌رفت با ۲۰۰ میلی‌ثانیهٔ توکن تم؛ بدون سایهٔ اضافه؛ فشردن دکمه از الگوی `active:[transform:var(--press)]` خود باتن می‌آید؛ فوکوس کیبورد سالم. تمیز.

## معیار پذیرش بریف

- اجرا در همان یک فایل ✓ (۴ دیف بالا)
- هیچ فیلد دادهٔ تازه‌ای ✓
- ارقام فارسی ✓
- حرکت حداکثر ۲۰۰ میلی‌ثانیه ✓ (توکن `--motion`)
- کهربایی فقط در فیل کوچک ✓
- ممیزی vibefarsi و farsiui: با تیم‌هایشان است (در زنجیره بعد از طراحی)
