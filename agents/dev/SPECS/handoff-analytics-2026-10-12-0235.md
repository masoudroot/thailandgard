# هندآف اجرایی به تیم dev | ثبت منبع لید (first-touch)

از: تیم تحلیل و آنالیز | ۲۰ مهر ۱۴۰۵، اجرای :۳۵ ساعت ۰۲:۳۵ تهران

## زمینه
اسپک آماده‌سازی تفکیک منبع (`agents/analytics/SPECS/source-attribution-readiness-2026-10-11-13.md`) دیروز توسط dev خوانده و پذیرفته شد؛ پیاده‌سازی هنوز انجام نشده. خود اسپک تصمیم مدیریتی نمی‌خواهد. دیف دقیق در `agents/analytics/SOURCE-IMPLEMENTATION.md` هست؛ این هندآف همان دیف را با یک تکمیل کوچک (first-touch) به چک‌لیست نهایی تبدیل می‌کند. به `site/` فقط dev در همین اجرا دست می‌زند.

## سه قدم
۱. `site/components/site/CallbackForm.tsx`: تابع `buildSource` و ارسال در `submit`، عین دیف ۱ سند SOURCE-IMPLEMENTATION.md، بدون تغییر.
۲. `site/app/api/callback/route.ts`: فالبک `unknown|unknown|none`، عین دیف ۲ همان سند، بدون تغییر.
۳. ذخیرهٔ first-touch (تکمیل اسپک؛ کوچک): در همان CallbackForm یک `useEffect` موقع mount: اگر URL پارامتر `utm_*` داشت، هر پنج‌تای استاندارد را در `localStorage` با کلید `tg_first_touch` ذخیره کن (JSON شامل `utm_source`، `utm_medium`، `utm_campaign`، `utm_content`، `utm_term`، به‌علاوهٔ `landing` برابر pathname و `saved_at`). در `buildSource`: اول `URLSearchParams` فعلی را بخوان، اگر خالی بود از `localStorage` بازخوانی کن؛ یعنی اگر کاربر از صفحه‌ای بدون UTM فرم را فرستاد، مقدار ورودی اول حفظ می‌شود نه خالی.

## چه چیزی تست می‌شود (برای qa)
- ورود با `?utm_medium=cpc&utm_campaign=summer1405` و سپس رفتن به صفحه‌ای دیگر و ثبت فرم: `source` باید `ad|tour/<slug>|summer1405` باشد.
- ورود مستقیم (بدون UTM): `direct|home|none`.
- ثبت دستی بدون `source`: `unknown|unknown|none` در دیتابیس (تست روی JSONL محلی، نه `leads` پروداکشن).

## چرا حالا
لید صفر است و این قلم هیچ وابستگی بیرونی ندارد؛ وقتی ترافیک آمد از روز اول تفکیک منبع داریم. ریسک: صفر برای بقیهٔ سایت (دو فایل فرم و روت).
