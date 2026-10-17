"use client";
/**
 * ناوبری چسبان هاب تورها (بخش ۳ وایرفریم hub.html): چیپ‌های بخش‌ها + دکمهٔ مشاوره.
 * بعد از کارت‌های خانواده می‌چسبد؛ اسکرول‌اسپای با IntersectionObserver چیپ
 * بخش فعال را هایلایت می‌کند.
 * نزدیک‌ترین معادل رجیستری: blocks/navbar (نسخهٔ ساده‌شدهٔ تک‌صفحه‌ای با
 * چیپ‌های انکر)؛ چیپ‌ها با الگوی Badge/ui و دکمه با Button/ui ساخته شدند.
 */
import { useEffect, useState } from "react";
import { Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const CHIPS = [
  { id: "hub-themes", label: "حال‌وهوای سفر" },
  { id: "hub-cities", label: "شهرها" },
  { id: "hub-combo", label: "ترکیبی" },
  { id: "hub-all", label: "همه تورها" },
];

export function HubStickyNav({ callHref }: { callHref: string }) {
  const [active, setActive] = useState<string>("");
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: "-35% 0px -55% 0px" },
    );
    for (const chip of CHIPS) {
      const el = document.getElementById(chip.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);
  return (
    <div className="sticky top-0 z-40 border-y border-border bg-background/95 backdrop-blur">
      <nav
        aria-label="بخش‌های صفحهٔ تور تایلند"
        className="mx-auto flex max-w-6xl items-center gap-2 overflow-x-auto px-6 py-3"
      >
        {CHIPS.map((chip) => (
          <a
            key={chip.id}
            href={`#${chip.id}`}
            aria-current={active === chip.id ? "true" : undefined}
            className={cn(
              "shrink-0 rounded-full border px-4 py-1.5 text-sm transition-colors duration-200",
              active === chip.id
                ? "border-brand bg-brand/15 font-semibold text-brand-foreground"
                : "border-border text-muted-foreground hover:border-brand/60 hover:text-foreground",
            )}
          >
            {chip.label}
          </a>
        ))}
        <Button asChild size="sm" variant="brand" className="ms-auto shrink-0 rounded-full">
          <a href={callHref} data-call-context="hub-sticky-nav">
            <Phone aria-hidden />
            مشاوره رایگان
          </a>
        </Button>
      </nav>
    </div>
  );
}
