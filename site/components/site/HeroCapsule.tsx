"use client";

import * as React from "react";
import { MessageCircle, Phone } from "lucide-react";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Reveal } from "@/components/animations/reveal";
import { BlurText } from "@/components/animations/blur-text";
import { Button } from "@/components/ui/button";

/**
 * کپسول عملیاتی هیرو (دستور اجرایی design، ۲۰ مهر ۱۴۰۵؛ اسپک
 * hero-capsule-exec-2026-10-12-12 با نقدهای ۱ تا ۵ artdir).
 * نسخهٔ تایپوگرافیک (بدون عکس)؛ بوم آرام گرافیتی؛ ساختار بخش از blocks/hero.
 *
 * نگاشت رجیستری (ایمپورت واقعی):
 * - کپسول انتخاب مقصد ← components/segmented-control
 * - CTA تماس ← components/button (variant برند) + آیکون Phone
 * - انیمیشن ورود کپسول ← animations/reveal (مدت طبق توکن --motion)
 * - تیتر ← animations/blur-text
 *
 * قاعدهٔ «ترتیب ورود» (نقد ۲): تیتر با blur-text می‌آید و کپسول با reveal و
 * تأخیر نزدیک؛ همپوشانی ورود حداکثر ۱۰۰ میلی‌ثانیه. قاب/بوم ساکت است.
 * نقد ۱: «تایلند را درست ببین» میکروکپی کمکی زیرتیتر است، نه تیتر.
 * نقد ۴: شمارهٔ تماس CTA ثابت است؛ انتخاب مقصد فقط پیشنهاد زیرتیتر را عوض می‌کند.
 *
 * زیرتیترها پیشنهاد devاند؛ متن نهایی با تیم محتوا.
 */
const DESTINATIONS = [
  {
    value: "bangkok",
    label: "بانکوک",
    suggestion: "سه شب بانکوک کافی است؛ معابد و بازار شناور را با گشت فارسی‌زبان ببینید.",
  },
  {
    value: "phuket",
    label: "پوکت",
    suggestion: "پنج شب پوکت؛ ساحل، جزیره‌گردی و غروب فنگ‌نا.",
  },
  {
    value: "pattaya",
    label: "پاتایا",
    suggestion: "دو شب پاتایا؛ ساحل جومتین و واکینگ استریت، دو ساعت تا بانکوک.",
  },
  {
    value: "combo",
    label: "ترکیبی",
    suggestion: "هشت روز بانکوک و پوکت؛ شهر و ساحل در یک سفر، با پرواز داخلی.",
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

  return (
    <section className="px-6 pt-14 sm:pt-20">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="font-display text-4xl sm:text-5xl">
          <BlurText text="همسفر بلد در تایلند" delay={90} />
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-muted-foreground sm:text-lg">
          {active.suggestion}
        </p>
        <p className="mt-2 text-sm text-muted-foreground/80">تایلند را درست ببین</p>

        {/* کپسول انتخاب مقصد؛ ورود با reveal و تأخیر نزدیک به تیتر */}
        <Reveal delay={420} className="mt-8 duration-(--motion)">
          <SegmentedControl
            options={DESTINATIONS.map((d) => ({ value: d.value, label: d.label }))}
            value={destination}
            onChange={(v) => setDestination(v as DestinationValue)}
            aria-label="انتخاب مقصد"
            className="max-w-full"
          />
        </Reveal>

        <div className="mt-8 flex flex-col items-center justify-center gap-2 sm:flex-row">
          <Button asChild size="lg" variant="brand" className="rounded-full px-7">
            <a href={phoneHref}>
              <Phone />
              {phoneLabel}
            </a>
          </Button>
          <Button asChild size="lg" variant="outline" className="rounded-full px-7">
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
              <MessageCircle />
              مشاوره در واتس‌اپ
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
