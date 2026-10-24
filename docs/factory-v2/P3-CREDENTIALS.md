# P3 Credentials — چه چیزی، از کجا، کجا وارد شود

این سند فقط برای فاز P3 (SEO Radar + Tour Facts + R1 Gate + DomainOps + Outreach) است.
هیچ مقدار secret را در چت، issue، commit یا فایل tracked نگذارید.

## ۰) فرم محلی (ساده‌ترین راه)

به‌جای ساختن دستی فایل، از فرم استفاده کنید:

```powershell
cd "C:\Users\Masoud Akbari\AppData\Local\Temp\opencode\thailandgard-site\site"
npm run factory:credentials
```

سپس `http://127.0.0.1:4317` را باز کنید. فرم فیلدهای لازم را می‌پرسد، فایل
JSON سرویس‌اکانت GSC را خودش به base64 تبدیل می‌کند، فایل
`site/.env.factory.local` را می‌سازد و در صورت تمایل worker/projector را
ری‌استارت می‌کند. هیچ secretی در لاگ چاپ نمی‌شود.

## ۱) جای محلی

فایل زیر را بسازید (در `.gitignore` هست و commit نمی‌شود):

```text
site/.env.factory.local
```

اسکریپت‌های P3، worker و projector این فایل را خودشان load می‌کنند. اگر از
PowerShell اجرا می‌کنید، لازم نیست `$env:` دستی بزنید. مقادیر از قبل موجود در
محیط override نمی‌شوند. بعد از هر تغییر در این فایل، worker و projector را
restart کنید.

نمونهٔ ساختار فایل (مقدارها را جایگزین کنید):

```dotenv
# --- Supabase (برای GSC، Tour Facts، SEO Radar) ---
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY

# --- Google Search Console ---
GSC_SERVICE_ACCOUNT_JSON=BASE64_OF_SERVICE_ACCOUNT_JSON
GSC_SITE_URL=sc-domain:thailandgard.ir

# --- LLM (برای intel-daily و planner) ---
LLM_API_BASE=https://api.openai.com/v1
LLM_API_KEY=YOUR_LLM_API_KEY

# --- R1 technical SEO gate ---
# local: http://localhost:3001
# staging: https://YOUR-PREVIEW.vercel.app
FACTORY_PREVIEW_BASE_URL=http://localhost:3001

# --- Factory (local؛ قبلاً هم استفاده شده) ---
FACTORY_ENV=local
FACTORY_DATABASE_URL=postgres://factory:factory@127.0.0.1:5433/factory
FACTORY_CONTROL_TOKEN=factory-local-control-token-0123456789
FACTORY_EVIDENCE_SECRET=factory-local-evidence-secret-0123456789
TEMPORAL_ADDRESS=127.0.0.1:7233
TEMPORAL_NAMESPACE=default
TEMPORAL_TLS=false
FACTORY_TASK_QUEUE=factory-orchestration

# --- Artifact storage (s3rver محلی) ---
FACTORY_ARTIFACT_ENDPOINT=http://127.0.0.1:9000
FACTORY_ARTIFACT_REGION=us-east-1
FACTORY_ARTIFACT_BUCKET=factory-artifacts
FACTORY_ARTIFACT_ACCESS_KEY_ID=S3RVER
FACTORY_ARTIFACT_SECRET_ACCESS_KEY=S3RVER

# --- اختیاری: SERP (اگر GSC کافی نیست) ---
# SERPAPI_API_KEY=YOUR_SERPAPI_KEY

# --- اختیاری: Outreach واقعی (پیش‌فرض dry-run است) ---
# FACTORY_OUTREACH_LIVE=false
# RESEND_API_KEY=YOUR_RESEND_KEY
# FACTORY_OUTREACH_FROM_EMAIL=hello@thailandgard.ir
# FACTORY_OUTREACH_UNSUBSCRIBE_BASE=https://thailandgard.ir/unsubscribe
```

## ۲) جای GitHub Actions

مسیر:

```text
GitHub → Repository → Settings → Secrets and variables → Actions → New repository secret
```

همان نام‌های بالا را اضافه کنید. workflowهای موجود `gsc-daily.yml` و
`intel-daily.yml` از قبل همین نام‌ها را می‌خوانند؛ اگر secretها از قبل ست شده‌اند،
دوباره نسازید.

حداقل secretهای لازم برای P3:

