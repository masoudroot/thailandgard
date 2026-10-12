"use client";

import { MessageCircle, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/animations/reveal";
import { BlurText } from "@/components/animations/blur-text";
import { Meteors } from "@/components/animations/meteors";

/**
 * هیروی خانه | بازسازی ۲۰ مهر ۱۴۰۵ با بلوک رجیستری `hero` وایب‌فارسی
 * (از MCP زنده) + نقدهای سه‌گانهٔ همان روز (فارسی‌نویسی، بصری، موشن).
 *
 * نگاشت رجیستری (ایمپورت واقعی):
 * - ساختار سکشن + شبکهٔ پس‌زمینه ← blocks/hero
 * - بارش شهاب ← animations/meteors (تک‌اجرا، accent)
 * - نشان ← components/badge (variant برند)
 * - CTA تماس ← components/button (variant برند) + آیکون Phone
 * - کپسول انتخاب مقصد ← components/segmented-control
 * - ورود پلکانی ← animations/reveal + animations/blur-text
 *
 * تصمیم‌های نقد (در کد مستند است):
 * - تگ‌لاین «تایلند را درست ببین» حذف شد (موعظه‌ای + آویزان)
 * - نشان «فقط تایلند» (تمایز، نه تکرار تیتر)
 * - شهاب‌ها تک‌اجرا هستند تا با CTA رقابت نکنند
 * - زیرتیتر برند ثابت است (تصمیم مستقیم مسعود، ۱۴۰۵/۰۷/۲۰): کپسول انتخاب
 *   مقصد حذف شد چون با زیرتیتر ثابت بی‌معنا می‌شد.
 * - امضای ایرانی (۱۴۰۵/۰۷/۲۰، نبض دیزاین): خط‌حایل مویی با لوزی کهربایی
 *   + جملهٔ انسانی زیر دکمه‌ها؛ نزدیک‌ترین زبان رجیستری: همان بلوک hero،
 *   بدون کامپوننت تازه؛ لحن خاکیِ برند («آدم جواب می‌دهد، نه ربات»)
 */
export function HeroCapsule({
  phoneHref,
  phoneLabel,
  whatsappHref,
}: {
  phoneHref: string;
  phoneLabel: string;
  whatsappHref: string;
}) {
  return (
    <section className="relative overflow-hidden px-6 py-20 text-center sm:py-28">
      {/* شبکهٔ محو از بالا | عین بلوک رجیستری hero (ماسک بازتر برای موبایل) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_80%)]"
        style={{
          backgroundImage:
            "linear-gradient(to right, oklch(from var(--foreground) l c h / 6%) 1px, transparent 1px), linear-gradient(to bottom, oklch(from var(--foreground) l c h / 6%) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <Meteors count={6} once className="motion-reduce:hidden" />

      <div className="relative mx-auto max-w-3xl">
        <Reveal durationMs={200}>
          <Badge variant="brand">فقط تایلند</Badge>
        </Reveal>

        {/* تیتر و زیرتیتر برند (تصمیم مستقیم مسعود، ۱۴۰۵/۰۷/۲۰):
            جایگزین تیتر سئومحور قبلی («تور تایلند با همسفر بلد تایلند...») شد.
            نکته: کلمهٔ کلیدی «تور تایلند» دیگر در h1 نیست؛ در title صفحه هست. */}
        <h1 className="font-display mt-5 text-4xl leading-[1.35] sm:text-5xl">
          <BlurText text="تایلند رو با متخصصش بگرد." delay={60} durationMs={300} />
        </h1>

        <Reveal delay={450} durationMs={200}>
          <p className="mx-auto mt-5 max-w-xl text-muted-foreground sm:text-lg">
            ما فقط تایلند می‌بریم؛ همین یک کشور رو مثل کف دست می‌شناسیم تا خیالت راحت باشه.
          </p>
        </Reveal>

        <Reveal delay={800} durationMs={200} className="mt-8">
          <div className="flex flex-col items-center justify-center gap-3">
            <Button asChild size="lg" variant="brand" className="rounded-full px-7">
              <a href={phoneHref} data-call-context="hero">
                <Phone />
                {phoneLabel}
              </a>
            </Button>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground underline decoration-foreground/20 underline-offset-4 transition-colors hover:text-foreground"
            >
              <MessageCircle className="size-4" />
              یا در واتس‌اپ پیام بدهید
            </a>
          </div>
        </Reveal>

        {/* امضای ایرانی: خط‌حایل مویی با لوزی کهربایی + جملهٔ انسانی.
            لهجهٔ کوچکِ برند، نه تزئین اضافه (حکم برندینگ: شعارزدگی ممنوع) */}
        <Reveal delay={950} durationMs={200} className="mt-10">
          <div aria-hidden className="mx-auto flex max-w-xs items-center gap-3">
            <span className="h-px flex-1 bg-foreground/10" />
            <span className="text-[10px] leading-none text-brand-foreground">◆</span>
            <span className="h-px flex-1 bg-foreground/10" />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            اینجا یک آدم جواب می‌دهد، نه ربات
          </p>
        </Reveal>
      </div>
    </section>
  );
}
