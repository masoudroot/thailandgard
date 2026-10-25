# AGENTS.md - قانون اساسی پروژه تایلندگرد

آخرین به روزرسانی: 2026-10-25
مالک: مسعود اکبری
دامنه: کل مخزن `masoudroot/thailandgard`

هر عامل هوش مصنوعی یا انسان، قبل از هر تغییر، این فایل و سپس `PLAN.md` و `STATE.md` را می خواند.
این سه فایل، مغز مشترک پروژه هستند و منبع حقیقت وضعیت اند.

## ۰. قانون فایل

- در همین فایل `AGENTS.md` و در `.hermes.md` هرگز کاراکتر U+200C (نیم فاصله) نوشته نمی شود؛ به جای آن فاصله ساده. دلیل: برخی کانال ها و ابزارها را بلاک می کند.
- این محدودیت فقط برای همین دو فایل است. در کد، محتوای سایت و متن محصول، نیم فاصله درست الزامی است.
- هر ادعای «انجام شد» فقط با خروجی واقعی ترمینال و کد خروج 0 معتبر است. بدون شاهد، تسک انجام نشده است.

## ۱. پروژه در یک نگاه

- سایت: `thailandgard.ir` - مرجع تخصصی تور تایلند برای مسافر ایرانی. فقط تایلند، فقط با تماس.
- ادمین: `admin.thailandgard.ir` - همین مخزن، مسیر `site/app/dashboard`.
- استک: Next.js 16 (App Router)، React 19، Tailwind v4، Supabase، Vercel، GitHub Actions.
- مخزن: تک ریپوی `masoudroot/thailandgard`؛ شاخه دائم `main`.
- کارخانه نسخه ۲: سیستم ایجنتیک چندتیمی داخل همین مخزن (`site/lib/factory`).

## ۲. نقشه مخزن

| مسیر | نقش |
|---|---|
| `site/app` | مسیرها و صفحات Next.js (سایت عمومی و داشبورد) |
| `site/components` | کامپوننت ها؛ `ui` و `vibefa` پایه طراحی |
| `site/lib` | منطق دامنه، دسترسی داده، `lib/dashboard`، `lib/factory` |
| `site/worker` | پردازشگر ها و حلقه های کارخانه |
| `site/factory` | تست ها، اسکریپت ها و ابزار کارخانه (`factory/tests`) |
| `site/app/api` | API route ها (health، auth، factory، manager، rates و ...) |
| `supabase/migrations` | مهاجرت های دیتابیس سایت |
| `docs/factory-v2` | معماری، نقشه راه، اسناد فازها |
| `.github/workflows` | CI (Factory CI)، زمان بندی (Factory Daily)، پروب پیش نمایش |

## ۳. اولویت منابع حقیقت

1. `docs/factory-v2/ARCHITECTURE.md` - معماری جاری و ADR ها.
2. `docs/factory-v2/ROADMAP.md` - فازها، بسته های کاری و Gate ها.
3. `PLAN.md` و `STATE.md` - تسک های خرد جاری و اشاره گر وضعیت.
4. `docs/ARCHITECTURE.md` - سند تاریخی؛ معتبر برای تصمیم جاری نیست.
5. `site/AGENTS.md` - قواعد مخصوص نسخه Next.js این پروژه؛ آن را نگه دار و بازنویسی نکن.

سند موازی جدید نساز. سند موجود را به روز کن.

## ۴. قوانین تغییر (غیرقابل مذاکره)

- هیچ کامیت مستقیم روی `main`. یک شاخه به ازای هر کار، با نام `type/scope` (مثل `fix/contact-form`).
- هر تغییر باید شناسه تسک در `PLAN.md` داشته باشد.
- در هر میکرو-تسک حداکثر ۲ تا ۳ فایل تغییر می کند. میکرو-تسک بزرگ تر را بشکن.
- برای منطق، تست قبل از کد (TDD). برای رابط کاربری، بررسی واقعی DOM یا اسکرین در ۳۶۰ و ۱۲۸۰ پیکسل.
- هیچ سکرتی (توکن، کلید، رمز) در مخزن، چت، لاگ یا آرتیفکت نمی آید. فقط نام متغیر مجاز است.
- فریز تولید فعال است. تغییر پرریسک روی production فقط با تایید صریح مسعود.
- تغییر production فقط از مسیر WorkItem، Gate، Policy، Release انجام می شود (ADR-004، ADR-005).
- هیچ وابستگی، سرویس یا زیرساخت جدید بدون ADR و تایید صریح اضافه نمی شود.
- تصمیم کاری: همه چیز روی همان GitHub و Vercel می ماند؛ سرور یا orchestrator جدا اضافه نمی شود.

## ۵. استک و نسخه ها

