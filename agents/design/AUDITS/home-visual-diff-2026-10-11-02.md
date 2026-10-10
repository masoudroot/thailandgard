# دیف اجرایی: سه یافتهٔ ممیزی بصری صفحهٔ اصلی

**تاریخ:** ۱۹ مهر ۱۴۰۵ | **اجرای دوم ساعت ۰۲** | مبنا: `agents/design/AUDITS/home-visual-2026-10-11-02.md`

هر سه مورد خط‌به‌خط و کپی‌دقیق؛ آمادهٔ اعمال توسط dev در نوبت بعد (پس از ممیزی vibefarsi/farsiui همین اجرا). هیچ عکس و دادهٔ تازه‌ای لازم نیست.

---

## ۱) هایلایت شعار هیرو ← `Badge variant="brand"` رجیستری

**فایل:** `site/app/page.tsx` — خط‌های ۹۰ تا ۹۲

**قدیم:**
```tsx
            <span className="inline-block rounded-xl bg-brand/15 px-3 py-1.5 text-brand-foreground">
              {SITE_SLOGAN}
            </span>
```

**جدید:**
```tsx
            <Badge variant="brand" className="rounded-xl px-3 py-1.5 text-base">
              {SITE_SLOGAN}
            </Badge>
```

**چرا این‌طور:** نزدیک‌ترین آیتم رجیستری (`badge`، واریانت `brand`: همان `bg-brand/15` + `text-brand-foreground`) جای هایلایت دستی می‌نشیند؛ دو زبان بصری برای یک نقش تمام می‌شود. با `tailwind-merge`ای که dev در `cn` گذاشت، اوررایدهای `rounded-xl`/`px-3`/`py-1.5`/`text-base` روی `rounded-full`/`px-2.5`/`py-0.5`/`text-xs` پایه تمیز می‌نشینند (گوشهٔ `rounded-xl` آگاهانه نگه داشته شد: هایلایت درون‌خطی تیتر است نه نشان مستقل؛ در `DEVIATIONS.md` هم ثبت است). ایمپورت `Badge` در همین فایل هست (خط ۷).

---

## ۲) کانتینر آیکون «چرا تایلندگرد» ← بدون تغییر (تصمیم طراحی)

**فایل:** `site/app/page.tsx` — خط ۱۳۵

**حکم:** دست نمی‌خورد. بررسی شد: آیتم رجیستری مستقلی برای «کانتینر آیکون» وجود ندارد؛ الگوی فعلی (`inline-flex size-11 items-center justify-center rounded-surface bg-brand/15 text-brand-foreground`) دقیقاً از همان توکن‌های واریانت `brand` بج ساخته شده و هر چهار کارت یک‌شکل‌اند. تغییرش به چیزی «رجیستری‌تر» معنا ندارد؛ نگه‌داشتنش تصمیم آگاهانه است نه غفلت. اگر vibefarsi/farsiui در ممیزی همین اجرا آیتم نزدیک‌تری پیدا کردند، دیف به‌روز می‌شود.

---

## ۳) تلفن ثابت ← لینک `tel:` مثل موبایل

**فایل:** `site/app/page.tsx` — خط‌های ۲۱۷ تا ۲۲۰

**قدیم:**
```tsx
                <p>
                  <span className="text-muted-foreground">تلفن ثابت: </span>
                  <span dir="ltr">{PHONE_LANDLINE_DISPLAY}</span>
                </p>
```

**جدید:**
```tsx
                <p>
                  <span className="text-muted-foreground">تلفن ثابت: </span>
                  <a
                    href={PHONE_LANDLINE_LINK}
                    className="font-semibold underline underline-offset-4"
                  >
                    <span dir="ltr">{PHONE_LANDLINE_DISPLAY}</span>
                  </a>
                </p>
```

**به‌علاوه:** افزودن `PHONE_LANDLINE_LINK` به ایمپورت‌های `site/lib/site.ts` در خط‌های ۱۹ تا ۲۷ (ثابت در خط ۲۳ `site.ts` هست: `tel:+982633350139`).

**چرا این‌طور:** رفتار ناهمگون در مهم‌ترین نقطهٔ صفحه (فروش فقط تلفنی است)؛ موبایل لینک `tel:` دارد و ثابت نداشت. استایل دقیقاً همان استایل لینک موبایل (خط ۲۱۵) تا یک زبان بماند.

---

## ریسک برای مرج

پایین. مورد ۱ و ۳ فقط JSX با کامپوننت/الگوی موجود رجیستری‌اند؛ مورد ۲ هیچ تغییری ندارد. نکته برای qa: بعد از اعمال، چک شود هایلایت شعار در h1 روی موبایل نشکند و لینک تلفن ثابت واقعاً `tel:` بگیرد.
