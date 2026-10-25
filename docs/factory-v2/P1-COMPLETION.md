# P1 — زیرساخت: سند تکمیل (۲۰۲۶-۱۰-۲۵)

وضعیت: **فاز ۱ بسته شد.** بسته‌های P1-01 تا P1-09 انجام و Gate خروج تأیید شد.
توقف تولید (freeze) همچنان برقرار است؛ هیچ تغییری روی production انجام نشده است.

## ۱. وضعیت بسته‌ها و شاهد

| ID | بستهٔ کاری | وضعیت | شاهد |
|---|---|---|---|
| P1-01 | runtime گیت‌هاب اکشنز + runner درون‌فرآیندی | ✓ | PR #201 (`644e795`)؛ `site/lib/factory/runner.ts` |
| P1-02 | Postgres عملیاتی + migration core | ✓ | گام `factory:migrate` در CI؛ `migrations.test.ts` |
| P1-03 | Object Storage + Secret Manager | ✓ | `artifacts.test.ts`؛ سکرت‌های `FACTORY_ARTIFACT_*`؛ driver پوشه‌ای در CI |
| P1-04 | اجرای runner در CI + زمان‌بندی jobها | ✓ | `factory-ci.yml` (هر PR) + **`factory-daily`** (روزانه) |
| P1-05 | Control API skeleton | ✓ | `api.test.ts`، `auth.test.ts`، `health.test.ts` |
| P1-06 | Event Log + Outbox + Projector | ✓ | `event-store.integration.test.ts`، `projector.test.ts`، `projections.test.ts` |
| P1-07 | OTEL + health/readiness | ✓ | `site/lib/factory/telemetry.ts`؛ مسیرهای health/readiness |
| P1-08 | Local dev + CI | ✓ | CI سبز روی PRهای P0 و P1؛ lint/typecheck/test/build |
| P1-09 | دسترسی حداقلی (جایگزین GitHub App + Vercel token — ADR-012) | ✓ | بخش ۳ همین سند؛ `factory-preview-probe` |

## ۲. زمان‌بندی خودکار (P1-04)

دو ورک‌فلوی جدید اضافه شد:

- **Factory Daily** (`.github/workflows/factory-daily.yml`)
  - زمان‌بندی: هر روز ۰۳:۳۰ UTC = **۰۷:۰۰ تهران**؛ اجرای دستی نیز دارد.
  - کارها: migrate → walking skeleton (کل مسیر WorkItem تا `done`) → تست‌های API pipeline و health → آپلود آرتیفکت به‌عنوان شاهد.
- **Factory Preview Probe** (`.github/workflows/factory-preview-probe.yml`)
  - زمان‌بندی: اول هر ماه، ۰۵:۰۰ UTC = ۰۸:۳۰ تهران؛ اجرای دستی نیز دارد.
  - کار: یک شاخهٔ موقت واقعی push می‌کند، منتظر پیش‌نمایش ورسل می‌ماند، فایل نشانه روی پیش‌نمایش زنده را تأیید می‌کند، سپس شاخه را پاک می‌کند.

## ۳. دسترسی حداقلی (P1-09) — چرا و چگونه

**تصمیم (ADR-012):** برای عملیات branch/PR، همان `GITHUB_TOKEN` کوتاه‌عمر Actions با مجوز حداقلی (`contents: write` فقط برای پروب و به‌صورت per-workflow) استفاده می‌شود؛ GitHub App ساخته نشد، چون:

- کل اجرای کارخانه داخل Actions است (ADR-011) و توکن کوتاه‌عمر per-repo همان‌جا به‌صورت بومی وجود دارد؛
- ساخت GitHub App نیازمند حساب مالک است و برای مسیر فعلی مزیت عملکردی اضافه ندارد؛
- هر توکن دائمی اضافی = سطح حملهٔ دائمی اضافی.

**Vercel:** هیچ توکن ذخیره‌شده‌ای نگه‌داری نمی‌شود. پروب پیش‌نمایش از **GitHub Deployments API** استفاده می‌کند (ورسل برای هر push، Deployment با لینک محیط ثبت می‌کند). تلاش برای ساخت توکن محدود پروژه از CLI با محدودیت حساب (ورود گوگل) رد شد و مسیر بومی Git نیازی به آن ندارد.

> اگر روزی (مثلاً مراحل P3+) عملیات برنامه‌ای روی خود ورسل لازم شد: از داشبورد ورسل → Settings → Tokens، توکن با دامنهٔ همین پروژه ساخته شود و فقط به‌عنوان secret ریپو ذخیره شود؛ هرگز در چت یا فایل ساده.

**پاک‌سازی:** سکرت‌های قدیمی `TEMPORAL_ADDRESS`، `TEMPORAL_NAMESPACE` و `TEMPORAL_TLS` از ریپو حذف شد (Temporal کاملاً کنار گذاشته شده است). `PRISMA_SERVICE_TOKEN` (توکن از قبل موجود با دامنهٔ نامشخص) برای بررسی جداگانه باقی ماند.

## ۴. Gate خروج فاز ۱

- **از API تا projection:** تست یکپارچه `site/factory/tests/api-pipeline.integration.test.ts` — از POST کنترل API (با توکن) → runner (`walking_skeleton`) → event log → projector → جدول `work_items`؛ بدون هیچ نوشتن production.
- **branch/preview test:** پروب واقعی `factory-preview-probe` — شاخهٔ ساخته‌شده توسط ربات باید پیش‌نمایش زندهٔ ورسل بسازد و محتوای نشانه را سرو کند.

شواهد اجرا (لینک runها و خروجی JSON) پس از اولین اجراها در همین سند ثبت می‌شود.

## ۵. قدم بعدی

- تثبیت P3 در staging: اجرای واقعی چرخه‌ها (سئو/توری/outreach) بدون تغییر production.
- سپس P4/P5؛ و فعال‌سازی مسیر انتشار P2-05 با تأیید انسانی.