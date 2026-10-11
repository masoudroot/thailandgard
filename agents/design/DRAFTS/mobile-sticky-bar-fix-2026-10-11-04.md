# دیف موبایل صفحهٔ تور | تیم طراحی | ساعت ۰۴ | ۱۹ مهر ۱۴۰۵

ورودی زنجیره: تصمیم توکن آرت‌دایرکشن (`agents/artdir/TOKENS/token-sticky-bar-2026-10-11-04.md`).
صفحهٔ هدف: `site/app/tours/[slug]/page.tsx` — تنها صفحه‌ای که نوار چسبان موبایل دارد.
هر سه تغییر کپی‌دقیق و آمادهٔ اعمال برای dev است.

## تغییر ۱ — ثبت توکن در `site/app/globals.css`

قدیم (انتهای بلاک `:root`، بعد از خط `--motion-ease`):
```css
  --press: scale(0.98);
  --motion: 200ms;
  --motion-ease: cubic-bezier(0.2, 0, 0, 1);
}
```

تازه:
```css
  --press: scale(0.98);
  --motion: 200ms;
  --motion-ease: cubic-bezier(0.2, 0, 0, 1);
  /* فاصلهٔ خالی زیر سکشن پایانی صفحه‌هایی که نوار چسبان موبایل دارند */
  --sticky-bar-clearance: 7.5rem;
}
```

قدیم (بلاک `@theme inline`، بخش «حرکت و فونت»):
```css
  /* حرکت و فونت */
  --ease-motion: var(--motion-ease);
```

تازه:
```css
  /* حرکت و فونت */
  --ease-motion: var(--motion-ease);
  --spacing-sticky-bar-clearance: var(--sticky-bar-clearance);
```

## تغییر ۲ — جایگزینی عدد جادویی در `site/app/tours/[slug]/page.tsx` (خط ۲۵۵)

قدیم:
```tsx
<div id="callback" className="mx-auto mt-16 max-w-5xl scroll-mt-24 px-6 pb-28 md:pb-16">
```

تازه:
```tsx
<div id="callback" className="mx-auto mt-16 max-w-5xl scroll-mt-24 px-6 pb-sticky-bar-clearance md:pb-16">
```

## تغییر ۳ — فیکس تنگی قیمت در نوار چسبانِ ۳۲۰px (`site/components/ui/price.tsx`)

یافتهٔ qa ساعت ۰۳: ردیف قیمت در نوار چسبان در دقیقاً ۳۲۰px چند پیکسل تنگ می‌آید.
علت: سطر داخلی `flex items-baseline gap-1.5` هیچ‌وقت نمی‌شکند و عدد بلند (مثل ۱۲۸٬۵۰۰٬۰۰۰)
با واحد «تومان» در یک خط قفل‌اند. راه‌حل حداقلی: اجازهٔ شکستن فقط وقتی جا نیست.

قدیم:
```tsx
<span className="flex items-baseline gap-1.5">
```

تازه:
```tsx
<span className="flex flex-wrap items-baseline gap-x-1.5">
```

اثر جانبی صفر: در جاهای عریض هیچ‌چیز عوض نمی‌شود؛ فقط در تنگیِ شدید، واحد «تومان»
به سطر بعد می‌لغزد به‌جای سرریز افقی.

## چک رجیستری
- هر سه تغییر در چارچوب توکن‌ها و کامپوننت‌های موجود است؛ استایل من‌درآوردی نیست.
- `pb-sticky-bar-clearance` از `@theme inline` می‌آید، نه کلاس دستی.
- قانون راست‌چین: هیچ خاصیت فیزیکی تازه‌ای اضافه نشد.

## معیار پذیرش (برای qa)
۱. بیلد سبز. ۲. در ۳۶۰px فرم «درخواست تماس» کاملاً بالای نوار چسبان دیده شود (نه زیرش).
۳. در ۳۲۰px هیچ سرریز افقی در نوار چسبان نباشد (قیمت بلند تست شود).
