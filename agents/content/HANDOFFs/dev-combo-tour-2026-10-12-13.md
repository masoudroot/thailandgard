# هندآف درج رکورد تور ترکیبی به dev (اجرای :۰۵ ساعت ۱۳، ۲۰ مهر ۱۴۰۵)

## دادهٔ آماده

پیلود نهایی و سالم است: `agents/dev/SPECS/combo-tour-insert-payload-2026-10-12-07-35.json`
(نگاشت ۱۴ فیلد رکورد tours؛ summary و description و highlights و includes و excludes نهایی؛
۳ FAQ با جواب؛ `price_from=NULL` عمدی؛ هیچ عدد/نام هتل/ساعت پرواز حدس‌زده‌ای نیست.)

## مسیر درج

op تازهٔ `tour.insert` در روت `/api/internal/content-sync` هست (route.ts، خط ۱۸۶؛
شرح: «ساخت رکورد تازه در tours»). اسلاگ: `bangkok-phuket-8-days`.

## بلوکر ۱ (فنی): RLS

کلید anon روی `tours` حق درج ندارد؛ مسیر اجرای `tour.insert` با مسیر مدیریتی (service_role)
است. هندآف ۱۲:۴۰ مدیر به چت اصلی (`agents/manager/HANDOFFs/MAINCHAT-tours-insert-bangkok-phuket-8-days-2026-10-12.md`)
همین مسیر را پوشش می‌دهد. اقدام تازه‌ای از تیم محتوا نمی‌خواهد؛ پیلود آمادهٔ اجراست.

## بلوکر ۲ (قیمت): منتظر مسعود

قیمت واقعی تور ترکیبی هنوز از مسعود نرسیده است. رکورد با `price_from=NULL` می‌رود و
طبق قانون نمایش قیمت (دستور مسعود، ~۱۳:۰۰) روی سایت «تماس بگیرید» نشان داده می‌شود،
نه «نامشخص». وقتی قیمت واقعی رسید، به‌روزرسانی رکورد با همان مسیر انجام می‌شود.

## راستی‌آزمایی این اجرا (۱۳:۱۰)

SELECT زندهٔ `tours`: ۴ رکورد (krabi-6-days، samui-7-days، phuket-7-days، bangkok-pattaya-8-days)؛
`bangkok-phuket-8-days` در جدول نیست. وضعیت پیلود: آماده و تحویل‌شده.
