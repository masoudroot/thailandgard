# ممیزی اسکیما | ساعت ۰۷، ۱۹ مهر ۱۴۰۵

## بخش ۱: راستی‌آزمایی سؤال پنجم FAQ راهنمای ویزا
**نتیجه: تزریق شده؛ دیفی لازم نیست.**

- سؤال «ویزای تایلند را می‌شود آنلاین گرفت؟» با پاسخ کامل در `site/lib/guides.ts` (آبجکت `thailand-visa-guide`، پنجمین آیتم `faqs`) موجود است؛ از کامیت 3794f8a (ساعت ۰۵:۳۵) روی `dev` است.
- صفحهٔ `app/guide/[slug]/page.tsx` اسکیمای FAQPage را مستقیم از `guide.faqs` می‌سازد (خط ۶۴: `"@type": "FAQPage"`)؛ پس سؤال پنجم به‌صورت خودکار در JSON-LD صفحهٔ `/guide/thailand-visa-guide` هم هست. زنجیرهٔ محتوا ← اسکیما سالم است.

## بخش ۲: اسکیمای پیشنهادی بعدی؛ BreadcrumbList
**یافته:** صفحه‌های راهنما و تور، بردکرامب بصری دارند (`<Breadcrumb>` در `app/guide/[slug]/page.tsx` و `app/tours/[slug]/page.tsx`) ولی هیچ‌کدام BreadcrumbList در JSON-LD ندارند. این اسکیمای کم‌ریسک، مسیر ناوبری را برای گوگل شفاف می‌کند.

**پیشنهاد:** افزودن گرهٔ BreadcrumbList به `@graph` صفحهٔ راهنما (قدم اول؛ صفحهٔ تور در نوبت بعد با همان الگو).

## دیف آماده برای dev (اجرای ۰۷:۳۵)

فایل: `site/app/guide/[slug]/page.tsx`: داخل `const jsonLd`، بعد از بلوک FAQPage و قبل از بسته شدن `@graph` (لنگر یکتا: خط `acceptedAnswer: { "@type": "Answer", text: stripInlineLinkMarkers(faq.answer) },`):

کد فعلی:
```tsx
      {
        "@type": "FAQPage",
        mainEntity: guide.faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: { "@type": "Answer", text: stripInlineLinkMarkers(faq.answer) },
        })),
      },
    ],
  };
```

کد تازه (فقط بلوک تازه اضافه می‌شود):
```tsx
      {
        "@type": "FAQPage",
        mainEntity: guide.faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: { "@type": "Answer", text: stripInlineLinkMarkers(faq.answer) },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "خانه", item: `${SITE_URL}/` },
          { "@type": "ListItem", position: 2, name: "راهنمای سفر", item: `${SITE_URL}/guide` },
          { "@type": "ListItem", position: 3, name: guide.title, item: `${SITE_URL}/guide/${guide.slug}` },
        ],
      },
    ],
  };
```

یادداشت: صفحهٔ ایندکس `/guide` وجود دارد (`app/guide/page.tsx`)، پس هر سه item معتبرند. بردکرامب بصری صفحه دقیقاً همین سه سطح را نشان می‌دهد (خانه ← راهنمای سفر ← عنوان راهنما)؛ اسکیما با آن یکدست است.

## بلوکر ثبت‌شده
PageSpeed واقعی بدون دامنهٔ اصلی (دست مسعود) ممکن نیست؛ پس اثر این اسکیما روی Core Web Vitals را نمی‌توان با عدد واقعی سنجید. ریسک تغییر صفر است (فقط یک `<script>` اضافه می‌شود، روی رندر اثر ندارد).
