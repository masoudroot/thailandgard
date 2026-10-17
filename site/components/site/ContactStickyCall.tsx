"use client";

import * as React from "react";
import { Phone } from "lucide-react";
import { SmartTelLink } from "./SmartTelLink";

/**
 * دکمهٔ تماس چسبان (وایرفریم /contact، سکشن ۸): فقط موبایل، پایین صفحه،
 * همیشه دیده می‌شود مگر وقتی فرم تماس در دید است تا روی آن نیفتد.
 * شماره از تنظیمات سایت (دیتابیس) می‌آید، نه هاردکد.
 */
export function ContactStickyCall({
  telHref,
  telDisplay,
}: {
  telHref: string;
  telDisplay: string;
}) {
  const [overForm, setOverForm] = React.useState(false);

  React.useEffect(() => {
    const form = document.getElementById("contact-form");
    if (!form) return;
    const io = new IntersectionObserver(
      ([entry]) => setOverForm(entry.isIntersecting),
      { threshold: 0.15 },
    );
    io.observe(form);
    return () => io.disconnect();
  }, []);

  if (overForm) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur md:hidden">
      <SmartTelLink
        href={telHref}
        callContext="contact-sticky"
        className="flex h-12 w-full items-center justify-center gap-2.5 rounded-control bg-[var(--brand-deep)] text-base font-semibold text-[var(--brand-deep-foreground)] shadow-control active:shadow-press"
      >
        <Phone aria-hidden className="size-5" />
        زنگ بزنید
        <span dir="ltr" className="text-sm font-normal opacity-90">
          {telDisplay}
        </span>
      </SmartTelLink>
    </div>
  );
}
