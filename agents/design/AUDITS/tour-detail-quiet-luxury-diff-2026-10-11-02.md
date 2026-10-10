# دیف اجرایی «لوکس خاموش» برای صفحهٔ جزئیات تور | ۱۹ مهر ۱۴۰۵ (ساعت ۰۲)

منبع: `agents/artdir/CONCEPTS/tour-detail-quiet-luxury-2026-10-11-02.md`
فایل هدف: `site/app/tours/[slug]/page.tsx` (فقط همین یک فایل؛ هیچ فیلد دادهٔ تازه‌ای)
رجیستری‌ها: `breadcrumb`، `badge`، `price`، `alert`، `card`، `button`، `separator` — هر هفت مورد از روی کد واقعی `site/components/ui/` تأیید شد.
نکتهٔ خطوط: شماره‌ها از روی کد فعلی فایل است (در بریف آرت‌دایرکشن هم همین شماره‌ها بود).

---

## دیف ۱: ایمپورت‌ها (خط‌های ۹ و ۱۳ تا ۱۷)

قدیم:
```tsx
import { fa, formatToman } from "@/lib/utils";
```
جدید:
```tsx
import { fa } from "@/lib/utils";
```
(`fa` در ده‌جای دیگر فایل استفاده می‌شود و می‌ماند؛ `formatToman` دیگر هیچ استفاده‌ای در صفحه ندارد.)

قدیم:
```tsx
import { Accordion } from "@/components/ui/accordion";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
```
جدید:
```tsx
import { Accordion } from "@/components/ui/accordion";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Price } from "@/components/ui/price";
import { Separator } from "@/components/ui/separator";
```

---

## دیف ۲: هدر تازه (خط‌های ۹۲ تا ۱۱۲)

قدیم (خط‌های ۹۲ تا ۱۱۲):
```tsx
      <div className="mx-auto max-w-5xl px-6 py-12">
        <header className="space-y-4">
          <Badge variant="brand">{tour.shortTitle}</Badge>
          <h1 className="text-3xl font-bold md:text-4xl">{tour.title}</h1>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <span>
              {fa(tour.days)} روزه | {fa(tour.nights)} شب
            </span>
            <span>{tour.route}</span>
          </div>
          <p className="text-lg">
            شروع قیمت از <strong>{formatToman(tour.priceFrom)}</strong>
          </p>
        </header>

        <p className="mt-8 text-lg leading-9">{tour.summary}</p>

        <Alert variant="info" className="mt-6 border-0 bg-transparent px-0 [&>svg]:text-muted-foreground">
          قیمت‌ها «شروع قیمت» و تقریبی‌اند و با توجه به تاریخ سفر و ظرفیت هتل کمی تغییر می‌کنند.
          قیمت دقیق را کارشناس فروش موقع تماس می‌گوید.
        </Alert>
```

جدید:
```tsx
      <div className="mx-auto max-w-5xl px-6 py-12">
        <Breadcrumb
          className="mb-6"
          items={[
            { label: "خانه", href: "/" },
            { label: "تورها", href: "/tours" },
            { label: tour.shortTitle },
          ]}
        />
        <header className="space-y-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Badge variant="brand">{tour.shortTitle}</Badge>
            <span className="text-sm text-muted-foreground">
              {fa(tour.days)} روزه | {fa(tour.nights)} شب · {tour.route}
            </span>
          </div>
          <h1 className="text-3xl font-bold md:text-4xl">{tour.title}</h1>
          <p className="text-lg leading-9">{tour.summary}</p>
        </header>

        <Separator className="my-6" />

        <div className="flex items-baseline justify-between gap-4">
          <p className="text-sm text-muted-foreground">شروع قیمت از</p>
          <Price amount={tour.priceFrom} size="lg" />
        </div>

        <Alert variant="info" className="mt-4">
          قیمت‌ها «شروع قیمت» و تقریبی‌اند و با توجه به تاریخ سفر و ظرفیت هتل کمی تغییر می‌کنند.
          قیمت دقیق را کارشناس فروش موقع تماس می‌گوید.
        </Alert>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg" variant="brand">
            <a href={PHONE_MOBILE_LINK}>
              <Phone />
              تماس با کارشناس
            </a>
          </Button>
          <Button asChild size="lg" variant="outline">
            <a href="#callback">درخواست تماس</a>
          </Button>
        </div>

        <Separator className="my-8" />
```

