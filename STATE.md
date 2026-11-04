# STATE.md - اشاره گر وضعیت پروژه

آخرین به روزرسانی: 2026-10-28 (تهران)
به روزرسانی بعدی: بعد از مرج PR #270 (رفع SSE درگاه LLM)؛ برنامهٔ مرجع: PLAN v2

## یادداشت شاخهٔ rebuild/factory-r2 (۱۴۰۵/۰۸/۰۸، فقط برای همین شاخه؛ بدنهٔ STATE بالای این یادداشت هنوز وضعیت main در ۲۰۲۶-۱۰-۲۸ را نشان می‌دهد و در این مأموریت بازنویسی نشده است)
- R2 با کامیت 56281e9 و R2-A با کامیت 24b01b6 روی همین شاخه‌اند؛ بدون مرج و بدون PR.
- گزارش نهایی R2 و R2-A در ۱۴۰۵/۰۸/۰۸ تحویل شد؛ پیش‌نمایش R2-A روی پروژهٔ thailandgard-rebuild-preview با دیپلوی pSDtsJyTDqCXt7ujk6RHYUCDbTVX در وضعیت READY بود.
- اشاره‌گر استیجینگ در پایان آزمون‌های R2-A روی نسخهٔ 22 ایستاد؛ خواندن نسخه‌دار در مسیر عمومی هنوز وصل نشده است.
- R2A.1 با کامیت کد cd6a0b7 روی همین شاخه است؛ بدون مرج و بدون PR.
- پس از تعیین تکلیف R2A.1، همهٔ ۳۴ کار ناتمام staging لغو شده‌اند و صف Tick خالی است (Tick، `no_work` برمی‌گرداند)؛ اشاره‌گر استیجینگ همچنان روی نسخهٔ 22 است و خواندن نسخه‌دار در مسیر عمومی هنوز وصل نشده است.
- توکن داخلی staging چرخید و دیپلوی تازهٔ Preview با شناسهٔ 9xsNo9TGUDWzZyuYZDDwcrmGEmxn در وضعیت READY است؛ دیپلوی قبلی Preview با API لغو نمی‌شود و نشانی یکتای آن پشت ورود ورسل می‌ماند.

## وضعیت فعلی

