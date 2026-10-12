# طرح کارت ویترین «تور ترکیبی تازه» | ۲۰ مهر ۱۴۰۵ | اجرای ۰۶:۰۵

مبنا: پلن ساعتی تیم طراحی (ساعت ۰۶: طراحی کارت/بنر تور تازه). این سند فقط طرح است؛ اجرای کد با dev و هیچ فایل `site/` در این اجرا دست نخورده.

> اصلاح ۰۶:۳۵ (یافتهٔ ۱ تیم فارسی‌یوآی): پنل مسیر در DOM هم اول گذاشته شد تا «ترتیب DOM = ترتیب خوانش» برقرار باشد؛ کلاس‌های `order-1`/`order-2` موبایل حذف شدند و فقط `md:order` دسکتاپ ماند. پنل هیچ عنصر فوکوس‌پذیر ندارد، پس ترتیب تب روی دسکتاپ سالم می‌ماند.

## ۱. هدف و جای قرارگیری

کارت ویترین تک‌ایستا برای **تور ترکیبی بانکوک و پوکت** که ۱۴۰۵/۰۷/۱۹ به سبد اضافه شد. نقشش با `TourCard.tsx` فرق دارد: تورکارد عضو گرید فهرست است، این کارت «ویترین» بالای همان گرید (`/tours`) یا سکشن ویژهٔ خانه است؛ برای همین دو CTA دارد (تماس + جزئیات) در حالی که تورکارد یک CTA دارد. با `TourBanner.tsx` (درفت ۰۶ دیروز) هم فرق دارد: بنر پوستر تایپوگرافیک بدون قیمت است، این کارت ویترین فروش است با ردیف قیمت کامل.

بلوکر داده: قیمت و تأمین‌کنندهٔ این تور هنوز دست مسعود است (قانون تازگی قیمت). پس کارت از پراپ می‌خواند و تا قیمت واقعی نیامده mount نمی‌شود؛ هیچ عدد ساخته‌ای در سند نیست.

نزدیک‌ترین آیتم‌های رجیستری: components/**card** (ساختار) + components/**badge** + components/**price** + components/**button** + components/**separator**. آیتم مستقلی برای «کارت تور ترکیبی» در رجیستری نیست؛ پس نزدیک‌ترینِ واقعی همان ترکیب آیتم‌هاست، نه استایل من‌درآوردی.

## ۲. ساختار کامپوننت (کپی‌دقیق)

فایل پیشنهادی: `site/components/site/ComboTourCard.tsx` با پراپ `{ tour: Tour }` از `@/lib/tours`. همهٔ داده‌ها از پراپ؛ هیچ رشتهٔ داده‌ای هاردکد نیست.

```tsx
import { ArrowLeft, CalendarDays, MapPin, Phone } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Price } from "@/components/ui/price";
import { Separator } from "@/components/ui/separator";
import { fa } from "@/lib/utils";
import { PHONE_MOBILE_LINK } from "@/lib/site";
import type { Tour } from "@/lib/tours";

/**
 * کارت ویترین «تور ترکیبی تازه»؛ بالای گرید /tours یا سکشن ویژهٔ خانه.
 * نزدیک‌ترین رجیستری: components/card + badge + price + button + separator.
 * mount فقط بعد از رسیدن قیمت واقعی (priceFrom > 0)؛ تا آن موقع رندر نمی‌شود.
 */