| نام | لازم؟ | توضیح |
|---|---|---|
| `SUPABASE_URL` | بله | URL پروژهٔ Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | بله | کلید service_role؛ فقط سرور |
| `GSC_SERVICE_ACCOUNT_JSON` | بله | base64 کل فایل JSON سرویس‌اکانت |
| `GSC_SITE_URL` | بله | `sc-domain:thailandgard.ir` |
| `LLM_API_BASE` | بله | آدرس سازگار با OpenAI |
| `LLM_API_KEY` | بله | کلید LLM |
| `FACTORY_PREVIEW_BASE_URL` | بله | URL پیش‌نمایش برای R1 gate |
| `SERPAPI_API_KEY` | اختیاری | فقط اگر SERP جدا می‌خواهید |
| `FACTORY_OUTREACH_LIVE` | اختیاری | فقط بعد از تأیید صریح `true` شود |
| `RESEND_API_KEY` | اختیاری | فقط برای ارسال واقعی outreach |
| `FACTORY_OUTREACH_FROM_EMAIL` | اختیاری | فرستندهٔ outreach |
| `FACTORY_OUTREACH_UNSUBSCRIBE_BASE` | اختیاری | endpoint واقعی unsubscribe |

برای اجرای workflowهای SEO/Tour، پنج متغیر `FACTORY_ARTIFACT_*` هم لازم است
(endpoint، region، bucket، access key، secret key). در local با s3rver و در
staging با S3/R2 پر می‌شوند.

## ۳) Supabase — از کجا بگیریم

1. وارد Supabase Dashboard شوید.
2. پروژهٔ سایت را انتخاب کنید.
3. `Project Settings → API`.
4. مقدار `Project URL` را در `SUPABASE_URL` بگذارید.
5. مقدار `service_role` (نه `anon`) را در `SUPABASE_SERVICE_ROLE_KEY` بگذارید.

هشدار: `service_role` همهٔ RLS را دور می‌زند. هرگز آن را در
`NEXT_PUBLIC_*` یا کد کلاینت نگذارید.

## ۴) Google Search Console — ساخت service account

1. `console.cloud.google.com` → یک پروژه بسازید یا انتخاب کنید.
2. `APIs & Services → Library` → `Google Search Console API` را Enable کنید.
3. `IAM & Admin → Service Accounts → Create service account`.
4. یک نام بدهید (مثلاً `factory-gsc-reader`) و Create.
5. روی سرویس‌اکانت → `Keys → Add key → Create new key → JSON` → دانلود.
6. فایل JSON را base64 کنید.

PowerShell:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\path\to\service-account.json"))
```

خروجی را در `GSC_SERVICE_ACCOUNT_JSON` بگذارید.

7. در Search Console → `Settings → Users and permissions → Add user`.
8. ایمیل سرویس‌اکانت (`...@....iam.gserviceaccount.com`) را اضافه کنید.
9. دسترسی `Full` یا حداقل دسترسی خواندن property را بدهید.
10. `GSC_SITE_URL` را دقیقاً مطابق property بگذارید:
    - Domain property: `sc-domain:thailandgard.ir`
    - URL-prefix property: `https://thailandgard.ir/`

## ۵) LLM

اگر سیستم قبلی (`intel-daily` / `planner`) از قبل کار می‌کند، همان
`LLM_API_BASE` و `LLM_API_KEY` را از GitHub secrets بردارید و در فایل محلی
بگذارید. در غیر این صورت از provider سازگار با OpenAI یک API key بسازید.

## ۶) R1 Technical SEO Gate

`FACTORY_PREVIEW_BASE_URL` آدرس سایتی است که gate آن را crawl می‌کند:

- local: `http://localhost:3001` (بعد از `npm run dev`)
- staging: URL پیش‌نمایش Vercel
- production: فقط بعد از تأیید صریح cutover

## ۷) Outreach (P3-06)

پیش‌فرض `dry-run` است. برای ارسال واقعی:

1. دامنهٔ فرستنده را در Resend تأیید کنید (SPF/DKIM/DMARC).
2. `RESEND_API_KEY` و `FACTORY_OUTREACH_FROM_EMAIL` را ست کنید.
3. `FACTORY_OUTREACH_UNSUBSCRIBE_BASE` را به یک endpoint واقعی unsubscribe وصل کنید.
4. `FACTORY_OUTREACH_LIVE=true` را فقط بعد از تأیید صریح ست کنید.
5. لیست suppression و unsubscribe باید قبل از اولین ارسال تست شود.

## ۸) چه چیزی را در چت نفرستید

- کلید Supabase
- فایل JSON سرویس‌اکانت
- API keyهای LLM/SERP/Resend
- token گیت‌هاب

فقط بگویید «در فایل محلی گذاشتم» یا «در GitHub secrets ست شد». خودم وجود
متغیرها را بدون چاپ مقدارشان بررسی می‌کنم.
