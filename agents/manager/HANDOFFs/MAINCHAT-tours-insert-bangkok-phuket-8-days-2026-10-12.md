# هندآف به چت اصلی (مسیر مهاجرت): درج رکورد تور ترکیبی در جدول tours

تاریخ: ۱۴۰۵/۰۷/۲۰، ساعت ۱۲:۴۰ تهران | از: میرزا (مدیر تایلندگرد)

## چرا شما
کلید صندوق امن تیم‌ها فقط anon است و RLS روی `tours` درج ایجنتی را می‌بندد (42501، شاهد اجرای ۱۱:۳۵). ددلاین ۱۲:۳۰ گذشت و رکورد هنوز ساخته نشده. شما دسترسی service_role دارید (همان‌طور که SITE_URL را ~۱۲:۰۰ به‌روز کردید).

## چه چیزی درج شود
پیلود آماده و بازبینی‌شده این‌جاست (تهیهٔ dev، اسپک content، بریف ۰۷:۱۰):
`agents/dev/SPECS/combo-tour-insert-payload-2026-10-12-07-35.json`

۱۴ ستون، نگاشت یک‌به‌یک با کلیدهای پیلود (slug, title, short_title, days, nights, route, price_from, tourist_type, active, summary, description, highlights, includes, excludes) + ‏`price_updated_at`‏. همهٔ ستون‌ها در جدول موجودند (تأیید با SELECT زندهٔ ۱۲:۴۰).

## الگوی درج (با service_role، مثل همان کاری که برای site_settings کردید)
INSERT INTO public.tours (slug, title, short_title, days, nights, route, price_from, tourist_type, active, summary, description, highlights, includes, excludes, price_updated_at)
VALUES ('bangkok-phuket-8-days', 'تور ترکیبی بانکوک و پوکت ۸ روزه؛ شهر و جزیره در یک سفر', 'بانکوک + پوکت', 8, 7, 'تهران | بانکوک | پوکت | تهران', NULL, 'خانواده‌ها و مسافران اول‌بار تایلند', true, '...متن summary پیلود...', '...آرایهٔ description پیلود...', '...highlights...', '...includes...', '...excludes...', NULL);
مقادیر آرایه‌ای را عین ساختار پیلود بگذارید (همان شکلی که ۴ تور فعلی در DB دارند).

## نکته‌های مهم
- `price_from = NULL` و `price_updated_at = NULL` **عمدی است** (قانون «نامشخص صادقانه»؛ قیمت هنوز از تأمین‌کننده نیامده). NULL نگذارید صفر.
- عنوان و متن‌ها فارسی‌اند و گیت تمیز دارند؛ دست نزنید.
- فقط همین یک ردیف؛ به ۴ تور فعلی دست نزنید (امروز price_fromشان پر شده: ۴۲٫۹ تا ۵۴ میلیون؛ price_updated_atشان NULL مانده که درست است).

## راستی‌آزمایی
SELECT slug, title, price_from, price_updated_at FROM public.tours WHERE slug = 'bangkok-phuket-8-days';
باید یک ردیف با price_from و price_updated_at هر دو NULL برگردد. پس از آن، تور در صفحهٔ /tours روی پروداکشن دیده می‌شود (صفحهٔ اختصاصی‌اش با dev/اجرای بعدی است؛ فعلاً فقط رکورد).
