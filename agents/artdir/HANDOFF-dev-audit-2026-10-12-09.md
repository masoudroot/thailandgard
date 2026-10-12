# هندآف به dev (+ یادداشت qa) — یافته‌های ممیزی زیبایی‌شناسی ۰۹:۰۵

منشأ: `agents/artdir/AUDIT/site-aesthetic-audit-2026-10-12-09.md` (۵ ایراد، هر ۵ با بازبینی دوم موتور). dev واکنشی: هر سه قلم زیر را همین اجرا پیاده کن؛ فقط قلم ۳ اول به qa می‌رود.

## قلم ۱ — حذف font-bold لوگو (فوری، یک‌خطی)

- فایل: `site/app/layout.tsx:97`
- فعلی: `<span className="font-display text-lg font-bold">`
- تازه: `<span className="font-display text-lg">`
- چرا: قاعدهٔ «وزن نمایشی از توکن»؛ توکن ۷۰۰ است پس هیچ تغییر دیداری ندارد.

## قلم ۲ — ارتقای متای text-xs خنثی به text-sm (مهم)

- چرا: قاعدهٔ «کف text-sm برای متا/کمکی» (۱۲px خنثی فارسی از AA می‌افتد).
- فایل‌ها (فقط زمینه‌های متا/کمکی):
  - `site/components/site/TourCard.tsx:31`، `:38`، `:53`
  - `site/app/guide/page.tsx:65`
  - `site/app/page.tsx:171`
  - `site/components/site/AnnouncementMarquee.tsx:22`
  - `site/components/site/ShareButtons.tsx:102`
  - `site/components/site/CallbackForm.tsx:248`، `:284`
- با احتیاط (بودجه/تراکم؛ اگر به‌هم خورد به artdir برگردان، نه اینکه text-xs بماند):
  - `site/components/site/MobileOctoberBar.tsx:54`، `:56` — بودجهٔ ارتفاع ۲۰٪ را بازمحاسبه کن
  - `site/components/site/OctoberTimeline.tsx:52` — مراقب `w-28` و `line-clamp-2`
- دست نزن (حقوقی، مجاز): `site/components/site/CallbackForm.tsx:312`، `site/app/phuket-october/page.tsx:182`

## قلم ۳ — آیکون ابتدای توکن (جزئی)

- چرا: بسط قاعدهٔ «لیبل راست، عدد چپ» به نشانگر (بازبینی دوم: حکم تازه لازم نیست).
- فایل‌ها: همان کامپوننت‌های قلم ۲ که آیکون دارند (TourCard، متای guide، باکس توضیح قیمت صفحهٔ تور، CallbackForm، کارت غزل عینی در contact) — آیکون به ابتدای توکن (راست) منتقل شود.
- ممیزی: farsiui.

## یادداشت برای qa (قبل از دست dev)

- **قلم ۴ (مشروط):** دکمهٔ ثبت فرم «درخواست تماس» در شات مرجع ۰۰:۵۵ خاکستریِ غیرفعال‌نما بود (پیکسل ۱۶۴ در برابر ۶۳) در حالی که کد فقط در `busy` غیرفعالش می‌کند (`CallbackForm.tsx:295`). اول شات تازه از `/contact` بگیر: اگر هنوز خاکستری است، به dev بده (علت‌یابی)؛ اگر نه، در گزارش بنویس «گذرا بود» و بسته شود.

## قلم ۵ — برچسب فاصلهٔ تایم‌لاین (جزئی؛ تصمیم artdir گرفته شد)

- فایل: `site/components/site/OctoberTimeline.tsx`
- تصمیم: برچسب «۵ روز بعد» زیر ایستگاه میانی (۱۵ اکتبر) اضافه شود؛ فاصله‌ها مساوی می‌مانند (نوار «شمارش فشرده» است، نه مقیاس).
