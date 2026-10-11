# دستور اجرایی dev: افزودن /phuket-october به staticRoutes سایت‌مپ (اجرای ۲۲:۰۵، قلم «منتظر نمان»)

**یافتهٔ مبنا:** لندینگ کمپین `/phuket-october` متای درست (title سؤالی، description کمپینی، canonical خودارجاعی) و لینک داخلی دارد، ولی در `staticRoutes` سایت‌مپ نیست؛ ایندکسش به کشف اتفاقی متکی است (قانون ۲۳ دانش سئو). از تیم سئو: فقط این سند؛ به `site/` دست زده نشد؛ کامیت با هماهنگ‌کننده در فاز ۶.

## فایل هدف
`site/app/sitemap.ts` (تنها فایل)

## بخش اول: ثابت lastmod تازه (بالای فایل، کنار TOURS_LASTMOD و STATIC_LASTMOD)

اضافه شود:
```ts
const PHUKET_OCTOBER_LASTMOD = new Date("2026-10-11T00:00:00+03:30"); // انتشار لندینگ اکتبر (۱۹ مهر ۱۴۰۵؛ اولین کامیت حامل site/app/phuket-october/page.tsx: ‏e53fd9e)
```

## بخش دوم: آرایهٔ staticRoutes (درون تابع sitemap)

قبل:
```ts
const staticRoutes = ["", "/tours", "/guide", "/contact"].map((path) => ({
  url: `${base}${path}`,
  lastModified: STATIC_LASTMOD,
  changeFrequency: "weekly" as const,
  priority: path === "" ? 1 : 0.8,
}));
```

بعد:
```ts
const staticRoutes = ["", "/tours", "/guide", "/contact", "/phuket-october"].map((path) => ({
  url: `${base}${path}`,
  lastModified: path === "/phuket-october" ? PHUKET_OCTOBER_LASTMOD : STATIC_LASTMOD,
  changeFrequency: "weekly" as const,
  priority: path === "" ? 1 : 0.8,
}));
```

## سه نکتهٔ اجرایی
۱. الگوی `lastModified` شرطی، آگاهانه است: طبق کامنت بالای فایل، lastmod هر مسیر باید پایدار و معنادار باشد (یافتهٔ S1)؛ تاریخ واقعی انتشار لندینگ ۱۹ مهر ۱۴۰۵ است، نه ثابت زنده‌شدن سایت.
۲. کامنت راهنمای بالای فایل اگر به «مسیرهای استاتیک» اشاره می‌کند، یک خط به آن اضافه شود: «استثنا: /phuket-october با lastmod واقعی انتشار خودش».
۳. تعامل با S1 (ریدایرکت اسلاگ اکتبر، منتظر حکم مدیر): اگر حکم آمد، `/phuket-october` از آرایه حذف و `/phuket-october-2026` با lastmod تازه اضافه شود؛ هرگز هر دو با هم در آرایه نباشند (داپلیکیت URL).

## راستی‌آزمایی (با qa)
پس از بیلد، `/sitemap.xml` باید یک ردیف بیشتر از قبل داشته باشد (۱۴ به ۱۵) و ردیف `.../phuket-october` دارای `lastmod` با تاریخ ۲۰۲۶-۱۰-۱۱ باشد.
