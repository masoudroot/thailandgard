# پیشنهاد جایگزین رجیستری برای کد من‌درآوردی | ساعت ۰۲ | ۱۹ مهر ۱۴۰۵

**دامنهٔ جست‌وجو:** `site/` (کامپوننت‌ها، بلوک‌ها، صفحه‌ها)؛ ممیزی‌های قبلی `agents/vibefarsi/AUDITS/` بررسی شد تا تکراری نباشد.
**پوشش‌های قبلی که کنار گذاشته شدند:** قیمت دستی `formatToman` در `TourCard.tsx` (ممیزی ساعت ۰۱) و در `app/tours/[slug]/page.tsx` (دیف «لوکس خاموش» ساعت ۰۲ در صف dev) — این پرونده پیشنهاد تازه نمی‌خواهد.

---

## مهم‌ترین مورد: باکس اطلاعات تماس دست‌ساز در `CallButtons.tsx`

**فایل:** `site/components/site/CallButtons.tsx` — خط‌های ۳۰ تا ۳۱ (نسخهٔ dev فعلی)
**کجا دیده می‌شود:** حالت غیرفشرده (`compact=false`) فقط در صفحهٔ جزئیات تور (`app/tours/[slug]/page.tsx` خط ۲۳۶) رندر می‌شود؛ یعنی روی سطح فروش اصلی سایت. چهار جای دیگر سایت (`app/page.tsx`، `app/tours/page.tsx`، `app/contact/page.tsx`، `app/guide/[slug]/page.tsx`) حالت فشرده را می‌گیرند و این باکس را ندارند.

**کد فعلی (خط ۳۱):**
```tsx
<div className="sm:col-span-2 rounded-surface border border-border bg-card p-4">
```

**ایراد:** این div کارت‌نما، بدنهٔ کارت است ولی کامپوننت `Card` رجیستری نیست. ظاهرش «شبیه کارت» است اما توکن‌های کامل را ندارد:
- `shadow-surface` (سایهٔ نرم تم graphite-soft) را ندارد؛
- `text-card-foreground` را ندارد (متن داخل باکس رنگ پیش‌فرض بدنه را می‌گیرد نه رنگ متن کارت)؛
- افکت شیشه‌ای و `border-line` کامپوننت `Card` را ندارد — یعنی همین باکس با کارت راهنماهای مرتبطِ همان صفحه (دیف ساعت ۰۲ آن‌ها را به `Card` واقعی برد) دو زبان متفاوت حرف می‌زنند.

**نزدیک‌ترین آیتم رجیستری:** `card` (`registry/r/components/card.json`)؛ کپی محلی: `site/components/ui/card.tsx`.

**جایگزین دقیق (آمادهٔ کپی برای dev):**

ایمپورت، خط ۲:
```tsx
import { Button } from "@/components/ui/button";
```
می‌شود:
```tsx
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
```

خط ۳۰ تا ۳۱:
```tsx
      {!compact && (
        <div className="sm:col-span-2 rounded-surface border border-border bg-card p-4">
```
می‌شود:
```tsx
      {!compact && (
        <Card className="sm:col-span-2">
          <CardContent className="p-4">
```
و بستن همان بلوک: دو تگ `</div>` انتهاییِ این بلوک می‌شود `</CardContent>` و `</Card>` (ترتیب بسته‌شدن حفظ شود). محتوای داخلی (خط‌های ۳۲ تا ۴۹) بدون هیچ تغییری می‌ماند.

**چرا `CardContent` با `p-4`:** باکس فشرده است و `p-5` پیش‌فرض `CardContent` برایش زیاد است؛ `p-4` (۱۶ پیکسل) روی شبکهٔ ۴ پیکسلی است و `tailwind-merge` آن را با `p-5 pt-0` پیش‌فرض درست ادغام می‌کند (نتیجه فقط `p-4`).

**اثر جانبی:** هیچ. چیدمان داخلی، لینک‌ها، `dir="ltr"` روی شماره‌ها و متن‌ها همه سر جایشان می‌مانند؛ فقط پوسته به زبان کارت‌های دیگر صفحه برمی‌گردد.

---

## نمونه‌های مشابه (همان الگو، پیشنهاد اعمال یکسان)

- `site/app/guide/[slug]/page.tsx` خط ۱۰۹: `<section className="mt-10 rounded-surface border border-border bg-card p-6">`
- `site/app/guide/[slug]/page.tsx` خط ۱۳۷: `<section className="mt-4 rounded-surface border border-border bg-card p-6 sm:p-8">`

هر دو کارت محتوای راهنما هستند و همان جایگزینی (`Card` + `CardContent`) را می‌خواهند. این‌ها `section` معنایی‌اند؛ اگر dev بخواهد تگ معنایی بماند، کامپوننت `Card` propهای `div` را پاس می‌دهد ولی `section` را پشتیبانی نمی‌کند — پس یا به `div` تغییر کنند یا در همین شکل دست‌ساز با ثبت در `DEVIATIONS.md` بمانند. تصمیمش با dev و ثبتش با ماست.

## خارج از دامنهٔ این پیشنهاد

- `site/components/blocks/blog-grid.tsx` خط ۲۶ و `site/components/blocks/stats.tsx` خط ۹: هر دو دست‌سازند (`rounded-2xl` و شبکهٔ آمار دستی) ولی معادل مستقیم تک‌آیتمی در رجیستری ندارند که «نزدیک‌ترین» حساب شود؛ بررسی‌شان کار ساعت‌های ممیزی بلوک است، نه این پیشنهاد.
