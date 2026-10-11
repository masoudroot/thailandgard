# اسپک یکتاسازی نام منابع `intel_feed` | ۱۹ مهر ۱۴۰۵، ساعت ۰۹:۳۵

زمینه: ممیزی ۰۷:۳۵ نشان داد نام یک نشریه با چند املا ثبت می‌شود و آمار «منابع فعال» را باد می‌کند. این اسپک ادامهٔ همان یافته است (کار نیمه‌تمام اجرای قبل، بسته شد). قانون پایه: پیش از هر تحلیل توزیعی، هویت موجودیت‌ها را یکتا کن (canonicalization)؛ و قانون ۱-۱۰-۱۰۰ گارتنر: تأیید هنگام ثبت ارزان‌ترین نقطه است، پس نقشهٔ یکتا از امروز اعمال شود.

## نقشهٔ یکتا (canonical map)
مبنا: شمارش ۶۶ ردیف ۳ روز گذشته (۱۸ تا ۱۹ مهر).

| نام یکتا | واریانت‌های فعلی | تعداد ردیف |
|---|---|---|
| Nation Thailand | Nation Thailand، The Nation Thailand، The Nation | ۴ + ۴ + ۱ = ۹ |
| The Pattaya News | The Pattaya News، TPN National، TPN National (The Pattaya News) | ۲ + ۱ + ۱ = ۴ |
| Reuters | Reuters، Reuters / ThePrint | ۱ + ۱ = ۲ |
| Rawai.com | Rawai.com (به نقل از The Phuket News و TMD) | ۱ |
| flydubai | flydubai (بیانیهٔ رسمی) | ۱ |

توضیح تصمیم‌ها:
- هر سه واریانت Nation به یک نشریه (nationthailand.com) اشاره دارند؛ اطمینان بالا.
- TPN مخفف رسمی The Pattaya News است؛ اطمینان بالا.
- «Reuters / ThePrint» بازنشر رویترز در ThePrint است؛ منبع اصلی رویترز ثبت می‌شود.
- توضیح‌های پرانتزی «به نقل از…» و «بیانیهٔ رسمی» متعلق به ستون `summary`‌اند نه `source_name`؛ نام منبع فقط نام ناشر است.

## دستور اجرایی (برای اعمال در فاز dev یا اجرای بعدی تیم اطلاعات)
```sql
UPDATE intel_feed SET source_name = 'Nation Thailand'
 WHERE source_name IN ('The Nation Thailand', 'The Nation');
UPDATE intel_feed SET source_name = 'The Pattaya News'
 WHERE source_name IN ('TPN National', 'TPN National (The Pattaya News)');
UPDATE intel_feed SET source_name = 'Reuters'
 WHERE source_name = 'Reuters / ThePrint';
UPDATE intel_feed SET source_name = 'Rawai.com'
 WHERE source_name = 'Rawai.com (به نقل از The Phuket News و TMD)';
UPDATE intel_feed SET source_name = 'flydubai'
 WHERE source_name = 'flydubai (بیانیهٔ رسمی)';
```

## قانون ثبت نام منبع (برای تیم اطلاعات)
تیم اطلاعات از این پس `source_name` را فقط از همین نقشهٔ یکتا برمی‌دارد؛ نام تازه‌ای که در نقشه نیست، اول با مدیر/تیم تحلیل هماهنگ و بعد به نقشه اضافه می‌شود. اثر: ۴۶ نام یکتای فعلی به ۴۱ می‌رسد و آمار منابع دیگر باد نمی‌کند.

## وضعیت
- ۱۰:۱۰ (راستی‌آزمایی فقط‌خوان تیم تحلیل): هر ۷ واریانت از جدول رفته‌اند و شمارش نام‌های یکتا با نقشه می‌خواند؛ به‌نظر می‌رسد SQL پیش از فاز ۴ اعمال شده است. تکرار SQL لازم نیست مگر راستی‌آزمایی dev شکست بخورد.
- بستهٔ هندآف کامل برای dev در `SPECS/handoff-normalization-to-dev-2026-10-11-10.md` (راستی‌آزمایی + ریسک + تصمیم‌های لازم از مدیر).