- Node 22، npm 10.
- next 16.4، react 19.3، tailwind 4، vitest 5.
- نصب محلی تا رفع drift قفل: `cd site && npm ci --legacy-peer-deps`
  (کد CI هم همین را اجرا می کند. رفع ریشه ای در تسک Q1-01.)
- دیتابیس سایت: Supabase. دیتابیس کارخانه: Postgres عملیاتی جدا (ADR-008).
- تولید و پیش نمایش: Vercel. CI و اجرای کارخانه: GitHub Actions (ADR-011، ADR-012).

## ۶. دروازه کیفیت (Definition of Done)

یک تسک فقط وقتی در `PLAN.md` تیک می خورد که همه موارد زیر واقعا اجرا شده باشند:

- تست نوشته یا به روز شده و سبز است.
- `npm run typecheck` با کد خروج 0.
- `npm run lint` و `npm run lint:factory` با کد خروج 0.
- `npm test` با کد خروج 0.
- برای تغییر رابط یا مسیر: `npm run build` سبز، به علاوه بررسی DOM یا اسکرین.
- `git diff` فقط فایل های هدف را نشان می دهد و هیچ `console.log` دیباگ باقی نمانده.
- `PLAN.md` و `STATE.md` به روز شده اند.
- PR باز شده و CI (Factory CI) سبز است.

دستور کوتاه بررسی: `cd site && npm run verify` (در Q1-04 اضافه می شود).

## ۷. قوانین رابط فارسی (VibeFarsi)

- فقط توکن معنایی: `bg-background`، `text-foreground`، `border-border`، `bg-card`، `bg-muted`، `text-muted-foreground`، `bg-primary`، `text-primary-foreground`، `bg-brand`. هیچ hex یا shade تصادفی.
- فقط خواص منطقی RTL: `ms-`، `me-`، `ps-`، `pe-`، `start-`، `end-`، `text-start`، `text-end`، `border-s`، `border-e`، `rounded-s`، `rounded-e`.
- ممنوع: `ml-`، `mr-`، `pl-`، `pr-`، `left-`، `right-`، `text-left`، `text-right`، `flex-row-reverse`، `space-x-*`.
- ممنوع: `tracking-*` روی متن فارسی. فاصله حروف همیشه صفر.
- ممنوع: `uppercase` روی متن فارسی.
- فونت: Vazirmatn برای بدنه، Pinar برای تیتر (از `site/app/fonts`).
- اعداد فارسی، واحد تومان، تاریخ شمسی.
- حالت بارگذاری: skeleton هم اندازه چیدمان نهایی؛ spinner تنها ممنوع. تصویر با `aspect-ratio` یا ابعاد مشخص.
- هدف لمسی حداقل ۴۴ در ۴۴ پیکسل؛ فاصله ها روی شبکه ۴ پیکسل؛ radius از `--radius`.
- آیکون فقط `lucide-react`. آیکون های جهت دار در RTL برعکس می شوند.
- کپی فارسی طبیعی و محترمانه. «می باشد»، «لازم به ذکر است» و لحن رباتیک ممنوع.
- موبایل اول: هر صفحه در ۳۶۰ تا ۳۹۰ پیکسل بررسی می شود.

## ۸. کارخانه نسخه ۲

- اجرا: GitHub Actions با runner درون فرآیندی (`site/lib/factory/runner.ts`). Temporal حذف شده است (ADR-011).
- حالت فعال: `FACTORY_RUNTIME` روی `new` نیست تا Gate فاز ۶. تولید با runtime قدیمی کار می کند.
- شش دامنه مالک محور: Leader، Tour Manager، Content، SEO، Design، Dev.
- چرخه: WorkItem، Gate، Policy، Evidence، Release. شاهد اجباری است (ADR-010).
- جزئیات: `docs/factory-v2/ROADMAP.md` و `docs/superpowers/plans/`.

## ۹. تست و CI

- تست ها: `site/factory/tests/**/*.test.ts` با vitest.
- CI: `.github/workflows/factory-ci.yml` شامل lint، lint:factory، factory:schemas، typecheck، migrate، test، walking-skeleton و build.
- تست یکپارچه به Postgres روی پورت 5433 نیاز دارد (`TEST_DATABASE_URL`).
- `gh run watch` را هرگز pipe نکن؛ کد خروج پایپ گمراه کننده است.
- بیلد سنگین روی CI اجرا می شود؛ محلی فقط typecheck، lint و test.

## ۱۰. ارتباط و گزارش

- فارسی ساده و مستقیم. اصطلاح فنی فقط وقتی لازم است.
- هر میکرو-تسک با سه خط بسته می شود: چه شد، شاهد (خروجی واقعی)، قدم بعد.
- بدون وعده بدون اجرا. اگر ابزاری بلاک شد، همان لحظه صادقانه گزارش می شود.