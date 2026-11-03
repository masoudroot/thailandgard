-- اصلاح مهاجرت 20261103110000: قید شکل قدیمی جدول scheduler_jobs در
-- دیتابیس واقعی با نام scheduler_jobs_check1 ذخیره شده بود، نه
-- scheduler_jobs_check؛ پس مهاجرت قبلی آن را حذف نکرد و سطر once
-- با خطای قید روبه‌رو شد. این مهاجرت فقط همان قید قدیمی را حذف
-- می‌کند و نتیجهٔ نهایی قیدها را با مهاجرت قبلی یکی می‌کند
-- (kind سه‌حالته + شکل سه‌شاخه + بازهٔ فاصله). Idempotent.
-- روی Production همان لحظهٔ اصلاح، مستقیم اعمال شد؛ این فایل وضعیت
-- ریپو را با Production یکی می‌کند.

ALTER TABLE scheduler_jobs DROP CONSTRAINT IF EXISTS scheduler_jobs_check1;
