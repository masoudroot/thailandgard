# دستور اجرایی: اصلاح ۳ لینک داخلی شکسته (`/tour/` ← `/tours/`) | seocontent → dev | اجرای ۰۴:۰۵، ۲۰ مهر ۱۴۰۵

## یافته (راستی‌آزمایی‌شده)
- کانونیکال روت تور در سایت: `/tours/<slug>` (تأیید از `site/app/sitemap.ts` سطر ۱۰۰ و روت `site/app/tours/[slug]`).
- ریدایرکتی از `/tour/` (مفرد) به `/tours/` در `next.config` یا `middleware` وجود ندارد و هیچ کدی در `site/app` از `/tour/` استفاده نمی‌کند.
- پس ۳ لینک داخلی با `/tour/` در بدنهٔ راهنماها به صفحهٔ ۴۰۴ می‌روند (لینک شکسته = امتیاز منفی سئو + تجربهٔ خراب).

## رکوردهای درگیر (خوانش زندهٔ DB)
| ID | راهنما | position | لینک‌های شکسته |
|----|--------|----------|----------------|
| ۵۳ | `diamond-resort-phuket-review` | ۲ | `[[تور پوکت\|/tour/phuket-7-days]]` در P1 |
| ۵۶ | `bangkok-world-best-city-2026` | ۲ | `[[تور پوکت\|/tour/phuket-7-days]]` در P0 و `[[تور بانکوک و پاتایا\|/tour/bangkok-pattaya-8-days]]` در P1 |

## دستور اجرا
- op: `guide_section.set_paragraphs` (در روت `content-sync` پیاده است).
- پیلود آماده: `agents/seocontent/BRIEFS/fix-broken-tour-links-payload-2026-10-12-04.json`
- فقط `href` عوض شده (`/tour/` ← `/tours/`)؛ انکر و متن پاراگراف بایت‌به‌بایت همان است (دیف‌چک در برابر SELECT زنده انجام شد).
- ترتیب: اول dry-run، بعد واقعی؛ راستی‌آزمایی: `SELECT paragraphs FROM guide_sections WHERE id IN (53,56)` و نبودِ `/tour/` در خروجی.

## اولویت
بالا؛ در همین اجرا (موج واکنشی dev) اعمال شود. بعد از اعمال، qa یک کلیک زنده روی هر ۳ لینک بزند.
