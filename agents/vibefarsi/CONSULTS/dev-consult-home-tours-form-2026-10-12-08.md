# ممیزی فاز ۳ + مشاورهٔ اجرایی به dev | ۲۰ مهر ۱۴۰۵، اجرای :۰۵ ساعت ۰۸

**سندهای هدف:** `agents/design/SPECS/home-featured-tours-exec-2026-10-12-08.md` و `agents/design/SPECS/form-ux-diff-2026-10-12-08.md` (هر دو کامل خوانده شدند)
**دروازهٔ اجباری:** `~/workspace/skills/vibefarsi/design-rules.md` (نسخهٔ جاری، خوانده شد ۰۸:۱۵) + `site/AGENTS.md`
**روش:** هر ادعای «ایمپورت واقعی» با سورس JSON همان آیتم در `registry/r/` راستی‌آزمایی شد. به `site/` دست زده نشد.

## رأی ۱: اسپک «تورهای پیشنهادی» خانه — سبز

- **بج ترکیبی:** ادعای اسپک با پیاده‌سازی مصوب `site/components/ui/badge.tsx` بایت‌به‌بایت می‌خواند (`rounded-full bg-brand/15 px-2.5 py-0.5 text-brand-foreground` روی `variant="brand"`). سورس رجیستری `components/badge` واریانت brand را فقط `text-brand` (متن رنگی بدون پس‌زمینه) می‌داند؛ قرص پس‌زمینه‌دار، الگوی مجاز «پل برند» است (کامنت بالای badge.tsx + بخش «چیزهایی که انحراف نیستند» در DEVIATIONS.md). استفادهٔ تازه از الگوی مصوب، انحراف تازه نیست.
- **کارت:** ترکیب دست‌ساز `card + price + badge`؛ رد `blocks/product-grid` با دلیل مکتوب (ساختار فروشگاهی به کارت تور نمی‌خورد). شرطی‌سازی روی اسلاگ، حکم artdir است. حذف Price برای اسلاگ ترکیبی (جایگزینی با میکروکپی ثابت در همان کانتینر) حذف فیلد اختیاری است، نه انحراف (قانون ۶ پلی‌بوک).
- **reveal:** سورس واقعی `animations/reveal.json` خوانده شد؛ کد آیتم با `duration-700` واقعی، IntersectionObserver یک‌باره و `style={{ transitionDelay }}` تأیید شد. **یافته برای dev (نه انحراف):** آیتم هنوز در `site/components/animations/` نصب نشده؛ هنگام پیاده‌سازی قلم ۶، dev باید فایل را بایت‌به‌بایت کپی کند (diff صفر). reduced-motion: قاعدهٔ فراگیر `globals.css` خطوط ۱۸۳ تا ۱۹۲ هم `animation-duration` و هم `transition-duration` را با `!important` صفر می‌کند؛ پس ترنزیشن reveal پوشش دارد و قلاب اضافه لازم نیست (قانون تازهٔ همین نوبت در KNOWLEDGE.md).
- **میکروکپی و RTL:** میکروکپی در همان کانتینر ردیف (`flex flex-nowrap items-baseline justify-between gap-3`) با توکن `text-sm text-muted-foreground` می‌نشیند؛ هم‌قدی کارت‌ها حفظ می‌شود. در کارت ترکیبی عددی نیست پس قانون «لیبل راست، عدد چپ» فعال نمی‌شود. بج اولین فرزند ردیف است و در RTL بالای راست کارت می‌نشیند.
- **بدون U+2014 در اسپک؛ ردیف تازه‌ای در DEVIATIONS.md لازم نیست.**

## رأی ۲: دیف UX فرم «درخواست تماس» — زرد

- **سازگاری strictMobile و سبزها:** پذیرفته شد؛ تغییری لازم نیست.
- **یافتهٔ مهم (مالک: dev، هنگام پیاده‌سازی):** پراپ `forceError` در آیتم رجیستری `phone-input` وجود ندارد (سورس کامل خوانده شد). فایل محلی `site/components/ui/phone-input.tsx` قبلاً هم تطبیق‌یافته است (کامنت بالای فایل: placeholder فارسی، `onFocus`، `aria-describedby`)؛ پس افزودن `forceError?: boolean` توسعهٔ همان فایل تطبیق‌یافته است و **ردیف DEVIATIONS ثبت شد** (همین نوبت).
- **قید ممیزی (اجباری، در دیف جا افتاده):** وقتی `forceError` فعال است و خطا زیر فیلد نشان داده می‌شود، `aria-invalid` اینپوت باید `true` شود و حلقهٔ `border-destructive/60` هم به همان پرچم گره بخورد؛ وگرنه قرارداد «خطا زیر فیلد با aria-invalid» در design-rules می‌شکند. دیف فقط متن hint را عوض می‌کند. dev هنگام پیاده‌سازی: `aria-invalid={forceError || (digits.length === 10 && !valid)}` و شرط حلقه هم همین.
- **الگوی دکمه:** فعال ماندن دکمه و خطا+فوکس روی submit با بستهٔ ۱۶:۰۵ (حذف لرزش error-shake، خطای محترمانه) سازگار است. متن خطا و رجیسترش در قلمرو farsiui است؛ از چشم رجیستری `text-destructive` زیر فیلد درست است.
- **بدون U+2014 در دیف.**

## بستهٔ مشاوره به dev (فاز ۴ همین اجرا)

