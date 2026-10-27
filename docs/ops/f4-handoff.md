# تحویل F4 — وضعیت، شاهد، قدم بعد

این سند برای تحویل کار به عامل بعدی (opencode یا هر عامل دیگر) نوشته شده است.
منبع حقیقت پروژه `AGENTS.md`، `PLAN.md` و `STATE.md` است؛ این سند فقط وضعیت
همین شاخه و اندازه‌گیری‌های واقعی F4 را ثبت می‌کند.

- تاریخ: ۶ آبان ۱۴۰۵ (2026-10-27)، تهران
- شاخه: `perf/f4-client-burden` (از `main` روی `abdd31f`)
- وضعیت درخت: کامیت‌شده، تمیز
- `npm run verify`: **سبز، کد خروج ۰** (typecheck + lint + lint:factory + test؛ ۱۵۷ تست موفق، ۸ skip، ۰ خطا؛ ۴۷ هشدار eslint)

## ۱) سه تغییر همین شاخه (هر سه اندازه‌گیری‌شده)

| # | تغییر | فایل‌ها | اثر اندازه‌گیری‌شده |
|---|---|---|---|
| ۱ | هیرو و گالری روی سرور؛ گالری با scroll-snap بومی + جزیرهٔ کوچک `GalleryArrows` | `components/animations/reveal-static.tsx` (جدید)، `components/site/HeroCapsule.tsx`، `components/site/ThailandGazeGallery.tsx`، `components/site/GalleryArrows.tsx` (جدید) | JS ۱۹۲٬۴۸۶ → ۱۸۹٬۶۸۳ |
| ۲ | `experimental.inlineCss: true` (CSS مسدودکنندهٔ رندر از مسیر بحرانی حذف شد) | `next.config.ts` | FCP/LCP میانه ۳۱۸۲ → ۲۳۷۲ms؛ سند ۳۵KB → ۷۲kB |
| ۳ | پوستهٔ سایت سروری؛ کشوی موبایل `dynamic ssr:false`؛ `Reveal` بدون جاوااسکریپت (`animation-timeline: view()`) | `components/site/SiteChrome.tsx`، `components/blocks/navbar.tsx`، `components/blocks/mobile-menu-sheet.tsx` (جدید)، `components/animations/reveal.tsx`، `app/globals.css` | JS ۱۸۶٬۲۷۸؛ FCP/LCP میانه ۲۴۴۹ms |

## ۲) اندازه‌گیری نهایی این شاخه (میانهٔ ۳ اجرا)

| سنجه | خط پایه (`abdd31f`) | این شاخه | بودجهٔ CI |
|---|---|---|---|
| FCP / LCP خانه | ۳۱۸۲ms | **۲۴۴۹ms** | ≤ ۴۰۰۰ms (هدف K4: ۲۵۰۰) |
| TBT خانه | ۱۵۶ms | ۱۷۱ms | ≤ ۵۰۰ms |
| CLS | ۰ | ۰ | ≤ ۰٫۰۵ |
| axe (a11y) | ۱٫۰۰ | ۱٫۰۰ | = ۱٫۰۰ |
| JS کلاینت خانه | ۱۹۲٬۴۸۶ B | ۱۸۶٬۲۷۸ B | (هدف فاز: < ۱۳۰٬۰۰۰) |
| گره DOM خانه | ۸۰۱ | ۸۱۱ | (هدف فاز: < ۶۰۰) |

فرمان اندازه‌گیری (سرور باید گرم باشد، سه اجرا، میانه):

```bash
cd site && NETLIFY=1 npm run build && npx next start -p 3000
# در ترمینال دیگر، پس از سه curl گرم‌کردن:
CHROME_PATH="C:/Program Files/Google/Chrome/Application/chrome.exe" \
  npx lighthouse@12 http://127.0.0.1:3000/ --throttling-method=devtools \
  --only-categories=performance,accessibility --output=json \
  --output-path=<path>.json --chrome-flags="--headless=new --no-sandbox --disable-dev-shm-usage --disable-gpu" --quiet
```

## ۳) دو هدفی که به سقف سخت خورده‌اند (با شاهد، نه حدس)

**JS زیر ۱۳۰KB با این استک ممکن نیست.** فقط دو چانک فریم‌ورک در هر بازدید
۱۳۲٬۴۱۵ بایت است: `4bd1b696-*.js` = react-dom (۶۴٬۴۹۸ B، gzip) و
`3794-*.js` = رانتایم کلاینت Next (۶۷٬۹۱۷ B، gzip). با حذف کامل کد اپ، همین دو
باز دانلود می‌شوند. سهم کد اپ از ~۵۷KB به ~۵۴KB رسید (بزرگ‌ترین بازمانده‌ها:
`tailwind-merge` ۸٬۸۹۴ B در چانک `622`، `CallbackForm` ۳٬۹۶۷ B، `navbar` ۴٬۷۲۷ B).