توضیح تغییرات:
- `Breadcrumb` رجیستری بالای هدر؛ جداکننده‌ها در خود کامپوننت چپ‌رو و RTL-صحیح‌اند.
- خط متا (روزه/شب + مسیر) به خط اول هدر آمد، کنار بج `brand`؛ مثل زبان کارت.
- خلاصه از خط ۱۰۷ به زیر عنوان منتقل شد؛ ترتیب روایت: عنوان ← خلاصه ← قیمت ← تماس.
- قیمت با `Price size="lg"`؛ ردیف یک‌خطی `justify-between` (لیبل راست، عدد چپ، بدون wrap)؛ ارقام فارسی و جداکنندهٔ «٬» از خود کامپوننت می‌آید.
- `Alert` با هویت واقعی (کلاس‌های `border-0 bg-transparent px-0` حذف شدند)؛ آیکون ⓘ از خود کامپوننت می‌آید.
- ردیف CTA بالای تا: «تماس با کارشناس» (primary/brand، همان `PHONE_MOBILE_LINK`) + «درخواست تماس» (outline، لنگر `#callback`)؛ در موبایل روی هم می‌نشینند.
- دو `Separator` رجیستری دور بلوک قیمت؛ خط مویی از توکن `border` تم.

---

## دیف ۳: راهنماهای مرتبط با `Card` واقعی (خط‌های ۱۹۷ تا ۲۱۵)

قدیم (خط ۱۹۹):
```tsx
          <div className="rounded-surface border border-border bg-card p-6">
```
جدید:
```tsx
          <Card>
```
و بستن همان بلوک: قدیم `</div>` انتهاییِ همین بلوک، جدید `</Card>`.

ساختار کامل جدید:
```tsx
      {relatedGuides.length > 0 && guideBlock && (
        <section className="mx-auto mt-10 max-w-5xl px-6">
          <Card>
            <CardContent className="pt-6">
              <p className="leading-8 text-foreground/90">
                {guideBlock.lead}{" "}
                {relatedGuides.map((g, i) => (
                  <span key={g.slug}>
                    {i > 0 && " و "}
                    <Link
                      href={`/guide/${g.slug}`}
                      className="font-semibold underline underline-offset-4"
                    >
                      {g.title}
                    </Link>
                  </span>
                ))}{" "}
                {guideBlock.trail}
              </p>
            </CardContent>
          </Card>
        </section>
      )}
```
(متن و لینک‌ها بدون تغییر؛ فقط پوسته از div دستی به `Card` رجیستری رفت. `CardContent` بدون `CardHeader` مجاز است و `pt-6` جای خالی هدر را پر می‌کند.)

---

## دیف ۴: نوار چسبان موبایل با `Price` (خط‌های ۲۴۲ تا ۲۵۱)

قدیم:
```tsx
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">
              شروع قیمت از {formatToman(tour.priceFrom)}
            </p>
            <p className="text-xs text-muted-foreground">
              {CONTACT_NAME}؛ {CONTACT_TITLE}
            </p>
          </div>
```
جدید:
```tsx
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">شروع قیمت از</p>
            <Price amount={tour.priceFrom} size="sm" />
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {CONTACT_NAME}؛ {CONTACT_TITLE}
            </p>
          </div>
```
(دکمهٔ «تماس» نوار بدون تغییر می‌ماند. `truncate` روی خط کارشناس نگه داشته شد تا در موبایل نشکند.)

---

## دیف ۵: لنگر فرم «درخواست تماس» (خط ۲۲۶)

قدیم:
```tsx
      <div className="mx-auto mt-16 max-w-5xl px-6 pb-28 md:pb-16">
```
جدید:
```tsx
      <div id="callback" className="mx-auto mt-16 max-w-5xl scroll-mt-24 px-6 pb-28 md:pb-16">
```
(مقصد لنگر دکمهٔ «درخواست تماس»؛ `scroll-mt-24` تا زیر نوارها گم نشود.)

---

## چک‌لیست معیار پذیرش بریف

- [ ] هیچ `formatToman` دستی در صفحه نمانده (دیف ۱، ۲، ۴)
- [ ] `Alert` بدون اورراید استایل (دیف ۲)
- [ ] ارقام فارسی و جداکنندهٔ «٬» از کامپوننت `Price` (دیف ۲، ۴)
- [ ] هیچ فیلد دادهٔ تازه‌ای؛ همه از تایپ موجود `Tour` (بج، متا، قیمت، خلاصه)
- [ ] هیچ عدد جعلی (امتیاز، ظرفیت، نظر) ساخته نشده
- [ ] حرکت: هیچ انیمیشن تازه‌ای؛ فقط کامپوننت‌های موجود
- [ ] بقیهٔ سکشن‌ها (چرا این تور، توضیحات، برنامهٔ روزبهروز، شامل/نمی‌شود، FAQ، فرم‌ها) بدون تغییر