| مورد | مقدار |
|---|---|
| فاز جاری | F4 و F5 و F6 بسته‌اند؛ F7 منتظر ترافیک واقعی، F8 منتظر تأیید مالک |
| آخرین تسک تکمیل شده | Q2-03 بسته شد (۲۸ اکتبر): شمارش واقعی کل مخزن ۴ فراخوانی در ۲ فایل — ۳ در `lib/logger.ts` (sink عمدی) و ۱ در تست. پیش‌تر Q4-03 (#268) و Q3-02 (#267) بسته شدند |
| تسک در انتظار | PR #270 (یک خط `stream: false` + تست) و #258 (dependabot prisma؛ rebase درخواست شد). Q4-02 (تمرین بازیابی) نیازمند dump دیتابیس |
| شاخه کاری | `docs/plan-q2-03-q4-03` (تیک PLAN/STATE) |
| شاخه `main` | `21677d0` (dependabot minor/patch)، قبلش `c12d933` (STATE)، `1be5af0` (runbook)، `3b837d3` (Q3-02)، `56abacc` (health واقعی) |
| PRهای ادغام شده این دور | #253، #255، #256، #259، #260، #261، #262، #263، #264، #265، #266، #267، #268 (runbook)، #269 (STATE)، #257 (dependabot) |
| PRهای باز | #270 (SSE درگاه LLM)، #258 (prisma rc.27) |
| issue باز | صفر |
| محافظ `main` | فعال: چک اجباری `test` با strict، الزام برای ادمین، بدون force push و بدون حذف |
| آخرین CI سبز | #269 و #257، سبز و مرج شدند |
| تولید | `thailandgard.ir` روی Vercel؛ `/api/health` واقعی است: `{"status":"ok","database":"ok"}` (از #266) |
| درگاه‌های LLM | ۶ درگاه در `settings.llm_endpoints`؛ **9router** تازه اضافه شد (`rnkehdu.abc-tunnel.us/v1`, مدل `me-9router`). شاهد از مسیر `callLLM`: پاسخ در ۳٫۶ ثانیه. درگاه بدون `stream: false` پاسخ SSE می‌داد (رفع در #270) |
| فریز تولید | غیرفعال؛ کار جاری در ساعات کم‌ترافیک و با تأیید ضمنی مالک انجام شد |
| نسخه کارخانه | `FACTORY_RUNTIME` روی `new` نیست |
| نصب محلی | `cd site && npm ci` بدون فلگ کار می کند (`.npmrc`) |

## گیت های کیفیت فعال (از PR #217 و #219)

`site/factory/tests/quality-gates.test.ts` - پنج تست که با هر PR در چک `test` اجرا می شوند:

| گیت | سقف فعلی | رفتار |
|---|---|---|
| suppressor های eslint | ۴۰ | بیشتر شدن = قرمز |
| کلاس فیزیکی جهت دار (`ml-`, `text-left`, `border-r`, `left-N`, `space-x-N`) | صفر | هر مورد = قرمز |
| `tracking-*` روی متن فارسی | صفر | هر مورد = قرمز |
| `console.*` در `app/api/**` | صفر | هر مورد = قرمز |
| `console.*` در `lib/`، `worker/`، `factory/` | ۳۲۶ در ۵۹ فایل (`site/factory/quality-baseline.json`) | بیشتر از سقف هر فایل = قرمز |

## بدهی فنی اندازه گیری شده

| سنجه | مقدار فعلی | هدف |
|---|---|---|
| typecheck | سبز، صفر خطا | حفظ |
| eslint | صفر خطا، ۴۹ هشدار، ۳۵ suppressor | کاهش هشدار و suppressor |
| تست ها | ۲۳۹ موفق (۲۳۱ pass + ۸ skip) در ۴۴ فایل | حفظ و گسترش |
| suppressor های eslint | ۳۵ مورد در ۳۵ ورودی (سقف گیت ۴۰) | قفل شده روی ۴۰؛ کاهش فقط با بازنویسی واقعی لایه داده (Q2-07: گزینه الف) |
| `console.*` در `app/api` | صفر | صفر و گیت شده |
| `console.*` در `lib`/`worker`/`factory` | ۳ در `lib/logger.ts` (عمدی) | صفر نیست؛ باقی مهاجرت در `lib/dashboard` و `worker` |
| کلاس فیزیکی RTL | صفر | صفر و گیت شده |
| `tracking-*` روی متن فارسی | صفر | صفر و گیت شده |
| جملهٔ معرفی > ۲۵ واژه | **صفر** (Q3-02 بسته شد، ۲۸ اکتبر) | صفر و گیت‌شده با `npm run factory:copy-audit` |
| کد مرده | ۲۴ فایل حذف شد (۱٬۸۸۷ خط) | حفظ |
| URLهای sitemap | ۵۱ | پوشش کامل مسیرهای منتشرشده |
| دپلوی‌های Vercel | ۱۱ (از ۲۷۱؛ پاک‌سازی ۲۸ اکتبر با حفظ دپلوی زندهٔ تولید) | زیر ۲۰ |

## یافته های حل شده

- **#229 (هشدار لید خاموش):** `intel_feed.source_url` اجباری است و در بدنهٔ درج نمی‌آمد؛ سوپابیس ۴۰۰/۲۳۵۰۲ می‌داد و کد فقط هشدار لاگ می‌کرد. رفع در PR #233 و آزمون واقعی روی تولید: ردیف «لید تازه #26968» با `next_touch` شش‌ساعته ساخته شد، بعد لید و ردیف هشدار حذف شدند و شمارش برگشت (`leads` ۰، `intel_feed` ۲۴۸).
- **#230 (ابعاد منبع ناهماهنگ):** لید `tour/<slug>` و کلیک تماس `tours/<slug>` بود؛ رفع در PR #234 با `site/lib/source-tracking.ts` و تست قفل (`tourPagePart(slug) === pathnamePagePart('/tours/'+slug)`). آزمون واقعی روی تولید: لید و کلیک هر دو `direct|tours/phuket-7-days|none` دادند؛ بعد حذف، شمارش برگشت (`leads` ۰، `call_clicks` ۶، `intel_feed` ۲۴۸).

- **issue #212 (باگ واقعی کاربر):** آکاردئون FAQ جواب `<p>` را داخل رپر `<p>` می گذاشت؛ مرورگر درخت DOM را بازنویسی می کرد و hydration می شکست. اصلاح در PR #215 با تست رگرسیون. شاهد: HTML سرور صفر `<p>` تودرتو، مرورگر واقعی صفر خطای hydration، آکاردئون interactive در ۱۲۶۴px و نوار چسبان با ارتفاع ۱۱۷px در ۳۶۰px.
- **تصحیح گزارش قبلی:** ادعای «نوار چسبان ظاهر نمی شود» ناشی از تب hidden در ابزار تست بود؛ IntersectionObserver در تب مخفی کال بک نمی دهد. رفتار محصول در تب visible درست است.
- **کد مرده:** audit برنامه ای روی نمادهای export انجام شد، نه حدس؛ ۲۴ فایل بدون هیچ ارجاعی حذف شد.

## کارایی (Q3-05)

- سند مرجع و آستانه‌ها: `docs/ops/perf-budget.md` (کندسازی واقعی devtools، پروفایل موبایل).
- نتیجه: TBT خانه ۱۰۱۲→۲۴۷ms، LCP تور ۵۸۰۵→۳۵۰۳ms، راهنما ۵۴۰۸→۳۴۵۳ms، CLS هر سه صفحه صفر، وزن خانه ۵۳۹KB.
- سه گلوگاه بسته شد: تصویرهای خام `<img>` (~۴۵۰KB روی تولید)، هفت فایل قلم بدون preload (۱۸۶KB)، و `Reveal` که متن هیرو را تا هیدریشن با `opacity-0` پنهان می‌کرد.
- `font-display: optional` است نه swap: با swap قلم دیرتر از اولین رنگ‌آمیزی می‌رسید و CLS ۰٫۱۶ می‌شد.
- گلوگاه باقی‌مانده: FCP≈۳٫۵ ثانیه که همان LCP است؛ منشأ هیدریشن و حجم JS کلاینت (۶۰ تگ اسکریپت). به F4 منتقل شد.

## اتصال‌ها

| مورد | وضعیت |
|---|---|
| تلگرام هشدار عملیاتی | متصل (بات `gozaresh_tilandgard_bot`، چت `8014083639`)؛ سکرت‌های `TELEGRAM_BOT_TOKEN` و `TELEGRAM_CHAT_ID` در مخزن ست شدند |
| پایش uptime | فعال، هر ۱۵ دقیقه، هشدار تلگرام + Issue با برچسب `ops` |
| `/api/health` | واقعی است (از #266): یک خواندن از `site_settings` با بودجهٔ ۲ ثانیه. `200 ok` / `503 degraded` / `200 unconfigured`. تأیید روی تولید: `{"status":"ok","database":"ok"}` |
| SLO و بودجهٔ خطا | `site/lib/slo.ts` (۹۹٫۵٪ ماهانه = ۲۱۶ دقیقه بودجه؛ K8 زیر ۰٫۵٪) + `npm run factory:slo-probe`. شاهد تولید: `0/12` خطا، exit 0 |
| هدرهای امنیتی | روی تولید دیده شدند: `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`, و CSP در حالت **Report-Only** |
| محدودیت نرخ فرم‌ها | ۵ ارسال در ۱۰ دقیقه از هر IP، روی `/api/callback` و `/api/contact-message`؛ شاهد: ارسال ششم `429` با `retry-after: 600` |
| نرخ واقعی ۵xx (K8) | **اندازه‌گیری نشده** — نیازمند دسترسی به لاگ درخواست‌های Vercel؛ `slo-probe` فقط نمونه می‌گیرد |

## سنجه‌های قیف (Q3-09)

| سنجه | هفتهٔ جاری | هفتهٔ قبل | منبع |
|---|---|---|---|
| K1 کلیک تماس | ۰ | ۶ | `call_clicks` |
| K3 لید ثبت‌شده | ۰ | ۰ | `leads` |
| K2 نرخ تکمیل فرم | اندازه‌گیری نشده | — | نیازمند توکن API کلریتی |

- فرمان: `cd site && npm run factory:lead-weekly` (اختیاری `--out <path>` و `--now <ISO>`).
- کد: `site/lib/lead-metrics.ts` (تجمیع خالص) و `site/factory/scripts/lead-weekly.ts` (خواندن و چاپ).
- شاهد اجرای واقعی: `docs/ops/lead-weekly-2026-10-26.md`.

## قدم بعدی دقیق (PLAN v2)

1. F2 بسته شد (پایش، آزمون قیف، سنجهٔ هفتگی، رفع دو باگ قیف). Gate فاز سبز: K1 و K3 اندازه‌گیری شده‌اند، هشدار تلگرام آزمایشی دریافت شد، و هشدار لید روی تولید کار می‌کند.
2. F3: Q3-05 کارایی با بودجهٔ عددی، Q3-06 دسترس‌پذیری، Q3-08 گیت Lighthouse و axe در CI.
3. F4: Q2-06 ارتقای ابزار، Q2-03 مهاجرت دسته‌ای لاگ، Q2-08 خط وابستگی، Q2-09 تست داشبورد.
4. F5: Q3-03 سئوی فنی ۵۱ URL، Q3-02 کپی با چک‌لیست.
5. F6: Q4-02 بکاپ، Q4-03 runbook، Q4-04 امنیت لبه، Q4-05 SLO.
6. F7: Q5-01 تا Q5-03 آزمایش‌های تبدیل.
7. F8: P3 staging و بعد.

## هشدارهای عملیاتی

- شاخه `main` محافظت شده است؛ مسیر کار: شاخه، PR، سبز شدن `test`، squash merge.
- `gh run watch` را هرگز pipe نکن؛ کد خروج پایپ گمراه کننده است.
- نوشتن روی `AGENTS.md` همیشه نیازمند تایید انسانی است.
- تنظیم `legacy-peer-deps` در `site/.npmrc` عمدی است؛ حذف آن نصب را می شکند.
- هر merge روی `main` یک بیلد تولید روی Vercel راه می اندازد؛ تغییرات مستندات را دسته بندی کن.
- قاعده های React Compiler هم `setState` داخل افکت را رد می کنند و هم تابع ناخالص مثل `Date.now()` داخل رندر را؛ راه درست `useSyncExternalStore` با snapshot سرور است.
- در ابزار مرورگر، قبل از آزمون رفتار IntersectionObserver یا اسکرول، `Emulation.setFocusEmulationEnabled` بزن؛ در تب hidden کال بک ها نمی رسند و نتیجه منفی کاذب می شود.

## وضعیت M5-PUBLISH-V2 (۱۴۰۵/۰۸/۱۰، شاخهٔ feat/m5-publish-v2)
- پیاده‌سازی کامل شد (سرویس publish-v2، دو Function نسخهٔ دوم، دو شاخهٔ Tick، سقف ۳ بازبینی، گارد R2) و تست‌های تازه سبزند؛ PR باز می‌شود و چک `test` باید سبز شود.
- Migration روی هیچ دیتابیسی اعمال نشده است (نه Staging، نه Production)؛ رفتار آن فقط با تراکنش برگشت‌پذیر روی Staging راستی شده و هیچ ردیفی نمانده است.
- مرج به main، اعمال Migration و هر Deploy، نیازمند تأیید صریح مسعود است. مسیر v1 و دادهٔ Production دست نخورده‌اند.

## THG-UNIFY-01 — یکپارچه‌سازی (۱۴۰۵/۰۸/۱۰)
- شاخهٔ یکپارچه: feat/thg-unify-01، مبنا 7cb10fd (شاخهٔ محتوایی)، به‌علاوهٔ فایل‌های افزودنی فاز ۳ از 20d38df.
- وضع راستی‌شده در شروع: main در 608491d؛ PR #277 باز و مرج‌نشده؛ دیتابیس اصلی با هر ۵ تابع کارخانه و ستون superseded_by و شمارش‌های guides ۲۰ و tours ۱۲ و content_documents صفر و factory_settings خاموش.
- چرخهٔ کامل Staging هنوز اثبات نشده است؛ بستهٔ چرخه فقط آماده می‌شود و اجرا با مرورگر و تأیید مدیر پروژه است.

## THG-UNIFY-01 — وضعیت یکپارچه (۱۴۰۵/۰۸/۱۰)
- شاخهٔ یکپارچه: feat/thg-unify-01، هفت کامیت محلی، بدون Push و بدون
  PR، درخت تمیز پس از کامیت‌ها.
- چرخهٔ Staging هنوز با مرورگر اجرا نشده است؛ بستهٔ چرخه در
  ~/workspace/thg-unify-01/docs/staging-cycle-packet.md آماده است.
- طرح Backfill و طرح انتشار در همان پوشه آماده‌اند؛ هر دو نوشته‌شده
  و اجرا نشده‌اند.

## THG-UNIFY-03 — رفع باگ چرخهٔ Staging (۱۴۰۵/۰۸/۱۰)
- شاخهٔ feat/thg-unify-01؛ علت: سد محافظت Vercel روی فراخوان داخلی
  داشبورد + بیلد کش‌شده با URL زمان Build قدیمی.
- رفع در guide-admin.ts (کوکی ورودی + پیام خوانای خطای شیئی) با ۴ تست
  تازه؛ چرخهٔ دوباره فقط تا گیت تأیید انسانی، بدون انتشار.

## CUTOVER-FT-01 — گارد محیط Fast-Track MVP (۱۴۰۵/۰۸/۱۱)
- شاخهٔ feat/thg-unify-01؛ گارد project ref در postgrestWrite و
  postgrestRpc با ۶ تست تازه؛ تریگر immutability دست نخورده است.
- متغیر EXPECTED_SUPABASE_PROJECT_REF روی Production باید
  lilmfiyzeeinmifhxdhj باشد و روی ردیف‌های شاخه‌ای vpybkilbqeshcoqnbjba.

## CUTOVER-FT-02 — پمپ Outbox، اصلاحیهٔ ۱ Fast-Track (۱۴۰۵/۰۸/۱۱، شاخهٔ feat/thg-outbox-pump-01)
- پیاده‌سازی: سرویس مشترک processOutboxBatch (منطق عین مسیر پیشین)؛ مسیر
  process-outbox نازک؛ گام process_publication تیک مستقیم از سرویس؛ سه ماشه
  (دکمهٔ «پردازش انتشار» داشبورد، Job پنج‌دقیقه‌ای factory-outbox-pump.yml با
  سکرت موجود INTERNAL_PUBLISH_TOKEN، شلیک after() پس از ثبت Publication)؛
  مسیر complete برای Publication pending اول پمپ می‌زند؛ رفع fallback خواندن
  عمومی (draft با اشاره‌گر → versioned، archived همچنان legacy)؛ موفقیت
  Verification وضعیت سند را published می‌کند تا slug وارد نقشهٔ سایت شود.
- مانده: سبز شدن verify و build، PR و چک test، squash merge و Deploy؛ سپس
  تکمیل همان Smoke گیرکرده (thailand-transport-guide) با پمپ و Verify صفحه
  و نقشهٔ سایت؛ سپس پرچم‌ها factory_paused=false و data_publishing_enabled=true.
- تریگر immutability دست نخورده است. دادهٔ Smoke تازه ساخته نمی‌شود.

## THG-TEAM-ARCHITECTURE-01-P2-S1: بستن گام ۱ (۴ نوامبر ۲۰۲۶، شاخهٔ feat/thg-team-phase2)
- حکم گام ۱: PASS با راستی‌آزمایی تست؛ چهار فایل مهاجرت ریپو: 20261104120000_thg_team_phase2_step1_001.sql و 20261104120100_thg_team_phase2_step1_knowledge_sources_bootstrap.sql و 20261104120200_thg_team_phase2_step1_002.sql و 20261104121000_thg_team_phase2_step1_proposal_fk.sql.
- شکاف ریپو/استیجینگ کلید خارجی proposal با فایل چهارم بسته شد (اجرای دوباره روی استیجینگ no-op با کد خروج ۰؛ قید factory_work_items_proposal_id_fkey با ON DELETE NO ACTION پابرجاست؛ factory_work_items برابر ۱۴۴ ردیف با ۰ مقدار غیر NULL در proposal_id).
- PR #291 باز و مرج‌نشده است؛ گام ۲ پس از این بستن آغاز می‌شود.

## THG-TEAM-ARCHITECTURE-01-P2-S2: بستن گام ۲ (۴ نوامبر ۲۰۲۶، شاخهٔ feat/thg-team-phase2)
- حکم گام ۲: PARTIAL؛ کد و تست کامل و سبز است و اجرای زندهٔ هر دو شاخهٔ تازه با ماشهٔ generation_enabled روی استیجینگ و سلامت درگاه و بودجهٔ تأییدشده، یا با چرخهٔ زندهٔ گام ۷، به تعویق افتاده است.
- فایل‌های کامیت‌شده: site/app/api/factory/tick/route.ts و site/app/api/internal/work-items/[id]/approvals/route.ts و site/factory/tests/approvals-review-cap.test.ts و PLAN.md و STATE.md.
- راستی‌آزمایی: npm run verify با کد خروج ۰؛ ۸۲ فایل قبول و ۴ فایل ردشده؛ ۷۶۸ تست قبول و ۹ تست ردشده؛ فایل approvals برابر ۱۷ از ۱۷.
- PR #291 باز و مرج‌نشده است؛ گام ۳ پس از این بستن آغاز می‌شود.

## THG-TEAM-ARCHITECTURE-01-P2-S3: بستن گام ۳ (۴ نوامبر ۲۰۲۶، شاخهٔ feat/thg-team-phase2)
- حکم گام ۳: استخراج DONE؛ بازتولید زنده ۴ انتشار NOT DONE (مسدود، چهار مانع).
- فایل‌های کامیت‌شده: site/app/api/factory/tick/route.ts و site/lib/factory/handlers/content-runtime.ts و site/factory/tests/content-runtime-handler.test.ts و PLAN.md و STATE.md.
- راستی‌آزمایی: npm run verify با کد خروج ۰؛ ۸۳ پرونده قبول و ۴ پرونده ردشده؛ ۷۷۱ آزمون قبول و ۹ آزمون ردشده؛ پرونده content-runtime-handler برابر ۳ از ۳.
- PR #291 باز و مرج‌نشده است؛ گام ۴ پس از این بستن آغاز می‌شود.

## THG-TEAM-ARCHITECTURE-01-P2-S4: بستن گام ۴ (۴ نوامبر ۲۰۲۶، شاخهٔ feat/thg-team-phase2)
- حکم گام ۴: Runtime رهبر و خوراک‌ها و آداپتور DONE روی دادهٔ ساختگی با آزمون؛ خواندن زنده NOT DONE؛ بازتولید زندهٔ ۴ انتشار NOT DONE (مانده از گام ۳).
- فایل‌های کامیت‌شده: site/lib/factory/leader/leader-runtime.ts و site/lib/factory/feeds/leader-feeds.ts و site/lib/factory/leader/leader-adapter.ts و site/factory/tests/leader-runtime.test.ts و site/factory/tests/leader-feeds.test.ts و site/factory/tests/leader-adapter.test.ts و site/factory/tests/content-runtime-handler.test.ts و site/factory/tests/content-runtime-gateway-tail.test.ts و site/factory/tests/content-runtime-recovery-real.test.ts و PLAN.md و STATE.md.
- راستی‌آزمایی: npm run verify با کد خروج ۰؛ ۸۸ پرونده قبول و ۴ پرونده ردشده؛ ۸۷۲ آزمون قبول و ۹ آزمون ردشده؛ ۱۰۴ آزمون در ۶ پروندهٔ گام ۴ (۳۲ و ۱۹ و ۱۱ و ۳۷ و ۳ و ۲)؛ لاگ در phase2-work/step4-verify.log.
- PR #291 باز و مرج‌نشده است؛ گام ۵ پس از این بستن آغاز می‌شود.

## THG-TEAM-ARCHITECTURE-01-P2-S5: بستن گام ۵ (۴ نوامبر ۲۰۲۶، شاخهٔ feat/thg-team-phase2)
- حکم گام ۵: BLOCKED روی کنش مدیر پروژه (فعال‌سازی دوبارهٔ workflow روزانهٔ gsc-daily). هیچ کدی عوض نشد و هیچ سطری ساخته نشد.
- یافتهٔ ریشه: workflow با وضعیت disabled_manually خاموش است؛ تنها اجرای تاریخ آن در ۲۰۲۶-۱۰-۲۴ موفق بود و ۱۱ سطر صفحه و ۸ سطر پرسمان برای ۲۰۲۶-۱۰-۲۱ نوشت؛ تازه‌ترین روز پایگاه اصلی ۲۰۲۶-۱۰-۲۱ است.
- فایل‌های کامیت‌شده: PLAN.md و STATE.md.
- راستی‌آزمایی: npm run verify با کد خروج ۰؛ ۸۸ پرونده قبول و ۴ پرونده ردشده؛ ۸۷۲ آزمون قبول و ۹ آزمون ردشده.
- PR #291 باز و مرج‌نشده است؛ گام ۶ پس از این بستن آغاز می‌شود.

## THG-TEAM-ARCHITECTURE-01-P2-S6: بستن گام ۶ (۴ نوامبر ۲۰۲۶، شاخهٔ feat/thg-team-phase2)
- حکم گام ۶: بسته شد. ۸۲ سطر pending و in_progress سرنوشت گرفت (۳۴ پیشنهاد، ۴۲ کهنه، ۵ ردشده، ۱ زامبی با دلیل superseded_by_factory_migration، ۰ تکراری کارخانه). هیچ سطری اعمال نشد.
- فایل‌های مرجع: phase2-work/step6-fates.md و step6-updates.sql (اجرا نشده) و step6-qa.md.
- فایل‌های کامیت‌شده: PLAN.md و STATE.md.
- راستی‌آزمایی: npm run verify با کد خروج ۰؛ ۸۸ پرونده قبول و ۴ پرونده ردشده؛ ۸۷۲ آزمون قبول و ۹ آزمون ردشده.
- PR #291 باز و مرج‌نشده است؛ گام ۷ پس از این بستن آغاز می‌شود.
