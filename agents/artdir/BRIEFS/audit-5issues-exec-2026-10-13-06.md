# بریف اجرایی: پیاده‌سازی ۵ ایراد ممیزی ۰۵:۰۵ | آرت‌دایرکشن → dev | ۲۱ مهر ۱۴۰۵، اجرای teams-run-20261013-0628

**منبع:** `agents/artdir/AUDIT/site-aesthetic-audit-2026-10-13-05.md` (هر ۵ ایراد با بازبینی دوم موتور تأیید شده). **قاعدهٔ فایل:** فقط همین ۵ نقطه؛ هیچ فایل دیگری دست نخورد. بدون کامیت (فقط هماهنگ‌کننده در فاز ۶).

## ۱. حذف گرادیان کهربایی جای‌نگه‌دار (مهم)
- **فایل:** `site/components/blocks/feature-split.tsx` خط ۳۳
- **تغییر:**
```diff
- {f.media ?? <div aria-hidden className="size-full" style={{ background: "radial-gradient(80% 80% at 30% 20%, oklch(from var(--brand) l c h / 25%), transparent 70%)" }} />}
+ {f.media ?? <div aria-hidden className="size-full" />}
```
- **چرا:** نقض «پترن ممنوع» + «کهربایی فقط در ۴ جای مجاز».

## ۲. رفع دو نقض در bento خفته (مهم)
- **فایل:** `site/components/blocks/bento.tsx` خطوط ۲۱ تا ۲۲
- **تغییر:**
```diff
- {eyebrow && <p className="text-sm font-semibold text-brand">{eyebrow}</p>}
+ {eyebrow && <p className="inline-flex items-center gap-2 rounded-full bg-brand/15 px-3 py-1 text-xs font-semibold text-brand-foreground">{eyebrow}</p>}
- {title && <h2 className="mt-2 text-3xl font-bold">{title}</h2>}
+ {title && <h2 className="mt-2 text-2xl sm:text-3xl">{title}</h2>}
```
- **چرا:** الگوی «پل روتیتر تنها» + «وزن نمایشی از توکن» (font-bold دستی ممنوع).

## ۳. ارتقای دو text-xs کمکی به text-sm (مهم)
- **فایل ۱:** `site/components/site/HeroCapsule.tsx` — پاراگراف «امضای ایرانی» (`اینجا یک آدم جواب می‌دهد، نه ربات`): `text-xs` ← `text-sm`
- **فایل ۲:** `site/app/page.tsx` خط ۱۴۷ — میکروکپی «قیمت با نرخ روز دلار به‌روز می‌شود»: `text-xs` ← `text-sm`
- **تغییر دیگری نده** (بودجهٔ ارتفاع دست نخورد).

## ۴. فاصلهٔ بلوک حقوقی خانه (جزئی)
- **فایل:** `site/app/page.tsx` — پاراگراف حقوقیِ زیر `<Separator />` در سکشن ترکیبی: `mt-4` ← `mt-6`

## ۵. چسبندگی بلوک قیمت به سکشن ترکیبی (جزئی)
- **فایل:** `site/app/page.tsx` — کانتینر بلوک قیمت/CTA بعد از سکشن ترکیبی
- **تغییر:**
```diff
- <div className="mx-auto max-w-5xl px-6 pb-16">
+ <div className="mx-auto max-w-5xl px-6 pb-16 -mt-8">
```
- **کامنت کنارش:** `{/* چسبندگی قیمت به سکشن؛ قاعدهٔ ممیزی ۰۵:۰۵ */}`

## معیار پذیرش (برای qa)
- هر ۵ نقطه روی پیش‌نمایش dev دیده شود؛ هیچ گرادیان/هالهٔ کهربایی تازه‌ای در جای‌نگه‌دار نباشد؛ روتیتر bento الگوی پل باشد؛ h2 بدون font-bold دستی؛ هر دو متن کمکی text-sm؛ فاصلهٔ حقوقی mt-6؛ بلوک قیمت حداکثر ۳۲px زیر بدنهٔ سکشن.
- بیلد سبز؛ رگرسیون بصری در صفحات خانه و تورها: صفر.
