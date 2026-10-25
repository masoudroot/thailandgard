# سایت تایلندگرد

اپلیکیشن Next.js سایت `thailandgard.ir` و داشبورد `admin.thailandgard.ir`.
هر دو از همین پوشه ساخته می‌شوند و روی Vercel اجرا می‌شوند. کارخانهٔ نسخه ۲ در `lib/factory` و `worker/factory` زندگی می‌کند.

## پیش‌نیاز

- Node 22
- npm 10

## نصب

```bash
cd site
npm ci
```

تنظیم `legacy-peer-deps=true` در `site/.npmrc` ثبت شده است. به همین دلیل `npm ci` بدون هیچ فلگ اضافه‌ای کار می‌کند؛ همین تنظیم در CI و روی Vercel هم خوانده می‌شود.

## دستورهای روزمره

| دستور | کار |
|---|---|
| `npm run dev` | سرور توسعه |
| `npm run build` | بیلد تولید |
| `npm run typecheck` | بررسی نوع‌ها با `tsc --noEmit` |
| `npm run lint` | ESLint کل پروژه |
| `npm run lint:factory` | ESLint فقط دامنهٔ کارخانه |
| `npm test` | تست‌های vitest (`factory/tests`) |
| `npm run verify` | typecheck + lint + lint:factory + test، همان دروازهٔ محلی قبل از PR |

تست‌های یکپارچه به یک Postgres روی پورت ۵۴۳۳ نیاز دارند (`TEST_DATABASE_URL`). بدون آن، این فایل‌ها skip می‌شوند.

## کارخانه

اسکریپت‌های `factory:*` و نحوهٔ اجرای محلی در `site/factory/README.md` توضیح داده شده است.

## متغیرهای محیطی

مقادیر هیچ‌وقت داخل مخزن نمی‌آیند. فقط نام‌ها در مستندات ذکر می‌شوند و مقدارها در `site/.env.factory.local` (لوکال، gitignored) یا در Vercel و GitHub Actions secrets قرار می‌گیرند.

## CI

`Factory CI` روی هر pull request اجرا می‌شود: lint، lint:factory، factory:schemas، typecheck، migrate، test، walking-skeleton و build. شاخهٔ `main` محافظت شده است و بدون سبز بودن این چک، ادغام ممکن نیست.