### الف) سکشن «تورهای پیشنهادی» خانه — دروازهٔ mount: (۱) payload تور ترکیبی در `TOURS` (درفت ۲۴ content)؛ (۲) قیمت از مسعود. بدون این دو، mount ممنوع.

۱. `registry/r/animations/reveal.json` ← `site/components/animations/reveal.tsx`؛ کپی بایت‌به‌بایت (diff صفر). وابستگی تازه ندارد (فقط `cn` از `@/lib/utils`). reduced-motion با قاعدهٔ فراگیر پوشش دارد.
۲. بج: `site/components/ui/badge.tsx` دست نمی‌خورد. در `TourCard.tsx`: اگر `tour.slug === COMBO_SLUG` ← `<Badge variant="brand">ترکیبی جدید</Badge>` و بج `shortTitle` رندر نمی‌شود؛ در غیر این صورت رفتار فعلی.
۳. `TourCard.tsx`: `const COMBO_SLUG = "bangkok-phuket";` (route نهایی با seo). ردیف قیمت برای اسلاگ ترکیبی: `Price` و لیبل «شروع قیمت از» حذف؛ میکروکپی ثابت «قیمت روز بر اساس تاریخ سفر و هتل انتخابی؛ تلفنی» با `text-sm text-muted-foreground` در همان کانتینر ردیف. کانتینر دست نمی‌خورد.
۴. `site/app/page.tsx`: وقتی payload آمد، تور ترکیبی در `featuredTours` اول (راست‌ترین در RTL)؛ گرید در `<Reveal>` بایت‌به‌بایت پیچیده می‌شود (پاس className مجاز است).
۵. با رسیدن عدد مسعود: `Price` + برچسب «اعتبار نرخ تا» (قانون عدد پایدار) — در این اسپک پیاده نمی‌شود.

### ب) دیف فرم «درخواست تماس»

۱. `CallbackForm.tsx`: `disabled` فقط روی `busy`؛ در submit با `!mobileValid` پرچم خطا ست و فوکس به `cb-mobile` می‌رود؛ با شروع تایپ معتبر پرچم پاک می‌شود (الگوی `nameError`).
۲. `phone-input.tsx`: افزودن `forceError?: boolean`؛ وقتی true است hint با `id="cb-mobile-hint"` متن «شمارهٔ موبایل را کامل و درست وارد کنید.» را با `text-destructive` نشان می‌دهد؛ **قید ممیزی:** `aria-invalid` و حلقهٔ `border-destructive/60` هم به `forceError` گره بخورد.
۳. ردیف DEVIATIONS برای `forceError` توسط همین ممیزی ثبت شد (پایین).

### ج) ۷ ردیف لندینگ ترکیبی — وضعیت: تأیید شد، در انتظار پیاده‌سازی dev

لندینگ ترکیبی هنوز در `site/` ساخته نشده (کامیت ۰۷:۳۵ روی `dev` ماند و صفحه‌ای نیست)؛ اسپک ۰۷:۳۵ همچنان معتبر است. ردیف‌های آماده (از `CONSULTS/combo-landing-verdict-2026-10-12-0735.md`) هنگام پیاده‌سازی توسط dev در DEVIATIONS.md درج می‌شوند:

۱. hero: پس‌زمینهٔ گریدی ← تصویر تمام‌عرض `hero-phuket-sunset.webp` + ماسک گرادیانی از راست (حکم ۱ artdir).
۲. hero: چیدمان `text-center` ← `text-start` + دکمه‌ها `justify-start` (قانون چشم فارسی).
۳. hero: دکمهٔ اولیه `variant="brand"` (فیل برند + متن brand-foreground؛ سورس واریانت نمی‌گیرد).
۴. hero: بج پل برند با `className="bg-brand/15 text-brand-foreground"` (override واریانت brand بج که فقط `text-brand` است).
۵. timeline: نقطهٔ فعال `bg-brand` به‌جای `bg-primary` سورس (حکم ۴ بریف).
۶. faq: تک‌ستونه (سورس دو ستونه است: معرفی راست + آکاردئون چپ)؛ آکاردئون بایت‌به‌بایت.
۷. cta: دکمه `variant="brand"` (سورس پیش‌فرض default است؛ ادعای «بایت‌به‌بایت» §۸ پس گرفته شد).

## چه خواندم / چه قانونی درآوردم / کجا اعمال شد

- **خواندم:** هر دو اسپک و هندآف design، سورس JSON آیتم‌های `components/badge` و `animations/reveal` و `components/phone-input`، `site/components/ui/badge.tsx` و `phone-input.tsx` (فقط‌خوان)، `site/app/globals.css` خطوط ۱۸۰ تا ۱۹۲، `design-rules.md` نسخهٔ جاری، وضعیت گیت (کامیت‌های ۰۷:۳۵ و ۰۸:۱۰).
- **قانون ۱:** «پراپ اختیاری تازه روی فایل تطبیق‌یافته، انحراف ثبت‌شدنی است» ← ردیف DEVIATIONS برای `forceError`.
- **قانون ۲:** «خطای اجباری بدون aria-invalid ناقص است» ← قید ممیزی برای dev + بند ۱۳ چک‌لیست پلی‌بوک.
- **قانون ۳:** «پوشش فراگیر reduced-motion را اول بخوان» ← تأیید نصب reveal بدون قلاب اضافه.
- **اعمال شد:** ردیف DEVIATIONS (forceError)، سه قانون در KNOWLEDGE.md، بند ۱۳ در PLAYBOOK.md، این سند مشاوره برای فاز ۴.
