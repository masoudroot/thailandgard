# درفت اجرایی: هیرو + بریدکرامب + دو CTA بالای تا | صفحهٔ ستونی «تور تایلند؛ راهنمای کامل» | تیم طراحی | ساعت ۰۳ | ۱۹ مهر ۱۴۰۵

**مبنا:** وایرفریم تیم آرت‌دایرکشن (`agents/artdir/WIREFRAMES/pillar-tour-thailand-2026-10-11-03.md`)، سکشن‌های ۱ و ۲؛ بریف سئو (`agents/seo/BRIEFS/pillar-tour-thailand-2026-10-11.md`).
**دامنهٔ این درفت:** فقط بریدکرامب + هیروی متنی + دو دکمهٔ تماس بالای تا + خط متا. بقیهٔ صفحه (فهرست سؤال‌ها، بدنه، CTA میانی و پایانی، FAQ، نوار موبایل) در درفت‌های بعدی می‌آید. چیدمان دودلانه (ستون متن + ستون کناری) هم با درفت فهرست (سکشن ۳ وایرفریم) پیاده می‌شود؛ هیرو وسط‌چین می‌ماند.
**قانون سفت:** هیچ فایل `site/` در این اجرا دست نخورده؛ این سند فقط کپی‌دقیق آمادهٔ اعمال برای dev است.

## آیتم‌های رجیستری (تأییدشده از روی کد واقعی)

۱. **`breadcrumb`** از `site/components/ui/breadcrumb.tsx` با پروپ `items: Crumb[]` (هر مورد: `label` و `href` اختیاری؛ مورد آخر جاری است و جداکننده‌ها به چپ اشاره می‌کنند). با `components/breadcrumb.json` رجیستری یکسان است. بریدکرامب سه‌سطحی همین حالا در `guide/[slug]/page.tsx` هست و دست نمی‌خورد.
۲. **بلوک `hero`** از `site/components/blocks/hero.tsx` با پروپ‌های `badge/title/description/primary/secondary/proof`؛ با `blocks/hero.json` رجیستری هم‌خوان است (وسط‌چین، بج برند، تیتر `text-4xl sm:text-5xl`، دو دکمهٔ `size="lg"` با `rounded-full`).
۳. **`button`** از `site/components/ui/button.tsx`؛ واریانت‌های `default | secondary | outline | ghost | brand | destructive`، سایزهای `sm | md | lg | icon` و `asChild`. با `components/button.json` رجیستری یکسان است.
۴. **جفت CTA بالای تا** از الگوی صفحهٔ جزئیات تور (`site/app/tours/[slug]/page.tsx`، ردیف دکمه‌ها): اول «تماس با کارشناس» (`variant="brand"` با آیکون `Phone` و لینک `PHONE_MOBILE_LINK`) و دوم «درخواست مشاوره» (`variant="outline"` با لنگر `#callback`).

## انحراف‌های آگاهانه از رجیستری (ثبت‌شده، همه با دلیل)

۱. **هیروی متنی بدون قاب عکس:** حکم صریح وایرفریم؛ صفحهٔ مطالعه است نه فروش. (در خود وایرفریم هم به‌عنوان انحراف آگاهانه ثبت شده.)
۲. **ریتم فشرده‌تر از بلوک hero رجیستری:** `pt-10 sm:pt-14` و `pb-8 sm:pb-10` به‌جای `py-20 sm:py-28`. دلیل: قانون تراکم فارسی و حکم وایرفریم که هر دو دکمه باید بدون اسکرول دیده شوند.
۳. **خط متا «لیبل اول، عدد بعد»:** «زمان مطالعه: ۱۲ دقیقه» (با ارقام فارسی از تابع `fa`) به‌جای الگوی عدد-اول هدر فعلی راهنماها («۱۲ دقیقه مطالعه»). دلیل: قانون راست‌چین عدد و لیبل (لیبل راست، عدد چپ). «به‌روزرسانی: <تاریخ شمسی>» همین حالا لیبل-اول است و تغییری نمی‌کند.
۴. **بریدکرامب با «راهنمای سفر»:** به‌جای «راهنماها»ی وایرفریم، چون همین برچسب در صفحه‌های راهنمای موجود و منوی ناوبری سایت (`NAV_LINKS`) استفاده شده و یکدستی مهم‌تر از ذوق وایرفریم است.

