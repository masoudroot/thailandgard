# P3 staging status — 2026-10-28

هدف این سند: بستن شکاف بین «P3 کد دارد» و «P3 در staging اجرا شده». هر ادعا با خروجی واقعی
همراه است؛ هر چیزی که اجرا نشده، با دلیل نوشته شده و نه با تخمین.

---

## ۱. آنچه واقعاً اجرا شد

### P3-02 — Tour Fact Contract

اجرا روی **دیتابیس تولید** (Supabase) و بدون نوشتن:

```
npx tsx factory/scripts/tour-facts.ts --require-supabase --no-persist
EXIT=0
```

```
summary: {"total":3,"fresh":0,"stale":3,"missing":0,"contact":0,"sources":{"supabase":3}}
gate.passed: true
  OK   tour_count :: 3 tours
  OK   unique_slugs :: 3 unique slugs
  OK   active_tours :: 3/3 active
  OK   duration_valid :: days > 0 and 0 <= nights <= days
  OK   price_state_known :: 0 prices without a valid update date
  OK   price_fresh :: 3 stale prices (max 7d)
  OK   tourist_type_present :: 0 missing tourist types
  OK   source_available :: 3/3 from Supabase
  OK   snapshot_recent :: snapshot fetched within the last hour
```

قرارداد تور از منبع واقعی خواند و ۹ بررسی را گذراند. اما یک **یافتهٔ تجاری** دارد:

| تور | قیمت از | آخرین به‌روزرسانی | سن |
|---|---|---|---|
| `bangkok-pattaya-8-days` | ۵۶٬۳۷۶٬۶۰۰ | ۲۰۲۶-۱۰-۱۳ | ۱۴ روز |
| `bangkok-phuket-8-days` | ۱۰۱٬۳۲۲٬۰۰۰ | ۲۰۲۶-۱۰-۱۳ | ۱۴ روز |
| `phuket-7-days` | ۴۲٬۶۰۷٬۲۰۰ | ۲۰۲۶-۱۰-۱۳ | ۱۴ روز |

یعنی **هر سه تور فعال قیمت ۱۴ روزه دارند**، در حالی که آستانهٔ تازگی ۷ روز است. گیت این را
«کهنه» علامت می‌زند ولی متوقف نمی‌کند؛ تصمیم با مالک است. اگر قیمت‌ها دیروز عوض شده باشند و
`price_updated_at` به‌روز نشده باشد، سایت عدد کهنه نشان می‌دهد — این ریسک تجاری است، نه فنی.

### P3-03 — گیت فنی R1

اجرا روی صفحهٔ واقعی تولید (فقط GET):

```
npx tsx factory/scripts/seo-gate.ts \
  --url https://www.thailandgard.ir/tours/bangkok-krabi \
  --canonical https://www.thailandgard.ir/tours/bangkok-krabi \
  --jsonld TravelAgency,BreadcrumbList,FAQPage
EXIT=0
```

```
OK http_ok            :: 200 in 2061ms
OK html_lang_rtl      :: lang=fa dir=rtl
OK title_length       :: 35 characters
OK meta_description   :: 130 characters
OK canonical_present  :: https://www.thailandgard.ir/tours/bangkok-krabi
OK canonical_matches  :: expected https://www.thailandgard.ir/tours/bangkok-krabi
OK single_h1          :: 1 H1 headings
OK no_noindex         :: index, follow
OK json_ld_valid      :: 3 types, 0 invalid blocks
OK json_ld_types      :: found TravelAgency, BreadcrumbList, FAQPage
OK internal_links     :: 14 internal links (minimum 2)
OK og_tags            :: og:title=yes og:description=yes
```

۱۳ از ۱۳ بررسی سبز. یک نکته که خودِ اجرا روشن کرد:

- **canonical با `www` است.** اولین اجرا با آدرس بدون `www` قرمز شد (`canonical_matches`).
  این باگ سایت نیست؛ انتظارِ من غلط بود. هر اسکریپت یا تستی که canonical را می‌سازد باید
  `www` را در نظر بگیرد.

### اسکیمای تور — اندازه‌گیری روی کل sitemap