export function ComboTourCard({ tour }: { tour: Tour }) {
  if (!tour.active || tour.priceFrom <= 0) return null;
  const titleId = `combo-tour-card-${tour.slug}`;
  return (
    <Card
      aria-labelledby={titleId}
      className="combo-tour-card grid gap-6 p-6 transition-transform duration-(--motion) ease-motion hover:-translate-y-0.5 sm:p-8 md:grid-cols-[1fr_16rem]"
    >
      {/* پنل مسیر: در DOM هم اول است؛ موبایل بالا (ابتدای خوانش)، دسکتاپ ستون چپ (پایان خوانش) */}
      <div className="flex flex-col justify-center border-b border-border pb-6 md:order-2 md:border-b-0 md:border-s md:pb-0 md:ps-6">
        <span aria-hidden className="block h-px w-12 bg-border" />
        <p className="mt-4 font-display text-4xl font-bold leading-snug sm:text-5xl">
          {tour.shortTitle}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">دو شهر، یک سفر</p>
        <span aria-hidden className="mt-4 block size-2.5 shrink-0 rounded-full bg-brand" />
      </div>

      {/* ستون متن: موبایل بعد از پنل، دسکتاپ راست (ابتدای خواندن) */}
      <div className="flex flex-col gap-5 md:order-1">
        <div className="space-y-3">
          <Badge variant="secondary">ترکیبی تازه</Badge>
          <h2 id={titleId} className="font-display text-2xl font-bold leading-snug sm:text-3xl">
            {tour.title}
          </h2>
          <p className="max-w-2xl text-base leading-8">{tour.summary}</p>
        </div>

        <dl className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <CalendarDays aria-hidden className="size-4 shrink-0" />
            <dt>مدت:</dt>
            <dd>
              {fa(tour.days)} روز و {fa(tour.nights)} شب
            </dd>
          </div>
          <div className="flex items-start gap-2">
            <MapPin aria-hidden className="mt-0.5 size-4 shrink-0" />
            <dt>مسیر:</dt>
            <dd>{tour.route}</dd>
          </div>
        </dl>

        <CardContent className="space-y-4 p-0">
          <Separator />
          <div className="flex flex-nowrap items-baseline justify-between gap-3">
            <span className="text-xs text-muted-foreground">شروع قیمت از</span>
            <Price amount={tour.priceFrom} size="lg" />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild variant="brand" size="lg">
              <a href={PHONE_MOBILE_LINK}>
                <Phone aria-hidden />
                تماس با کارشناس
              </a>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link href={`/tours/${tour.slug}`}>
                مشاهدهٔ جزئیات تور
                <ArrowLeft aria-hidden />
              </Link>
            </Button>
          </div>
        </CardContent>
      </div>

    </Card>
  );
}
```

## ۳. کلاس‌ها و توکن‌های دقیق

| المان | کلاس/توکن | توضیح |
|---|---|---|
| بدنه | `Card` سایت (`rounded-surface` = ۲۲px، `border-border` خط مویی، `bg-card`) | صفر کلاس دستی برای کادر |
| چیدمان | `grid gap-6 md:grid-cols-[1fr_16rem]`؛ پنل در DOM اول (صفر order موبایل)؛ ستون متن `md:order-1`؛ پنل `md:order-2` | موبایل: پنل بالا؛ دسکتاپ: پنل چپ (پایان خواندن)؛ ترتیب DOM = ترتیب خوانش موبایل (اصلاح یافتهٔ ۱ farsiui، اجرای ۰۶:۳۵) |
| بج | `Badge variant="secondary"` (خنثی) | انتخاب آگاهانه: تنها کهربایی کارت فیل CTA است (قانون ۱۵)؛ بج خنثی می‌ماند |
| تیتر | `font-display text-2xl sm:text-3xl font-bold leading-snug`، تگ `h2` با `aria-labelledby` | یک پله کوچک‌تر از بنر (نقش ویترین، نه پوستر)؛ نسبت خط ۱٫۳۵ تیترها |
| خلاصه | `text-base leading-8`، رنگ متن اصلی | قانون: خلاصه متن بدنه است، نه muted |
| ردیف داده‌ها | `dl` با `text-sm text-muted-foreground`؛ آیکون `size-4 shrink-0`؛ مسیر چندخطی با `items-start` + `mt-0.5` | قانون آیکون چندخطی |
| قیمت | `Price size="lg"` + لیبل «شروع قیمت از» راست، عدد چپ | قانون عدد و لیبل در راست‌چین |
| CTA اصلی | `Button variant="brand" size="lg"` (۴۸px؛ بالای کف ۴۴px) | تنها کهربایی کارت؛ لینک `PHONE_MOBILE_LINK` |
| CTA ثانویه | `Button variant="secondary" size="lg"` به `/tours/{slug}` | آیکون `ArrowLeft` (جلو در راست‌چین) |
| پنل مسیر | نام مقصد `font-display text-4xl sm:text-5xl` + خط مویی `h-px w-12` + نقطهٔ کهربایی `size-2.5` | امضای بصری؛ زیرنویس «دو شهر، یک سفر» با `text-muted-foreground` |
| حرکت | ورود: `animations/reveal` (fade + translateY ‏۱۲px، ‏۲۰۰ms، `ease-motion`، یک‌بار)؛ هاور دسکتاپ: `hover:-translate-y-0.5` با همان ۲۰۰ms؛ فشردن از واریانت دکمه | صفر keyframes تازه؛ `prefers-reduced-motion`: ورود حذف می‌شود |

صفر هگز خام؛ صفر arbitrary؛ همه از توکن‌های graphite-soft.

## ۴. متن‌های فارسی (طبق persian-ui-copy)

رجیستر: رسمیِ انسانی با «شما».

- بج: «ترکیبی تازه»
- زیرنویس پنل: «دو شهر، یک سفر»
- لیبل‌ها: «مدت:»، «مسیر:»، «شروع قیمت از»
- مقدار مدت: «{عدد فارسی} روز و {عدد فارسی} شب»
- CTAها: «تماس با کارشناس»، «مشاهدهٔ جزئیات تور»
- تیتر و خلاصه و مسیر از دادهٔ تور (تک‌منبع)؛ ارقام همه‌جا فارسی.

## ۵. رفتار ریسپانسیو

- موبایل (`<md`): تک‌ستون؛ پنل بالا (نام + «دو شهر، یک سفر»)، سپس بج ← تیتر ← خلاصه ← داده‌ها ← قیمت ← CTAها (پیچش با `flex-wrap`).
- دسکتاپ: دو ستون؛ راست متن، چپ پنل ۱۶rem با جداکنندهٔ `border-s`.
- چک ۳۶۰px: تیتر `text-2xl` نمی‌شکند؛ CTAها `size="lg"` لمس‌پذیرند.

## ۶. جای قرارگیری

در `app/tours/page.tsx` بین هدر و گرید کارت‌ها (بالای `TourCard`ها)، داخل همان کانتینر:

```tsx
<section className="mt-10">
  <ComboTourCard tour={comboTour} />