## قرارداد داده (بدون فیلد تازه)

entry راهنمای ستونی در `GUIDES` (`site/lib/guides.ts`) با اسلاگ `thailand-tour-complete-guide` اضافه می‌شود (با تیم محتوا؛ این درفت فقط ساختار است):
- `title` همان «تور تایلند؛ راهنمای کامل» است (یک‌بار در صفحه، در همان `h1`)
- `excerpt` حداکثر ۲ خط، بدون ادعای رتبه و بدون عدد (نگارش با تیم محتوا)
- `readingMinutes` و `updatedFa` مثل بقیهٔ راهنماها
- هیچ فیلد تازه‌ای به تایپ `GUIDES` اضافه نمی‌شود

## قرارداد لنگر `#callback`

دکمهٔ «درخواست مشاوره» به `#callback` اشاره می‌کند. dev در اجرای CTA پایانی (سکشن ۸ وایرفریم)، `id="callback"` را روی همان سکشن می‌گذارد؛ بدون فرم تازه، فقط مسیر تماس تلفنی (فروش فقط تلفنی است).

---

## فایل ۱ (جدید): `site/components/blocks/pillar-hero.tsx`

```tsx
import { CalendarDays, Clock, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PHONE_MOBILE_LINK } from "@/lib/site";
import { fa } from "@/lib/utils";

export interface PillarHeroProps {
  badge: string;
  title: string;
  description: string;
  readingMinutes: number;
  updatedFa: string;
}

/**
 * هیروی متنی صفحهٔ ستونی «تور تایلند؛ راهنمای کامل».
 * ترکیب از بلوک hero رجیستری + جفت CTA صفحهٔ جزئیات تور.
 * انحراف‌های آگاهانه: بدون قاب عکس (حکم وایرفریم)، ریتم فشرده
 * (pt-10/sm:pt-14 تا هر دو CTA بالای تا دیده شوند)، خط متا
 * «لیبل اول، عدد بعد» طبق قانون راست‌چین عدد و لیبل.
 */
export function PillarHero({ badge, title, description, readingMinutes, updatedFa }: PillarHeroProps) {
  return (
    <section className="relative overflow-hidden px-6 pb-8 pt-10 text-center sm:pb-10 sm:pt-14">
      <div className="relative mx-auto max-w-3xl">
        <Badge variant="brand">{badge}</Badge>
        <h1 className="mt-5 text-4xl font-bold leading-tight sm:text-5xl">{title}</h1>
        <p className="mx-auto mt-5 max-w-xl leading-9 text-muted-foreground sm:text-lg">{description}</p>
        <div className="mt-8 flex flex-col justify-center gap-2 sm:flex-row">
          <Button asChild size="lg" variant="brand">
            <a href={PHONE_MOBILE_LINK}>
              <Phone />
              تماس با کارشناس
            </a>
          </Button>
          <Button asChild size="lg" variant="outline">
            <a href="#callback">درخواست مشاوره</a>
          </Button>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-4" aria-hidden />
            زمان مطالعه: {fa(readingMinutes)} دقیقه
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-4" aria-hidden />
            به‌روزرسانی: {updatedFa}
          </span>
        </div>
      </div>
    </section>
  );
}
```

نکته‌ها:
- `rounded-full` دکمه‌ها همان الگوی بلوک `hero` سایت است (صفحهٔ اصلی)؛ انحراف تازه نیست.
- آیکون `Phone` روی دکمهٔ اول، همان الگوی صفحهٔ جزئیات تور؛ دکمهٔ دوم بدون آیکون.
- `proof` (اثبات اجتماعی) به‌عمد نیامده؛ در صفحهٔ راهنما جایی ندارد.
- فاصلهٔ خط `leading-9` خلاصه برای خوانایی فارسی، طبق نکتهٔ تایپوگرافی وایرفریم.

