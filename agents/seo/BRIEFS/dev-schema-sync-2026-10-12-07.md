# بریف اجرایی dev؛ همگام‌سازی اسکیما (نوبت ۰۷، ۲۰ مهر ۱۴۰۵)

## قانون واحد (قانون ۳۷)

**اسکیما = آینهٔ دادهٔ نمایشی صفحه.** هر موجودیت یا ویژگی‌ای که در HTML دیده می‌شود (تاریخ به‌روزرسانی، فهرست آیتم‌ها، مسیر ناوبری) باید معادل ساخت‌یافته‌اش در JSON-LD باشد؛ و هیچ فیلد اسکیما نباید از حدس، متن قدیمی یا منبع دیگر تغذیه شود. همهٔ دیف‌های زیر از همان آبجکت‌هایی می‌خوانند که صفحه رندر می‌کند (`getGuides()`، `getTours()`)، پس با دیتابیس همگام‌اند (دستور مدیر ۱۴۰۵/۰۷/۱۹، بند ۴).

## اسکن همهٔ صفحه‌ها (۲۰ مهر ۱۴۰۵، ساعت ۰۷)

| صفحه | وضعیت اسکیما |
|------|---------------|
| `/` | ItemList تورها ✅ |
| `/tours/[slug]` | TouristTrip + FAQPage + BreadcrumbList ✅ (قیمت عمداً حذف شده؛ سندش در کد هست) |
| `/guide/[slug]` | Article + FAQPage + BreadcrumbList ✅ ولی Article ناقص (یافتهٔ ۱) |
| `/phuket-october` | FAQPage ✅ |
| لی‌اوت سراسری | TravelAgency ✅ (priceRange/openingHours/sameAs نداریم؛ حدس ممنوع، اضافه نمی‌شود) |
| `/guide` (ایندکس) | ❌ هیچ اسکیمایی ندارد (یافتهٔ ۲) |
| `/tours` (ایندکس) | ❌ هیچ اسکیمایی ندارد (یافتهٔ ۳) |
| `/contact` | ❌ ندارد؛ اولویت پایین (TravelAgency لی‌اوت اطلاعات تماس را پوشش می‌دهد) |

## یافتهٔ ۱: Article راهنماها تاریخ و ناشر ندارد

در `app/guide/[slug]/page.tsx` اسکیمای Article فقط headline/description/inLanguage/url/mainEntityOfPage دارد. ولی صفحه در HTML «به‌روزرسانی: {guide.updatedFa}» را نشان می‌دهد (خط ۱۴۱)؛ پس طبق قانون ۳۷ باید `dateModified` ساخت‌یافته هم داشته باشد. `datePublished` داده نداریم (نه در DB، نه در فالبک) پس عمداً نمی‌آید. `author` و `publisher` هم خالی‌اند.

### دیف ۱

۱. در `lib/jalali.ts` هلپر تازه (پارس «۱۹ مهر ۱۴۰۵» با ارقام فارسی + `JALALI_MONTHS` + `toGregorian` موجود):

```ts
export function updatedFaToIso(updatedFa: string): string | null {
  const m = updatedFa.replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d)).match(/(\d+)\s+(\S+)\s+(\d+)/);
  if (!m) return null;
  const jm = JALALI_MONTHS.indexOf(m[2]) + 1;
  if (!jm) return null;
  const g = toGregorian(Number(m[3]), jm, Number(m[1]));
  const p = (n: number) => String(n).padStart(2, "0");
  return `${g.getFullYear()}-${p(g.getMonth() + 1)}-${p(g.getDate())}`;
}
```

۲. در `app/guide/[slug]/page.tsx` به آبجکت Article اضافه شود:

```ts
const dateModified = updatedFaToIso(guide.updatedFa);
// در Article:
...(dateModified ? { dateModified } : {}),
author: { "@type": "Organization", name: s.SITE_NAME, url: s.SITE_URL },
publisher: {
  "@type": "Organization",
  name: `${s.SITE_NAME} (${s.SITE_LATIN})`,
  url: s.SITE_URL,
  telephone: s.PHONE_MOBILE_LINK.replace("tel:", ""),
},
```

نکته: `datePublished` عمداً نیست (داده نداریم)؛ `logo` برای publisher نیست (فایل لوگو در `public/` وجود ندارد؛ حدس ممنوع).

## یافتهٔ ۲: ایندکس راهنماها اسکیما ندارد

`app/guide/page.tsx` کارت‌های راهنماها را با عنوان، خلاصه، دسته و تاریخ به‌روزرسانی رندر می‌کند ولی هیچ JSON-LD ندارد.

### دیف ۲

در `app/guide/page.tsx` (بعد از `const guides = await getGuides();`):

```tsx
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "راهنمای سفر تایلند",
  itemListElement: guides.map((guide, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: guide.title,
    url: `${SITE_URL}/guide/${guide.slug}`,
  })),
};
// در return، بالای <main>:
<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
```

## یافتهٔ ۳: ایندکس تورها اسکیما ندارد

`app/tours/page.tsx` از `getTours()` رندر می‌شود ولی JSON-LD ندارد. (صفحهٔ خانه ItemList خودش را دارد؛ هر صفحه باید خودکفا باشد.)

### دیف ۳

در `app/tours/page.tsx` (بعد از `const tours = await getTours();`):

```tsx
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "تورهای تایلند",
  itemListElement: tours.map((tour, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: tour.title,
    url: `${SITE_URL}/tours/${tour.slug}`,
  })),
};
// در return، بالای ریشه:
<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
```

## تست پذیرش (qa)

۱. بیلد موفق؛ در HTML رندرشدهٔ `/guide/[slug]` بلوک Article باید `dateModified` به فرمت `YYYY-MM-DD`، `author` و `publisher` داشته باشد.
۲. در HTML `/guide` و `/tours` بلوک `ItemList` با همان تعداد آیتمِ کارت‌های صفحه باشد (نه بیشتر، نه کمتر).
۳. هیچ اسکیمایی در هیچ صفحه‌ای نباید فیلدی داشته باشد که در HTML همان صفحه دیده نمی‌شود (تست قانون ۳۷).
۴. اعتبارسنجی نهایی با Rich Results Test گوگل (دستی، پس از دپلوی).
