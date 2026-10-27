/**
 * گالری افقی «تایلند در یک نگاه» (تغییر بصری امروز، ۲۱ مهر ۱۴۰۵).
 * اسپک: `agents/design/SPECS/gallery-thailand-gaze-home-mount-exec-2026-10-13-11.md`
 * ایمپورت واقعی آیتم رجیستری `components/carousel` (کپی: `site/components/ui/carousel.tsx`).
 *
 * حکم‌های لازم‌الاجرای design-ir (اجرا ۱۱):
 * - حکم ۴۶: تیتر «تایلند در یک نگاه» (نه «نگاه تایلند») + زیرتیتر هم‌رجیستر با هیرو.
 * - حکم ۴۷: کپشن‌ها هم‌سطح «نام مقصد + حس صحنه»؛ قاب‌های پکیجی (نام تور) حذف شدند
 *   و با قاب‌های تکی جایگزین شدند (وات‌آرون بانکوک از پیشنهاد خود حکم).
 * - حکم ۴۸: قاب اولِ غروبِ تکراری (همان عکس سکشن بعدی) حذف شد.
 * - حکم ۴۹: قاب انسانی asset آماده ندارد؛ تأمینش با content است (ثبت در گزارش، نه skeleton).
 *
 * قاعده‌های اجرایی: بدون انیمیشن خودکار؛ کلیک روی قاب کاری نمی‌کند (نمایشی)؛
 * کپشن تک‌خطی زیر قاب؛ ارقام فارسی؛ بدون لهجهٔ کهربایی؛ بدون U+2014.
 *
 * F4 (کاهش هیدریشن): این سکشن روی سرور رندر می‌شود. عرض اسلاید قبلاً با `useState`
 * و لیسنر `resize` حساب می‌شد؛ حالا همان دو مقدار با CSS می‌آید
 * (`w-[72vw] md:w-[30%]`، دقیقاً همان ۰٫۷۲ و ۰٫۳). اسکرول و snap بومی مرورگر است
 * و تنها دکمه‌های قبلی/بعدی (`GalleryArrows`) کلاینتی‌اند.
 */
import Image from "next/image";
import { GalleryArrows } from "@/components/site/GalleryArrows";

type Frame = { src: string; caption: string };

// ترتیب خوانش RTL: اولین قاب سمت راست می‌نشیند.
const FRAMES: Frame[] = [
  { src: "/images/tour-phuket-7-days.webp", caption: "پوکت؛ قایق دم‌بلند روی آب فیروزه‌ای" },
  { src: "/images/tour-bangkok-pattaya-8-days.webp", caption: "بانکوک؛ سیلوئت وات‌آرون بر کرانهٔ رود" },
  { src: "/images/tour-samui-7-days.webp", caption: "سامویی؛ خلیج آرام با نخل" },
  { src: "/images/tour-krabi-6-days.webp", caption: "کرابی؛ ساحل آرام با جزیرهٔ صخره‌ای" },
];

const TRACK_ID = "gallery-frames";

export function ThailandGazeGallery() {
  return (
    <section aria-label="گالری تایلند در یک نگاه" className="py-12">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="text-balance text-2xl sm:text-3xl">تایلند در یک نگاه</h2>
        <p className="mt-2 text-muted-foreground">یه نگاه کوتاه به جاهایی که قراره ببریمتون</p>
      </div>
      <div className="relative mt-6" role="region" aria-roledescription="carousel" aria-label="اسلایدر">
        <div
          id={TRACK_ID}
          tabIndex={0}
          className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth motion-reduce:snap-none motion-reduce:scroll-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {FRAMES.map((f) => (
            <div
              key={f.src}
              className="w-[72vw] shrink-0 snap-start px-1.5 md:w-[30%]"
              role="group"
              aria-roledescription="slide"
            >
              <figure>
                {/* Q3-05: قاب‌های گالری از next/image می‌آیند (قبلاً <img> خام اصل فایل
                    ۱۳۷KB را می‌کشید)؛ ابعاد از aspect قاب می‌آید پس CLS ندارد. */}
                <div className="relative aspect-[4/3] overflow-hidden rounded-control border border-border">
                  <Image
                    src={f.src}
                    alt={f.caption}
                    fill
                    sizes="(max-width: 767px) 72vw, 30vw"
                    className="object-cover"
                  />
                </div>
                {/* کپشن تک‌خطی زیر قاب، نه روی عکس (بریف؛ حکم ۴۷: فقط نام صحنه، بدون تفسیر) */}
                <figcaption title={f.caption} className="mt-2 truncate text-xs text-muted-foreground">{f.caption}</figcaption>
              </figure>
            </div>
          ))}
        </div>
        <GalleryArrows trackId={TRACK_ID} />
      </div>
    </section>
  );
}
