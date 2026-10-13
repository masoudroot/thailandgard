import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * بلوک «کجا برویم؟» (اسپک `agents/design/SPECS/where-to-go-exec-2026-10-13-12.md`).
 * نزدیک‌ترین آیتم رجیستری: `blocks/blog-grid` (فایل `site/components/blocks/blog-grid.tsx`
 * بایت‌به‌بایت از رجیستری می‌ماند؛ انحراف‌ها این‌جا و در `agents/vibefarsi/DEVIATIONS.md`
 * بستهٔ ۱۲ ثبت‌اند):
 *  ۱. متادیتای مقاله حذف (بج دسته/«X دقیقه»/آواتار نویسنده/تاریخ)؛ کارت مقصد است نه مقاله.
 *  ۲. زوم هاور حذف (۵۰۰ms از سقف تم)؛ هاور فقط تیره‌تر شدن قاب مویی با `duration-(--motion)`.
 *  ۳. لینک روی h3 حذف؛ لینک متنی فلش‌دار در انتهای کارت با `mt-auto`.
 *  ۴. لینک «همه‌ی مطالب» سربرگ آیتم حذف (دستور F-3 وایب‌فارسی؛ بلوک مقصد است نه بلاگ).
 * حکم ۵۲ design-ir: کاور هر سه کارت از فایل‌های تور/گالری نیست (سه‌بارگی قاب)؛
 * تا تأمین کاور واقعی با content، هر سه قاب تایپوگرافیک (`bg-frame-typographic`؛
 * حکم ۵۶؛ الگوی جای‌نگه‌دار `tours/[slug]/page.tsx`) با موتیف «حرف اول» aria-hidden.
 * حکم‌های ۵۳/۵۴/۵۵: توصیف‌های زیر موقت‌اند (جهت‌های design-ir)؛ متن نهایی با content.
 */
interface Destination {
  name: string;
  /** حرف نمایشی قاب تایپوگرافیک (تزئینی، aria-hidden). */
  initial: string;
  /** توصیف موقت؛ متن نهایی با content (حکم‌های ۵۳/۵۴/۵۵). */
  blurb: string;
  href: string;
  linkLabel: string;
}

const DESTINATIONS: Destination[] = [
  {
    name: "بانکوک",
    initial: "ب",
    // حکم ۵۳: جهت design-ir (نه متن نهایی)؛ گرته‌های «شهری که خواب ندارد» و
    // «خیابان‌هایی پر از زندگی» حذف شدند. متن نهایی با content.
    blurb: "شهری که شبش هم تعطیل نیست؛ معبدهای طلایی، بازارهای روی آب و خیابان‌های پرجنب‌وجوش.",
    href: "/tours/bangkok-pattaya-8-days",
    linkLabel: "برنامهٔ سفر بانکوک",
  },
  {
    name: "پوکت",
    initial: "پ",
    // حکم ۵۴: جهت design-ir (نه متن نهایی)؛ «آن‌ها که عجله ندارند» حذف شد.
    blurb: "ساحل‌های آرام و دریای فیروزه‌ای؛ جزیره‌ای برای اهل بی‌عجله‌ها.",
    href: "/tours/phuket-7-days",
    linkLabel: "برنامهٔ سفر پوکت",
  },
  {
    name: "پاتایا",
    initial: "پ",
    // حکم ۵۵: فقط یک خط (خانوادگی)؛ «شب‌های زنده» حذف شد چون با «تفریح
    // خانوادگی» در یک جمله دو سیگنال متضاد می‌فرستاد. انتخاب خط با content.
    blurb: "ساحل نزدیک بانکوک؛ تفریح خانوادگی و جزیرهٔ مرجان.",
    href: "/tours/bangkok-pattaya-8-days",
    linkLabel: "برنامهٔ سفر پاتایا",
  },
];

/** ترتیب DOM = ترتیب دیداری راست‌به‌چپ: بانکوک (راست) ← پوکت ← پاتایا (چپ). */
export function DestinationCards({ className }: { className?: string }) {
  return (
    <section aria-label="کجا برویم؟" className={cn("px-6 py-12", className)}>
      {/* D-245 (۱۴۰۵/۰۷/۲۱، نبض دیزاین): py-16 ← py-12؛ هم‌ریتم با HeroCapsule پس از تراکم D-195
          (هیرو py-12، سکشن تورها py-8؛ این سکشن شل‌ترینِ صفحه بود). راستی بصری در ممیزی بعدی. */}
      <div className="mx-auto max-w-5xl">
        <h2 className="text-balance text-2xl sm:text-3xl">کجا برویم؟</h2>
        <ul className="mt-8 grid gap-6 md:grid-cols-3">
          {DESTINATIONS.map((d) => (
            <li key={d.name} className="h-full">
              <article className="flex h-full flex-col overflow-hidden rounded-control border border-border bg-card transition-colors duration-(--motion) hover:border-foreground/30">
                {/* قاب تایپوگرافیک (حکم ۵۲/۵۶): بدون عکس قرضی؛ موتیف حرف اول تزئینی. */}
                <div className="flex aspect-[16/10] select-none items-center justify-center border-b border-border bg-frame-typographic">
                  <span aria-hidden="true" className="font-display text-7xl text-foreground/15">
                    {d.initial}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="text-lg font-semibold">{d.name}</h3>
                  {/* نکتهٔ نبض دیزاین (D-272، ۱۴۰۵/۰۷/۲۱): خلاصه با line-clamp-2 حداکثر ۲ خط نشان می‌دهد؛
                      اندازه‌گیری با وزیرمتن ۱۴px روی پهنای واقعی کارت: هر سه متن فعلی در ۲ خط جا می‌شوند
                      (بانکوک لب‌مرز، خط دومش تقریباً پر است). متن نهایی content هم باید در همین حد بماند،
                      وگرنه وسط جمله بریده می‌شود. */}
                  <p className="mt-2 line-clamp-2 text-sm leading-7 text-muted-foreground">{d.blurb}</p>
                  <Link
                    href={d.href}
                    className="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-medium text-foreground underline decoration-foreground/30 underline-offset-4 transition-[text-decoration-color] duration-200 hover:decoration-foreground"
                  >
                    {d.linkLabel}
                    <ArrowLeft aria-hidden className="size-4" />
                  </Link>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
