# STATE.md - اشاره گر وضعیت پروژه

آخرین به روزرسانی: 2026-10-25 (تهران)
به روزرسانی بعدی: بعد از تصمیم Q2-07 یا شروع Q2-03

## وضعیت فعلی

| مورد | مقدار |
|---|---|
| فاز جاری | Q2 - سلامت کد |
| آخرین تسک تکمیل شده | Q2-02 دسته های ۱ و ۲ (PR #211 و #213، هر دو ادغام شد) |
| تسک در انتظار | Q2-07 تصمیم لایهٔ دادهٔ داشبورد؛ بعد Q2-03 لاگ ها |
| شاخه کاری | `docs/q2-02-finding` برای همین PR؛ بعد از ادغام، `main` |
| شاخه `main` | `7d10db9` تا پیش از ادغام همین PR |
| PRهای ادغام شده امروز | #205 مغز مشترک، #206 نصب تکرارپذیر، #207 گیت همه PRها، #208 verify، #209 بستن Q1، #210 همگام سازی، #211 دسته ۱ suppressor، #213 دسته ۲ suppressor |
| PRهای باز | صفر |
| issue باز | #212 (خطای hydration در `/tours/[slug]`) |
| محافظ `main` | فعال: چک اجباری `test` با strict، الزام برای ادمین، بدون force push و بدون حذف |
| آخرین CI سبز | PR #213، run `40227768349` (npm ci، lint، schemas، typecheck، migrate، test، walking-skeleton، build) |
| تولید | `thailandgard.ir` روی Vercel، پاسخ 200 |
| ادمین | `admin.thailandgard.ir`، بدون نشست به `/login` هدایت می شود |
| فریز تولید | فعال؛ هیچ تغییر پرریسکی تایید نشده |
| نسخه کارخانه | `FACTORY_RUNTIME` روی `new` نیست |
| نصب محلی | `cd site && npm ci` بدون فلگ کار می کند (`.npmrc`) |

## شواهد بازبینی (2026-10-25)

- مخزن تازه در `D:/projects/thailandgard` کلون شد؛ پوشه های قدیمی در `AppData/Local/Temp/opencode` مخزن گیت نبودند و مبنای کار نیستند.
- PR #196 (Vercel Analytics) بسته شد؛ دلیل آن به فارسی در همان PR ثبت و متن تایید شد.
- ورک فلوهای فعال: Factory CI، Factory Daily، Factory Preview Probe، gsc-baseline. بقیه دستی غیرفعال شده اند.
- `npm ci` بدون فلگ قبلا شکست می خورد؛ ریشه: ناسازگاری peer در زنجیره Prisma Composer و `@effect/vitest`. با `site/.npmrc` حل شد و در CI واقعی تایید شد.
- suppressor های eslint: ۷۲ مورد (۵۲ ورودی) در شروع Q2؛ بعد از PR #211 به ۴۷ مورد و بعد از PR #213 به ۴۰ مورد رسید. `@typescript-eslint/no-explicit-any` صفر شد.
- شمارش «۵۲ suppressor» در گزارش قبلی، تعداد ورودی فایل بود نه تعداد مورد؛ در `PLAN.md` تصحیح شد.

## بدهی فنی اندازه گیری شده (مبنای فاز Q2 و Q3)

| سنجه | مقدار فعلی | هدف |
|---|---|---|
| typecheck | سبز، صفر خطا | حفظ |
| eslint | صفر خطا، ۵۳ هشدار، ۴۰ suppressor | کاهش هشدار و suppressor |
| تست ها | ۷۷ موفق، ۸ skip در ۲۲ فایل (۴ فایل skip) | پوشش مسیرهای حساس در CI |
| suppressor های eslint | ۴۰ مورد در ۳۵ ورودی (`site/eslint-suppressions.json`) | صفر یا فقط با توجیه مکتوب |
| فراخوانی `console.log` | ۱۱۸ (۵۳ worker، ۳۸ lib/dashboard، ۱۷ bridge) | صفر در مسیر درخواست |
| `text-left` یا `text-right` | ۱۱ مورد در ۵ فایل | صفر |
| `tracking-*` روی متن فارسی | ۲ مورد | صفر |
| خواص فیزیکی `ml/mr/pl/pr` | ۱ مورد | صفر |
| `left-` یا `right-` عددی | ۲ مورد | صفر |
| نصب محلی `npm ci` | سبز بدون فلگ، ۱۰۵۱ بسته | حفظ |
| URLهای sitemap | ۵۱ | پوشش کامل مسیرهای منتشرشده |

## یافته های باز (ورودی Q2-04 و Q3)

- issue #212: در `/tours/[slug]` خطای hydration و `<p>` تودرتو وجود دارد؛ روی `main` هم تکرار شد. اثر واقعی: نوار چسبان `TourStickyBar` بعد از عبور از نگهبان در ویوپورت ۳۶۰ ظاهر نمی شود. تا رفع این مورد، ارزیابی رفتار نوار چسبان ممکن نیست.
- کد مردهٔ محتمل برای Q2-04: `components/home/CardTour.tsx` و `components/home/testimonials-section.tsx` (هیچ مصرف کننده ای ندارند) و `components/site/HourAwareCallTitle.tsx` (بی مصرف).
- مسیرهای `/phuket-october` و `/tours/phuket-october` با ریدایرکت دائم به `/guide/phuket-flight-routes` می روند؛ پس `MobileOctoberBar` و `OctoberTimeline` هیچ مسیر زنده ای ندارند و در Q2-04 باید تعیین تکلیف شوند.

## قدم بعدی دقیق

1. تصمیم Q2-07 دربارهٔ لایهٔ دادهٔ داشبورد: (الف) نگه داشتن suppressor با توجیه، (ب) هوک مشترک داده، (ج) Server Component.
2. در هر حالت، دسته های کوچک باقی مانده ابتدا انجام شوند: `components/dashboard/ui/sheet.tsx`، `components/ui/sheet.tsx` (setMounted با `useIsClient`) و `components/dashboard/MobileNav.tsx` (قاعده `refs`).
3. بعد از آن Q2-03 (لاگ ها) و Q2-06 (ارتقای eslint).

## یافته فنی تازه

- قاعده `react-hooks/set-state-in-effect` فقط `setState` همزمان را نمی گیرد؛ اگر افکت تابع `async` ای را صدا بزند که در بدنه اش `setState` دارد، همان فراخوانی را خطا می دهد. آزمون واقعی: در `app/dashboard/page.tsx` بعد از حذف `setLoading(true)` از ابتدای `load`، خطا روی `void load();` باقی ماند.
- پس ۳۹ suppressor باقی مانده داشبورد یک مسئلهٔ معماری بارگذاری داده است، نه یک تمیزکاری ساده؛ و بدون تصمیم Q2-07 نباید صفحه ها یکی یکی دست کاری شوند.

## هشدارهای عملیاتی

- شاخه `main` محافظت شده است؛ هیچ push مستقیمی پذیرفته نمی شود. مسیر کار: شاخه، PR، سبز شدن `test`، squash merge.
- `gh run watch` را هرگز pipe نکن؛ کد خروج پایپ گمراه کننده است.
- نوشتن روی `AGENTS.md` همیشه نیازمند تایید انسانی است؛ بدون تایید انجام نمی شود.
- تنظیم `legacy-peer-deps` در `site/.npmrc` عمدی است؛ حذف آن نصب را می شکند.
- هر merge روی `main` یک بیلد تولید روی Vercel راه می اندازد؛ تغییرات مستندات را دسته بندی کن.
- قاعده های React Compiler هم `setState` داخل افکت را رد می کنند و هم تابع ناخالص مثل `Date.now()` داخل رندر را؛ راه درست `useSyncExternalStore` با snapshot سرور است (نمونه: `lib/use-now.ts`).