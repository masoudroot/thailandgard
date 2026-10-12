"use client";

import * as React from "react";
import { MessageCircle, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
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
 * - زیرتیتر min-height دارد تا تعویض مقصد چیدمان را نپراند
 * - امضای ایرانی (۱۴۰۵/۰۷/۲۰، نبض دیزاین): خط‌حایل مویی با لوزی کهربایی
 *   + جملهٔ انسانی زیر دکمه‌ها؛ نزدیک‌ترین زبان رجیستری: همان بلوک hero،
 *   بدون کامپوننت تازه؛ لحن خاکیِ برند («آدم جواب می‌دهد، نه ربات»)
 */
const DESTINATIONS = [
  {
    value: "bangkok",
    label: "بانکوک",
    suggestion: "سه شب بانکوک کافی است؛ معابد و بازار شناور با گشت فارسی‌زبان.",
  },
  {
    value: "phuket",
    label: "پوکت",
    suggestion: "پنج شب پوکت؛ ساحل، جزیره‌گردی و غروب خلیج فانگ‌نگا.",
  },
  {
    value: "pattaya",
    label: "پاتایا",
    suggestion: "دو شب پاتایا؛ ساحل جومتین و واکینگ استریت، دو ساعتی بانکوک.",
  },
  {
    value: "combo",
    label: "بانکوک و پوکت",
    suggestion: "هشت روز بانکوک و پوکت؛ شهر و ساحل در یک سفر. پرواز داخلی هم دارد.",
  },
] as const;

type DestinationValue = (typeof DESTINATIONS)[number]["value"];

export function HeroCapsule({
  phoneHref,
  phoneLabel,
  whatsappHref,
}: {
  phoneHref: string;
  phoneLabel: string;
  whatsappHref: string;
}) {
  const [destination, setDestination] = React.useState<DestinationValue>("combo");
  const active = DESTINATIONS.find((d) => d.value === destination) ?? DESTINATIONS[3];
  const capsuleWrap = React.useRef<HTMLDivElement>(null);

  // موبایل (۳۶۰px): گزینهٔ فعال (مثل «بانکوک و پوکت») ممکن است بیرون دید باشد؛
  // آن را به مرکز اسکرولر بیاور. فقط محور افقی؛ صفحه عمودی نمی‌پرد.
  React.useEffect(() => {
    const btn = capsuleWrap.current?.querySelector<HTMLElement>(
      `[data-value="${CSS.escape(destination)}"]`,
    );
    btn?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [destination]);

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

        <h1 className="font-display mt-5 text-4xl leading-[1.35] sm:text-5xl">
          <BlurText text="همسفر بلد تایلند" delay={60} durationMs={300} />
        </h1>

        <Reveal delay={450} durationMs={200}>
          <p
            key={destination}
            className="mx-auto mt-5 max-w-xl text-muted-foreground sm:text-lg min-h-[3.75rem] sm:min-h-[4.25rem] animate-[fade-swap_200ms_ease-out]"
          >
            {active.suggestion}
          </p>
        </Reveal>

        {/* کپسول انتخاب مقصد؛ اسکرول افقی در موبایل تا قیچی نشود.
            تب فعال پس‌زمینهٔ کرم پررنگ دارد (یافتهٔ M6 ممیزی ۱۶:۳۰) تا خواننده
            بفهمد کدام مقصد را می‌خواند */}
        <Reveal delay={650} durationMs={200} className="mt-8">
          <div ref={capsuleWrap} className="mx-auto max-w-full overflow-x-auto pb-1">
            <SegmentedControl
              options={DESTINATIONS.map((d) => ({ value: d.value, label: d.label }))}
              value={destination}
              onChange={(v) => setDestination(v as DestinationValue)}
              aria-label="انتخاب مقصد"
              className="w-max min-w-full [&>span[aria-hidden]]:bg-[color-mix(in_oklch,var(--brand)_26%,var(--background))] [&>span[aria-hidden]]:ring-brand/50"
            />
          </div>
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