**DOM زیر ۶۰۰ بدون حذف محتوا ممکن نیست.** ۸۵۸ گره در مرورگر = main ۶۴۹ +
هدر ۳۰ + فوتر ۵۰ + ۶۰ گره `<script>` (۵۶ تای آن دادهٔ RSC اینلاین). کارت تور
~۴۸ گره و کارت راهنما ~۳۷ گره، ساختار طراحی‌اند. بررسی Lighthouse `dom-size`
در ۸۰۱ گره امتیاز ۱٫۰۰ می‌دهد و آستانهٔ توصیه‌شدهٔ گوگل ~۱۴۰۰ گره است؛ یعنی
هدف ۶۰۰ سخت‌گیرانه‌تر از هر اثر کاربری است.

**تصمیم پیشنهادی (تاییدشده by owner نیست، منتظر تصمیم مسعود):** محتوا برای این
عدد کم نشود. اگر مالک بخواهد عدد ۶۰۰ دیده شود، تنها راه حذف بخش‌های محتوایی
(گالری ~۳۲ گره، نوار اعتماد ~۲۲، «چرا ما» ~۴۵، نظرات ~۲۱) است که به ازای هر
حذف، صفحه یک بلوک فروش را از دست می‌دهد.

## ۴) کار باقی‌ماندهٔ F4 (به همین ترتیب)

1. **Q2-06 ارتقای زنجیرهٔ ابزار** — ارتقای درون‌بازه‌ای (`npm update`): react/react-dom 19.3.1، vite 8.3.5، lucide-react 1.62، @aws-sdk/client-s3 3.1157، @opentelemetry/api 1.10.0. ارتقای major (eslint 10، typescript 7، @types/node 26، @opentelemetry 0.300، @prisma/composer 0.34، prisma 8.0.0-rc.27) نیازمند ADR/تصمیم جدا. پذیرش: نصب بدون هشدار deprecated + `npm run verify` سبز.
2. **Q2-03 مهاجرت لاگ** — ۳۲۶ فراخوانی `console.*` در ۵۹ فایل (سقف در `site/factory/quality-baseline.json`). ابزار آماده: `site/lib/logger.ts` (`logger.info/warn/error`). گیت موجود: `site/factory/tests/quality-gates.test.ts` — هر فایل نباید از سقفش بیشتر شود و کاهش باید در baseline ثبت شود. دسته‌بندی پیشنهادی: worker (cycle-worker ۲۶، cycle-watchdog ۲۳، intel-daily ۱۲) → lib/dashboard (orchestrator ۴۰، cycle-recovery ۱۶، team-health ۱۵، taskqueue ۱۱) → بقیه.
3. **Q2-08 خط وابستگی** — Dependabot هفتگی برای npm و actions + `npm audit` غیرمسدودکننده در CI با گزارش.
4. **Q2-09 تست داشبورد** — تست رفتاری صفحهٔ نرخ‌ها/صف/حافظه با mock لایهٔ داده؛ برای هر صفحه یک تست موفقیت و یک تست خطا.

## ۵) تله‌های عملیاتی که در این دور وقت گرفتند

- پس از `next build`، سرور `next start` را دوباره بالا بیاور؛ در این ماشین یک بار
  بی‌صدا مرد و سه اجرای Lighthouse روی `chrome-error://` رفتند و فایل JSON
  معتبر ولی بی‌داده ساختند. قبل از هر اجرای Lighthouse با `curl` کد ۲۰۰ بگیر.
- کشتن سرور روی ویندوز: `MSYS2_ARG_CONV_EXCL="*" taskkill /F /PID <pid>`؛
  `taskkill //F` در git-bash خطا می‌دهد. پیدا کردن PID:
  `netstat -ano | grep ":3000" | grep LISTEN`.
- تولید بیلد را با اندازه‌گیری هم‌زمان نکن؛ بیلد ~۴ دقیقه است و `node_modules`
  نباید در حین بیلد عوض شود (پس `npm update` را بعد از بیلد/اندازه‌گیری بزن).
- نویز اندازه‌گیری زیاد است (FCP بین ۲۱۹۶ و ۲۸۹۳ در سه اجرای پشت‌سرهم). همیشه
  سه اجرا و میانه؛ تک‌اجرا ملاک نیست.
- در ابزار مرورگر، آزمون IntersectionObserver/اسکرول در تب مخفی نتیجهٔ منفی کاذب
  می‌دهد؛ اول `Emulation.setFocusEmulationEnabled` و `Page.bringToFront`.

## ۶) قواعد غیرقابل مذاکره (از `AGENTS.md`)

- `main` محافظت‌شده: شاخه → PR → سبز شدن چک `test` → squash merge. کامیت مستقیم ممنوع.
- آستانه‌های `site/lighthouserc.json` شل نمی‌شوند؛ مرجعشان `docs/ops/perf-budget.md` است.
- هر میکروتسک حداکثر ۲ تا ۳ فایل؛ برای هر میکروتسک سه خط گزارش: چه شد / شاهد واقعی / قدم بعد.
- هیچ ادعای «انجام شد» بدون خروجی واقعی ترمینال با کد خروج ۰.
- سکرت و نوشتن روی تولید بدون تایید صریح مسعود ممنوع.
