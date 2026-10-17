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
 * - نشان «متخصص تایلند» (۱۴۰۵/۰۷/۲۱، نبض دیزاین: «فقط تایلند» با زیرتیتر تازهٔ
 *   مسعود («ما فقط تایلند می‌بریم…») هم‌پوشانی لفظی داشت؛ تقویت ادعای h1
 *   به‌جای تکرار زیرتیتر؛ زیرتیتر دست نخورده)
 * - شهاب‌ها تک‌اجرا هستند تا با CTA رقابت نکنند
 * - زیرتیتر برند ثابت است (تصمیم مستقیم مسعود، ۱۴۰۵/۰۷/۲۰): کپسول انتخاب
 *   مقصد حذف شد چون با زیرتیتر ثابت بی‌معنا می‌شد.
 * - امضای ایرانی (۱۴۰۵/۰۷/۲۰، نبض دیزاین): خط‌حایل مویی با لوزی کهربایی
 *   + خط‌حایل مویی با لوزی کهربایی؛ نزدیک‌ترین زبان رجیستری: همان بلوک hero،
 *   بدون کامپوننت تازه. (۲۴ مهر ۱۴۰۵، به دستور مسعود: جملهٔ «آدم جواب می‌دهد، نه ربات» حذف شد.)
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
    <section className="relative overflow-hidden px-6 py-12 text-center">
      {/* D-195 (۱۴۰۵/۰۷/۲۱، نبض دیزاین): راستی بصری تازه روی شات ۱۴:۲۷: خلأ
          ~۷۰۰px قدیمی (ممیزی ۱۱:۵۰) پس از تراکم D-119 به ~۲۲۷px رسیده؛ با
          py-16/sm:py-20 ← py-12 یکدست شد تا ریتم هیرو/تورها از ~۲۲۰ به ~۱۵۰px برسد.
          امضای ایرانی دست نخورده (حکم D-008). */}
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
      {/* لنگر بصری پایدار (D-119): هالهٔ گرم ملایم پشت تیتر؛ الگوی D-001 فوتر.
          شهاب‌ها تک‌اجرا محو می‌شوند و شبکه تنها لنگر نمی‌شد؛ کپی دست مسعود
          دست نخورده، فقط تراکم عمودی جمع‌وجورتر (py-20/sm:py-28 ← py-16/sm:py-20
          ← py-12 یکدست (D-195، ۲۱ مهر ۱۴۰۵)). */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[480px]"
        style={{
          background:
            "radial-gradient(ellipse 60% 55% at 50% 30%, oklch(from var(--brand) l c h / 10%), transparent 70%)",
        }}
      />
      <Meteors count={6} once className="motion-reduce:hidden" />

      <div className="relative mx-auto max-w-3xl">
        <Reveal durationMs={200}>
          <Badge variant="brand">متخصص تایلند</Badge>
        </Reveal>

        {/* تیتر برند (تصمیم مسعود، ۲۵ مهر ۱۴۰۵): «تایلندگرد؛ مشاور شما برای
            انتخاب بهترین تور تایلند»؛ به‌جای تیتر قبلی («تایلندگرد؛ مشاورت برای
            انتخاب درست تور تایلند»). */}
        <h1 className="font-display mt-5 text-balance text-4xl leading-[1.35] sm:text-5xl">
          <BlurText text="تایلندگرد؛ مشاور شما برای انتخاب بهترین تور تایلند" delay={60} durationMs={300} />
        </h1>

        <Reveal delay={450} durationMs={200}>
          <p className="mx-auto mt-5 max-w-xl text-muted-foreground sm:text-lg">
            {/* سند برند ۱.۰: زیرتیتر تصمیم‌محور؛ بانکوک، پوکت، پاتایا یا ترکیبی —
                تفاوت مقصدها را بشناس، بعد با مشاور ما گزینه مناسب خودت را انتخاب کن. */}
            بانکوک، پوکت، پاتایا یا سفر ترکیبی؟ تفاوت مقصدها، فصل سفر و جزئیات تور را
            بشناس؛ بعد با مشاور تایلندگرد گزینه مناسب خودت را انتخاب کن.
          </p>
        </Reveal>

        <Reveal delay={800} durationMs={200} className="mt-8">
          <div className="flex flex-col items-center justify-center gap-3">
            <Button asChild size="lg" variant="brand" className="rounded-full px-7">
              <a href={phoneHref} data-call-context="hero">
                <Phone aria-hidden />
                {phoneLabel}
              </a>
            </Button>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground underline decoration-foreground/20 underline-offset-4 transition-colors duration-(--motion) hover:text-foreground"
            >
              <MessageCircle aria-hidden className="size-4" />
              یا در واتس‌اپ پیام بدهید
              <span className="sr-only"> (در تب جدید)</span>
            </a>
          </div>
        </Reveal>

        {/* امضای ایرانی: خط‌حایل مویی با لوزی + جملهٔ انسانی.
            لهجهٔ کوچکِ برند، نه تزئین اضافه (حکم برندینگ: شعارزدگی ممنوع).
            نکته (۲۴ مهر ۱۴۰۵): لوزی با text-brand-foreground (سبز عمیق)
            روی خط مویی می‌نشیند تا با پالت برند بخواند. */}
        <Reveal delay={950} durationMs={200} className="mt-10">
          <div aria-hidden className="mx-auto flex max-w-xs items-center gap-3">
            <span className="h-px flex-1 bg-foreground/10" />
            <span className="text-[10px] leading-none text-brand-foreground">◆</span>
            <span className="h-px flex-1 bg-foreground/10" />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