</section>
```

یا به‌عنوان سکشن ویژه در صفحهٔ اصلی با فاصلهٔ سکشن‌های موجود.

## ۷. معیار پذیرش برای qa

۱. بدون هیچ تصویری «تمام‌شده» به نظر می‌رسد؛ حس «به‌زودی عکس می‌آید» نیست.
۲. همهٔ ارقام فارسی؛ جداکنندهٔ هزارگان «٬»؛ واحد «تومان» بعد از عدد (از کامپوننت `Price`).
۳. فقط یک کهربایی: فیل CTA تماس؛ `grep` صفر مورد `text-brand` تنها؛ بج خنثی است.
۴. راست‌چین: دسکتاپ پنل چپ، موبایل پنل بالا؛ لیبل «شروع قیمت از» راست، عدد چپ.
۵. حرکت: ورود ۲۰۰ms یک‌بار؛ `prefers-reduced-motion` ورود را حذف می‌کند؛ هاور فقط دسکتاپ.
۶. صفر هگز خام؛ گوشه‌ها فقط `rounded-surface`؛ خطوط فقط `border-border`.
۷. کپی‌ها دقیقاً: «ترکیبی تازه»، «دو شهر، یک سفر»، «تماس با کارشناس»، «مشاهدهٔ جزئیات تور».
۸. با `priceFrom <= 0` یا `active: false` رندر نمی‌شود (منتظر قیمت واقعی مسعود؛ هیچ عدد ساخته‌ای).
۹. ممیزی وایب‌فارسی و فارسی‌یوآی روی آیتم‌های `card`/`badge`/`price`/`button` سبز.
