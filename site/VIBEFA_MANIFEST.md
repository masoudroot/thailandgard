# مانیفست نصب وایب‌فارسی، فاز ۲ (۱۴۰۵/۰۷/۱۹)

نصب از آینهٔ محلی `~/workspace/skills/vibefarsi/`، مدل copy-paste (مثل shadcn).
هیچ فایل دست‌ساز پروژه بازنویسی یا حذف نشده؛ هیچ کامیتی زده نشده.

قالب هر ردیف: مسیر در پروژه ← slug آیتم رجیستری ← وضعیت تداخل

## تم

| مسیر در پروژه | منبع | وضعیت |
|---|---|---|
| `app/globals.css` (بلوک `:root`) | `themes/graphite.css` (گرافیت تیره) | جایگزینی کامل بلوک توکن‌ها به دستور فاز ۳؛ استایل‌های سفارشی حفظ شدند (پایین ببین) |

تعارض‌های توکن که به نفع تم گرافیت حل شدند (کم‌ریسک‌ترین راه، چون تم انتخاب‌شده همین است):
- `color-scheme: light` ← `dark`
- `--background/--foreground/--card/...`: کل پالت روشن graphite-soft با پالت تیرهٔ گرافیت جایگزین شد
- `--field`: نسخهٔ `color-mix` گرافیت جای مقدار ثابت قبلی را گرفت
- `--depth-surface/--depth-overlay`: سایه‌های نرم قبلی با هایلایت داخلی ۱px و سایهٔ تیرهٔ گرافیت جایگزین شدند
- `--ring`: کهربایی قبلی ← خنثی `oklch(0.7 0 0)` گرافیت
- `--brand`: `oklch(0.74 0.155 62)` قبلی ← `oklch(0.8 0.165 65)` گرافیت
- توکن‌های تازهٔ گرافیت اضافه شدند: `--line-style`, `--surface-filter`, `--backdrop`, `--spacing`

حفظ‌شده‌ها (بدون تغییر):
- `--sticky-bar-clearance` و نگاشت `--spacing-sticky-bar-clearance` (تصمیم آرت‌دایرکشن ۱۴۰۵/۰۷/۱۹)
- فونت‌ها: `--font-sans` (Vazirmatn) و `--font-display` (Pinar اول، بعد Vazirmatn)؛ Pinar حفظ شد
- انیمیشن‌های اسکلت (`--animate-shine`, `--animate-pulse-soft`) و keyframeها
- استایل‌های `body`، `h1/h2/h3`، قانون وزن واحد `h1`، قاعدهٔ iOS برای فیلدها، `prefers-reduced-motion`
- کل بلوک `@theme inline` بدون تغییر (نام توکن‌ها همان است، فقط مقدارها از گرافیت می‌آیند)

## هلپرهای lib

| مسیر در پروژه | slug رجیستری | تداخل |
|---|---|---|
| `components/vibefa/lib/utils.ts` | `utils` | داشت؛ `lib/utils.ts` دست‌ساز بود، بازنویسی نشد |
| `components/vibefa/lib/jalali.ts` | `jalali` | داشت؛ `lib/jalali.ts` دست‌ساز بود، بازنویسی نشد |
| `components/vibefa/lib/persian.ts` | `persian` | داشت؛ `lib/persian.ts` دست‌ساز بود، بازنویسی نشد |
| `lib/number-to-words.ts` | `number-to-words` | نداشت؛ در مسیر طبیعی خودش نشست |

نکته‌ها:
- هر سه فایلِ دارای تداخل در `components/vibefa/<همان path>` نصب شدند؛ ایمپورت `./utils` داخل `persian.ts` به نسخهٔ `components/vibefa/lib/utils.ts` می‌رسد و سالم است.
- ۴ خط تیرهٔ بلند (U+2014) داخل کامنت‌های `jalali.ts` (یک مورد) و `persian.ts` (سه مورد) با ویرگول جایگزین شد تا قانون ممنوعیت رعایت شود.
- نصب‌نشده‌ها (خارج از دامنهٔ کارت: اعداد، پول، تاریخ): `float` (پورتال پاپ‌آور، پیش‌نیاز کامپوننت‌های فاز بعد) و `svg-text-path-rtl` (متن روی مسیر SVG).

## نتیجهٔ بیلد

`npm run build` در `site/` (Next.js 16.4.0 + Turbopack) سبز است: کامپایل موفق،
تایپ‌اسکریپت بدون خطا، ۱۹/۱۹ صفحهٔ استاتیک ساخته شد. (اولین تلاش با خطای
«Another next build process is already running» برگشت؛ فرایند دیگری فعال نبود و
با تلاش مجدد بیلد کامل شد.)
