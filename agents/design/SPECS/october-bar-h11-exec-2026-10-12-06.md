# اسپک اجرایی: دکمه‌های نوار چسبان اکتبر h-11 + توکن 10rem | ۲۰ مهر ۱۴۰۵ | اجرای ۰۶:۰۵

مبنا: بریف artdir `agents/artdir/BRIEFS/october-bar-touch-exec-2026-10-12-06.md` (کامل خوانده شد؛ بازحکم تنش کف لمسی ۴۴px). سهم design در فاز ۲: ردیف توکن اکتبر در `DESIGN_SYSTEM.md` بخش ۱ به‌روز شد (9.75rem ← 10rem با مبنای بودجهٔ تازه) و این سند دستور اجرایی dev در فاز ۴ است. به `site/` دست زده نشد؛ کامیت/پوش با هماهنگ‌کننده.

## بودجهٔ عددی (مبنای توکن تازه)

- هندسهٔ اندازه‌گیری‌شدهٔ نوار (۰۴:۰۵): ~۱۰۶px؛ + ۴px حکم h-11 = **~۱۱۰px**
- ‎+ safe-area ناچ (تا ۳۴px) + تنفس ۱۶px = **۱۶۰px = 10rem**
- چک سقف ۲۰٪ (روی خود نوار، نه توکن): روی ۵۶۸px: ۱۱۰/۵۶۸ = ۱۹٫۴٪؛ روی ۷۳۶px ناچ‌دار: (۱۱۰+۳۴)/۷۳۶ = ۱۹٫۶٪؛ هر دو زیر سقف. اگر در کوتاه‌ترین ویوپورت برش رخ دهد، طبق قاعدهٔ M5 از ردیف قیمت می‌خورد، نه دکمه‌ها.

## دیف ۱: `site/components/site/MobileOctoberBar.tsx` (هر دو دکمه h-11 می‌شوند)

```diff
-          <Button asChild size="md" variant="brand" className="flex-1">
+          <Button asChild size="md" variant="brand" className="flex-1 h-11">
             <a href={phoneHref}>
               <Phone />
               تماس فوری
             </a>
           </Button>
-          <Button asChild size="md" variant="outline" className="flex-1">
+          <Button asChild size="md" variant="outline" className="flex-1 h-11">
             <a href={whatsappHref}>واتس‌اپ</a>
           </Button>
```

یادداشت: `size="lg"` انتخاب نشد چون ۴۸px است؛ `h-11` روی `size="md"` با twMerge قفل می‌خورد و مقیاس تایپ `text-sm` سر جایش می‌ماند.

## دیف ۲: به‌روزرسانی دو کامنت h-10 در همان فایل (صداقت کد)

```diff
- * ردیف ۲ دو دکمهٔ flex-1 با h-10: «تماس فوری» فیل کهربایی (RTL: راست) و
+ * ردیف ۲ دو دکمهٔ flex-1 با h-11 (کف لمسی ۴۴px؛ بازحکم artdir ۱۴۰۵/۰۷/۲۰): «تماس فوری» فیل کهربایی (RTL: راست) و
```

```diff
-          ردیف دکمه‌ها (h-10) + pb-2 + safe-area. */}
+          ردیف دکمه‌ها (h-11) + pb-2 + safe-area. */}
```

## دیف ۳: `site/app/globals.css` (توکن اکتبر)

```diff
   /* فاصلهٔ خالی زیر سکشن پایانی لندینگ اکتبر (موبایل):
-     ارتفاع نوار دو ردیفه (~۱۰۶px) + safe-area ناچ (تا ۳۴px) + تنفس ۱۶px (تصمیم مالک‌دار artdir، ۱۴۰۵/۰۷/۲۰) */
-  --sticky-bar-october-clearance: 9.75rem; /* ۱۵۶px */
+     ارتفاع نوار دو ردیفه (~۱۱۰px با حکم h-11) + safe-area ناچ (تا ۳۴px) + تنفس ۱۶px (بازحکم artdir، ۱۴۰۵/۰۷/۲۰) */
+  --sticky-bar-october-clearance: 10rem; /* ۱۶۰px */
```

نام کلاس مصرف‌کننده (`pb-sticky-bar-october-clearance` در `site/app/phuket-october/page.tsx`) عوض نمی‌شود؛ فقط مقدار توکن.

## معیار پذیرش (برای dev و qa)

۱. `grep -n 'className="flex-1"' site/components/site/MobileOctoberBar.tsx` خالی برگردد؛ هر دو دکمه `h-11` داشته باشند.
۲. `grep -n 'h-10' site/components/site/MobileOctoberBar.tsx` خالی برگردد (باقی‌مانده‌ای از h-10 نماند).
۳. توکن در CSS نهایی: `--sticky-bar-october-clearance: 10rem`.
۴. qa روی ۳۶۰px ناچ‌دار: کف لمسی ۴۴px روی هر دو دکمه؛ سقف ۲۰٪ نوار رعایت‌شده؛ ردیف قیمت کامل و یک‌خطه.
۵. هیچ توکن/رنگ/عدد تازه‌ای وارد کامپوننت نشده؛ دیف فقط همین ۳ قلم است.

## زنجیره

dev (فاز ۴: سه دیف بالا + بیلد) ← qa (فاز ۵: راستی‌آزمایی ۳۶۰px ناچ‌دار) ← انتشار تجمیعی.
