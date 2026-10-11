# دستور اجرایی نهایی: دیف B حکم تایپوگرافی | اجرای ۱۸:۰۵ | ۱۹ مهر ۱۴۰۵

**از:** تیم design (بازبینی دوم روی کد، نه روی سند) | **به:** تیم dev (فاز ۴، همین اجرا)
**مبنا:** `agents/artdir/TYPO/typo-decision-2026-10-11-17.md` (حکم ۳: ارتفاع خط بر اساس نقش، هرگز ادهاک؛ تیتر ۱٫۳۵ / بدنه ۱٫۸ / خواندنی بلند ۱٫۹ / لیبل و کنار دکمه ۱٫۵ / کپشن و ریز ۱٫۶؛ هیچ leading-tight/snug/8 روی تیتر؛ وزن تیتر فقط از توکن)

## الف) دو h1 جاافتاده از دیف B (یافتهٔ بازبینی ۱۷:۳۵، تأیید ۱۸:۰۵)

| فایل | خط | حالا | بشود |
|---|---|---|---|
| `site/app/phuket-october/page.tsx` | ۱۱۳ | `mt-5 font-display text-4xl font-bold leading-tight` | `mt-5 font-display text-4xl` |
| `site/components/site/OctoberBanner.tsx` | ۱۷ | `mt-3 font-display text-4xl font-bold leading-tight sm:text-5xl` | `mt-3 font-display text-4xl sm:text-5xl` |

حذف `font-bold` دستی (وزن از توکن) و `leading-tight` (۱٫۲۵ زیر ۱٫۳۵ مصوب؛ ارتفاع خط از کلاس `font-display` می‌آید).

## ب) ۹ پاراگراف بدنه با leading-8 (= ۲٫۰، مغایر حکم)

`leading-8` ← `leading-[1.8]` برای بدنه؛ `leading-[1.9]` برای متن خواندنی بلند.

| فایل | خط | نقش | مقدار تازه |
|---|---|---|---|
| `site/app/guide/[slug]/page.tsx` | ۱۵۸ | بدنهٔ مقاله (بلند) | `leading-[1.9]` |
| `site/app/guide/[slug]/page.tsx` | ۱۷۰ | بدنهٔ مقاله (بلند) | `leading-[1.9]` |
| `site/app/guide/page.tsx` | ۳۴ | لید صفحه | `leading-[1.8]` |
| `site/app/contact/page.tsx` | ۳۵ | لید صفحه | `leading-[1.8]` |
| `site/app/tours/[slug]/page.tsx` | ۲۴۸ | بدنهٔ معرفی تور | `leading-[1.8]` |
| `site/app/tours/page.tsx` | ۳۲ | لید صفحه | `leading-[1.8]` |
| `site/app/phuket-october/page.tsx` | ۱۱۷ | لید هیرو | `leading-[1.8]` |
| `site/components/site/TourBanner.tsx` | ۳۴ | خلاصهٔ تور | `leading-[1.8]` |
| `site/components/site/OctoberBanner.tsx` | ۲۰ | لید بنر | `leading-[1.8]` |

## ج) تیترها با leading-8 (تازه‌یافتهٔ grep این نوبت؛ در دیف B artdir نبود)

حکم ۳: «هیچ leading-tight/snug/8 روی تیتر»؛ ارتفاع خط تیتر ۱٫۳۵ از کلاس می‌آید، پس فقط حذف:

| فایل | خط | حالا |
|---|---|---|
| `site/app/guide/page.tsx` | ۴۶ | `CardTitle`: `mt-2 text-xl leading-8` ← حذف `leading-8` |
| `site/app/page.tsx` | ۱۵۶ | `CardTitle`: `mt-3 text-xl leading-8` ← حذف `leading-8` |
| `site/components/site/TourCard.tsx` | ۲۸ | `CardTitle`: `mt-3 text-xl leading-8` ← حذف `leading-8` |
| `site/app/phuket-october/page.tsx` | ۱۵۱ | `h3`: `text-lg font-bold leading-8` ← حذف `leading-8` (در دیف B artdir بود؛ تأیید روی کد) |

## د) error.tsx (هم‌زمان با متن نهایی محتوا)

- `site/app/error.tsx:30` — `font-display text-7xl font-bold tabular-nums text-foreground/15 sm:text-8xl` ← حذف `font-bold` دستی (نمایشی بزرگ؛ وزن از توکن). اعمال هم‌زمان با متن نهایی محتوا در همین فاز ۴؛ اگر متن محتوا نرسید، فقط `font-bold` برداشته شود و متن با نوبت بعد.

## معیار پذیرش

- هیچ `leading-tight`/`leading-snug`/`leading-8` روی هیچ تیتر یا پاراگراف بدنه در `site/` نمانده باشد (`grep -rn "leading-tight\|leading-snug\|leading-8" site/app site/components` خالی برگردد).
- هیچ `font-bold` دستی روی h1/h2/h3 و متن نمایشی (`font-display`) نمانده باشد.
