# دیف فیکس موبایل لندینگ اکتبر | تیم طراحی | اجرای ۰۴:۰۵، ۲۰ مهر ۱۴۰۵

**هدف:** `/phuket-october` — ممیزی موبایل (بازهٔ ۳۶۰ تا ۳۹۰px) طبق ساعت ۰۴ HOURLY_PLAN.
**مبنا:** `~/workspace/skills/vibefarsi/design-rules.md` (خوانده شد، همین نوبت) + `DESIGN_SYSTEM.md` بخش ۱ + احکام artdir (حکم ۲، جهت M5) و توکن تازهٔ artdir همین اجرا (`--sticky-bar-october-clearance`).
**مرز:** نوار چسبان (هندسه، بودجهٔ ارتفاع، حکم M5) مال artdir است و دست نخورد. دیف‌های زیر فقط روی `site/app/phuket-october/page.tsx` اعمال می‌شوند؛ فازهای ۱ تا ۳ به `site/` دست نمی‌زنند — اعمال با dev در فاز ۴.

## دیف ۱ — تیتر هیرو به سطح مرجع نمایشی برسد

`DESIGN_SYSTEM.md` بخش ۱: تیتر نمایشی `text-4xl sm:text-5xl`. صفحهٔ اکتبر فقط `text-4xl` دارد.

```diff
- <h1 className="mt-5 font-display text-4xl">
+ <h1 className="mt-5 font-display text-4xl sm:text-5xl">
    پوکت؛ نیمهٔ دوم اکتبر
  </h1>
```

## دیف ۲ — فشردن دکمهٔ CTA از توکن، نه مقدار دست‌ساز

توکن `--press: scale(0.98)` در `globals.css` (خط ۵۵)؛ الگوی موجود در `TourCard`. مقدار arbitrary طبق قاعدهٔ craft ممنوع.

```diff
- <Button asChild size="lg" variant="brand" className="rounded-full px-6 active:scale-[0.98]">
+ <Button asChild size="lg" variant="brand" className="rounded-full px-6 active:[transform:var(--press)]">
```

## دیف ۳ — حذف leading تکراری زیرتیتر هیرو

`body` در `globals.css` (خطوط ۱۵۰–۱۵۱) خودش `16.5px` با `line-height: 1.8` است؛ `leading-[1.8]` همان را تکرار می‌کند. حذفش هیچ تغییر بصری ندارد و یک arbitrary را از صفحه کم می‌کند.

```diff
- <p className="mx-auto mt-5 max-w-xl leading-[1.8] text-muted-foreground">
+ <p className="mx-auto mt-5 max-w-xl text-muted-foreground">
```

## یافته برای artdir (دیف نیست؛ نیاز به حکم تازه)

دکمه‌های نوار چسبان اکتبر `h-10` هستند یعنی ۴۰px؛ کف لمسی طبق design-rules و قانون توکن‌های خودمان ۴۴px است. این تنش با حکم M5 است و لغوش مال من نیست.
اگر artdir دکمه را `h-11` (۴۴px) تأیید کند، بودجهٔ توکن اکتبر این می‌شود: ۸ + ۲۸ + ۶ + ۴۴ + ۸ + ۱ (هندسه) + ۳۴ (safe-area ناچ) + ۱۶ (تنفس) = ۱۴۵px ≈ `9.0625rem`. تصمیم نهایی با artdir؛ تا آن موقع توکن `9.75rem` همین اجرا سر جایش می‌ماند.

## نکتهٔ پیاده‌سازی برای dev

- خط ۱۳۹ صفحه (`pb-sticky-bar-clearance`) طبق دیف سند artdir همین اجرا به `pb-sticky-bar-october-clearance` می‌رسد؛ آن دیف را artdir داده و من تکرارش نمی‌کنم.
- توکن تازه در `globals.css` ثبت می‌شود (`:root` + `@theme inline`)؛ ردیفش در `DESIGN_SYSTEM.md` بخش ۱ همین نوبت به‌روز شد.
- پس از اعمال: راستی‌آزمایی qa روی ۳۶۰px ناچ‌دار — محتوای پایانی لندینگ زیر نوار نماند.
