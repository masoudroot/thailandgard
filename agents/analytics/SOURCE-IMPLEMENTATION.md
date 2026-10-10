# پیاده‌سازی قرارداد ثبت منبع لید | تیم تحلیل | ۱۹ مهر ۱۴۰۵ | اجرای دوم ساعت ۰۲

**وضعیت ساعت ۰۲:۵۵:** `leads_stats()` همچنان آرایهٔ خالی برمی‌گرداند — هشتمین روز متوالی صفر لید. پایپلاین PostgREST سالم است. این سند، دیف دقیق پیاده‌سازی قرارداد `SOURCE-TRACKING.md` است تا وقتی ترافیک آمد، dev همان نوبت اعمال کند و qa تست بگیرد. (اجرا با dev است؛ این تیم فقط مشخصات می‌دهد.)

## وضع فعلی کد

- `site/components/site/CallbackForm.tsx` خط ۳۳: `source: "site-form"` هاردکد است — قالب قرارداد (`کانال|صفحه|کمپین`) را ندارد.
- `site/app/api/callback/route.ts` خط ۲۴: فالبک `source` هم `"site-form"` است.

## دیف ۱: `CallbackForm.tsx` — ساخت source سه‌بخشی در کلاینت

**قدیم (خط ۳۳):**
```tsx
body: JSON.stringify({ name: name.trim(), mobile, tourSlug, source: "site-form" }),
```

**جدید:** بالای کامپوننت (کنار `submit`) این تابع اضافه شود:
```tsx
/** ساخت source سه‌بخشی «کانال|صفحه|کمپین» طبق قرارداد SOURCE-TRACKING.md */
function buildSource(tourSlug?: string): string {
  const params = new URLSearchParams(window.location.search);
  const utmMedium = (params.get("utm_medium") || "").toLowerCase();
  const utmCampaign = params.get("utm_campaign") || "none";

  let channel = "direct";
  const ref = document.referrer;
  if (utmMedium.includes("cpc") || utmMedium.includes("paid") || utmMedium === "ad") channel = "ad";
  else if (/google\.|bing\.com|duckduckgo\./.test(ref)) channel = "organic";
  else if (ref) channel = "referral";

  const page = tourSlug ? `tour/${tourSlug}` : window.location.pathname.replace(/^\//, "") || "home";
  return `${channel}|${page}|${utmCampaign}`;
}
```
و در `submit`:
```tsx
body: JSON.stringify({ name: name.trim(), mobile, tourSlug, source: buildSource(tourSlug) }),
```

**نکته‌ها:** کامپوننت `"use client"` است پس `window`/`document` در دسترس‌اند. `utm_source` عمداً در کانال استفاده نشد تا منطق ساده بماند (قرارداد سه utm را برای لینک‌ها می‌خواهد؛ `utm_campaign` همان‌جا خوانده می‌شود).

## دیف ۲: `route.ts` — فالبک سالم به‌جای `"site-form"`

**قدیم (خط ۲۴):**
```ts
const source = typeof body.source === "string" ? body.source : "site-form";
```

**جدید:**
```ts
const rawSource = typeof body.source === "string" ? body.source : "";
const source = rawSource.includes("|") ? rawSource : "unknown|unknown|none";
```

**چرا:** قاعدهٔ «خالی نماندن» قرارداد — اگر کلاینت قدیمی یا دستی مقداری خارج از قالب فرستاد، به‌جای رشتهٔ بی‌قالب، `unknown` ثبت می‌شود تا گزارش ساعت ۰۲ هشدار کیفیت بدهد نه خطا.

## تست qa (پس از اعمال)

۱. ثبت با referrer گوگل → `source` باید `organic|tour/<slug>|none` باشد.
۲. ثبت با `?utm_medium=cpc&utm_campaign=summer1405` → `ad|tour/<slug>|summer1405`.
۳. ثبت دستی بدون source → `unknown|unknown|none` در دیتابیس (تست روی JSONL محلی، نه `leads` پروداکشن).
۴. مقدارهای قدیمی (`site-form`) دست نخورند (بازخوانی تاریخچه ممنوع).

## اثر بر گزارش ساعت ۰۲

با این پیاده‌سازی، اولین گزارش «تحلیل منبع لیدها» از همان روز اول ترافیک سه تفکیک کانال/صفحه/کمپین را دارد. تا آن روز، این سند در صف dev می‌ماند؛ بلوکر نیست چون ترافیکی نیست.