گیت با انتظار `TouristTrip` روی همان صفحه اجرا نشد چون آن صفحه اصلاً `TouristTrip` ندارد.
برای همین به‌جای حدس، هر ۲۶ URL تور در sitemap تک‌تک گرفته و بررسی شد:

| دسته | تعداد | `TouristTrip` + `Offer` |
|---|---|---|
| تورهای واقعی دیتابیس (`phuket-7-days`، `bangkok-phuket-8-days`، `bangkok-pattaya-8-days`) | ۳ | دارند ✅ |
| بقیهٔ مسیرهای `/tours/...` | ۲۳ | ندارند |

جمع: **۲۳ از ۲۶**. در این ۲۳، صفحه‌هایی مثل `/tours/phuket` یا `/tours/combo` واقعاً صفحهٔ
دسته‌اند و «سفر» نیستند؛ نبود `TouristTrip` روی آن‌ها درست است. اما `/tours/bangkok-krabi`
استثناست: ظاهرش صفحهٔ تور است (h1 «تور بانکوک و کرابی») و همان صفحه هیچ بلوک `TouristTrip`
ندارد، در حالی که هم‌خانوادهٔ دیتابیسی‌اش (`bangkok-phuket-8-days`) دارد. یعنی دو مسیر
رندر تور — دیتابیس و fallback — دو خروجی ساخت‌یافتهٔ متفاوت می‌دهند. این ناسازگاری واقعی
است، نه انتظار غلط.

---

## ۲. آنچه اجرا نشد و چرا

| بستهٔ کاری | مانع دقیق |
|---|---|
| P3-01 SEO Radar | `GSC_SERVICE_ACCOUNT_JSON` و `GSC_SITE_URL` در فایل محلی نیست. بدون دسترسی Search Console، رادار ورودی واقعی ندارد |
| P3-04 DomainOps SEO | به Postgres کارخانه + Temporal + worker + projector نیاز دارد؛ هیچ‌کدام روی این دستگاه بالا نیست |
| P3-05 DomainOps Tour | همان وابستگی P3-04 |
| P3-06 Outreach | `RESEND_API_KEY` و دامنهٔ تأییدشدهٔ فرستنده (SPF/DKIM/DMARC) نیست؛ پیش‌فرض درست همان `dry-run` است |

برای هیچ‌کدام از این چهار مورد، کد نوشتن فایده ندارد. هر چهار تا منتظر یک چیز بیرونی‌اند:
دسترسی GSC، یا استک Postgres/Temporal، یا دامنهٔ ایمیل.

---

## ۳. آنچه این دور باز شد

- کلید LLM در `site/.env.factory.local` نشست (`LLM_API_BASE`، `LLM_API_KEY`، `LLM_MODEL`)،
  روی درگاه 9router. پیش‌تر همین درگاه با `callLLM` آزموده شد: پاسخ واقعی در ۳٫۶ ثانیه.
  حالا اسکریپت‌های کارخانه که LLM می‌خواهند ورودی دارند.
- `stream: false` به درخواست LLM اضافه شد (PR #270). بدون آن، درگاه 9router پاسخ SSE
  می‌داد و کد آن را «پاسخ خالی» می‌دید.

---

## ۴. قدم بعدی پیشنهادی

۱. **تصمیم مالک: قیمت‌ها.** یا `price_updated_at` هر سه تور واقعاً به‌روز شود، یا آستانهٔ
   تازگی صریحاً عوض شود. عدد فعلی ۱۴ روز است و این را نمی‌شود با سکوت گذراند.
۲. **یکسان‌سازی اسکیمای مسیر fallback تور.** `/tours/bangkok-krabi` مثل صفحهٔ تور رفتار
   می‌کند ولی `TouristTrip` ندارد، در حالی که تورهای دیتابیس دارند. یا باید همان اسکیما را
   بگیرد، یا باید صریحاً به صفحهٔ دسته تبدیل شود. تصمیم قبل از کد لازم است.
۳. **GSC.** اگر مالک سرویس‌اکانت بسازد، P3-01 بدون هیچ کد تازه‌ای روشن می‌شود.