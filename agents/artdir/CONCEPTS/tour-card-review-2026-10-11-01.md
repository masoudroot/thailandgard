# بازبینی پیاده‌سازی کارت تور در برابر بریف آرت‌دایرکشن

وضعیت: تحویل به تیم dev برای اصلاح همان اجرا | تاریخ: ۱۹ مهر ۱۴۰۵ | ساعت ۰۱:۳۵

مبنا: `agents/artdir/CONCEPTS/tour-card-quiet-luxury-2026-10-11-01.md` در برابر `site/components/site/TourCard.tsx` (شاخهٔ `dev`).

## جمع‌بندی

پیاده‌سازی در کل به بریف وفادار است: سلسله‌مراتب ۵ عنصری رعایت شده، هیچ فیلد دادهٔ تازه‌ای اضافه نشده، عدد جعلی نیست، کهربایی فقط فیل بج برند است، حرکت روی توکن تم (`--motion: 200ms` در `app/globals.css` سطر ۵۲) می‌نشیند و سقف ۲۰۰ میلی‌ثانیه رعایت شده، `focus-visible` هم داخل خود کامپوننت `Button` (سطر ۳۳ `components/ui/button.tsx`) آماده است. دو مغایرت جزئی زیر باید اصلاح شود.

## مغایرت ۱: حرکت هاور، بلند شدن به‌جای فشردن

بریف، بند ۶ بریف اجرایی: «هاور: بدون سایه؛ فقط جابه‌جایی ظریف در سقف ۲۰۰ میلی‌ثانیه (الگوی تم: فشردن scale)». پیاده‌سازی به‌جای الگوی تم، لیفت عمودی گذاشته است (`hover:-translate-y-0.5`). الگوی تم همان است که دکمه‌ها استفاده می‌کنند: `active:[transform:var(--press)]` با تعریف `--press: scale(0.98)` در `app/globals.css` سطر ۵۱.

- فایل: `site/components/site/TourCard.tsx`
- خط: ۱۴
- کد قدیم:
  `    <Card className="flex h-full flex-col overflow-hidden transition-transform duration-(--motion) ease-motion hover:-translate-y-0.5">`
- کد جدید:
  `    <Card className="flex h-full flex-col overflow-hidden transition-transform duration-(--motion) ease-motion active:[transform:var(--press)]">`

## مغایرت ۲: ردیف قیمت ممکن است دوخطی شود

بریف: «ردیف قیمت یک خطی» و در بخش موبایل «ردیف قیمت یک خطی می‌ماند (عدد با ارقام فارسی و جداکنندهٔ «٬» در باریک‌ترین عرض هم جا می‌شود)». پیاده‌سازی `flex-wrap` گذاشته که در عرض‌های باریک اجازهٔ شکستن به دو خط را می‌دهد و با الزام «یک خطی» بریف در تنش است.

- فایل: `site/components/site/TourCard.tsx`
- خط: ۳۲
- کد قدیم:
  `        <div className="flex flex-wrap items-baseline justify-between gap-3">`
- کد جدید:
  `        <div className="flex flex-nowrap items-baseline justify-between gap-3">`

## مواردی که تطبیق داشت (بدون تغییر)

۱. متای بالا: بج `variant="brand"` راست + «N روزه» با آیکون چپ (خطوط ۱۶ تا ۲۲).
۲. عنوان `text-xl` و خلاصه با `leading-7` (خطوط ۲۳ و ۲۴).
۳. خط مسیر با آیکون `MapPin`، سایز `xs`، رنگ `muted`، زیر خلاصه و بالای خط مویی (خطوط ۲۵ تا ۲۸).
۴. خط مویی `Separator` بین بخش سفر و بخش خرید (خط ۳۱).
۵. ردیف قیمت: لیبل «شروع قیمت از» راست (خط ۳۳) و کامپوننت `Price` با `size="md"` چپ (خط ۳۴)؛ عدد با ارقام فارسی و «تومان» و به رنگ جوهر، نه کهربایی.
۶. دکمهٔ «مشاهدهٔ جزئیات» تمام‌عرض با `variant="secondary"` و آیکون `ArrowLeft` و `mt-auto` در انتهای کارت (خطوط ۳۰ و ۳۶ تا ۴۱).
۷. هیچ فیلد دادهٔ تازه‌ای: همهٔ پراپ‌ها از تایپ موجود `Tour` می‌آیند (`shortTitle`، `days`، `title`، `summary`، `route`، `priceFrom`، `slug`).
۸. هیچ عدد جعلی: امتیاز، نظر یا «ظرفیت محدود» ساخته نشده است.
۹. کهربایی فقط فیل کوچک بج برند است (خط ۱۷)؛ بقیهٔ متن‌ها جوهر یا muted.