## فایل ۲ (دیف): `site/app/guide/[slug]/page.tsx`

ایمپورت (افزودن یک خط بعد از ایمپورت `CallButtons`):

```diff
 import { CallButtons } from "@/components/site/CallButtons";
+import { PillarHero } from "@/components/blocks/pillar-hero";
 import { FaqBlock } from "@/components/blocks/faq";
```

جایگزینی هدر (بریدکرامب سر جایش می‌ماند):

OLD:
```tsx
      <Breadcrumb
        items={[
          { label: "خانه", href: "/" },
          { label: "راهنمای سفر", href: "/guide" },
          { label: guide.title },
        ]}
      />

      <header className="mt-6">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          <Badge variant="brand">{guide.category}</Badge>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-4" />
            {fa(guide.readingMinutes)} دقیقه مطالعه
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-4" />
            به‌روزرسانی: {guide.updatedFa}
          </span>
        </div>
        <h1 className="mt-4 text-4xl font-extrabold leading-snug">{guide.title}</h1>
        <p className="mt-4 text-lg leading-9 text-muted-foreground">{guide.excerpt}</p>
      </header>
```

NEW:
```tsx
      <Breadcrumb
        items={[
          { label: "خانه", href: "/" },
          { label: "راهنمای سفر", href: "/guide" },
          { label: guide.title },
        ]}
      />

      {guide.slug === "thailand-tour-complete-guide" ? (
        <PillarHero
          badge="راهنمای کامل"
          title={guide.title}
          description={guide.excerpt}
          readingMinutes={guide.readingMinutes}
          updatedFa={guide.updatedFa}
        />
      ) : (
        <header className="mt-6">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            <Badge variant="brand">{guide.category}</Badge>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-4" />
              {fa(guide.readingMinutes)} دقیقه مطالعه
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-4" />
              به‌روزرسانی: {guide.updatedFa}
            </span>
          </div>
          <h1 className="mt-4 text-4xl font-extrabold leading-snug">{guide.title}</h1>
          <p className="mt-4 text-lg leading-9 text-muted-foreground">{guide.excerpt}</p>
        </header>
      )}
```

---

## چک‌لیست وفاداری به وایرفریم (موارد مرتبط با این درفت)

۱. بریدکرامب سه‌سطحی با آیتم `breadcrumb` بالای صفحه است ← بدون تغییر، سر جایش.
۲. تیتر اصلی همان «تور تایلند؛ راهنمای کامل» است و فقط یک‌بار ← از `guide.title` می‌آید؛ dev موقع ثبت entry دقت کند.
۳. دو دکمهٔ تماس بالای تا، بدون اسکرول ← ریتم فشردهٔ هیرو + دکمه‌ها در همان سکشن اول.
۸. هیچ عدد قیمت، سال یا برنامهٔ پروازی بدون تاریخ به‌روزرسانی ← هیچ عدد تازه‌ای در این درفت نیست.
۹. هیچ فیلد دادهٔ تازه‌ای به تایپ `GUIDES` اضافه نشده ← فقط فیلدهای موجود پاس داده می‌شوند.
۱۰. ارقام فارسی، رجیستر «شما،» بدون خط تیرهٔ بلند، بدون تکرار بیش‌ازحد «تور تایلند» ← رعایت شده (متن دکمه‌ها و لیبل‌ها کوتاه و خنثی‌اند).

## آنچه به‌عمد در این درفت نیست

- چیدمان دودلانه (ستون کناری چسبان)؛ با درفت فهرست ۱۰ سؤال می‌آید.
- خلاصهٔ ۲خطی (excerpt)؛ نگارش با تیم محتوا پس از انتشار درفت‌های مسیر پروازی.
- سکشن `#callback`؛ با درفت CTA پایانی.
- نوار چسبان موبایل؛ درفت جداگانه.
