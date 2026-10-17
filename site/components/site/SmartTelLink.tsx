"use client";

import * as React from "react";
import { clarityEvent } from "@/lib/clarity";
import { isWithinWorkingHours } from "@/lib/working-hours";

/**
 * لینک تلفن ساعت‌آگاه (قلم ۳ اسپک موبایل تور ترکیبی، ۲۱ مهر ۱۴۰۵؛ یافتهٔ ۴۴ تحلیل).
 * دوسوم کلیک‌های تماسِ ۲۴ ساعت گذشته نیمه‌شب و خارج از ساعت کاری به تلفن
 * بی‌پاسخ خورده بود؛ پس در خارج از ساعت کاری این لینک شماره‌گیری نمی‌کند و
 * به‌جایش نرم به فرم ‎#callback‎ اسکرول می‌کند تا نیت (فرم) حفظ شود.
 * داخل ساعت کاری رفتار عادی (شماره‌گیری مستقیم) است.
 */
export function SmartTelLink({
  href,
  callContext,
  className,
  children,
  ref,
}: {
  href: string;
  callContext: string;
  className?: string;
  children: React.ReactNode;
  /** برای سازگاری با Button asChild (رادیکس Slot) */
  ref?: React.Ref<HTMLAnchorElement>;
}) {
  function onClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (isWithinWorkingHours()) return;
    e.preventDefault();
    clarityEvent("tel_outside_hours_redirect", { context: callContext });
    // صفحهٔ تماس فاز ۵: فرم «contact-form»؛ صفحات قدیمی‌تر «callback».
    const form =
      document.getElementById("contact-form") ?? document.getElementById("callback");
    if (form) form.scrollIntoView({ behavior: "smooth", block: "start" });
    // پیام «خارج از ساعت کاری» بالای فرم برای صفحه‌خوان‌ها فوکس می‌شود
    const notice =
      document.getElementById("contact-hours-notice") ??
      document.getElementById("callback-hours-notice");
    if (notice) {
      notice.setAttribute("tabindex", "-1");
      notice.focus({ preventScroll: true });
    }
  }
  return (
    <a ref={ref} href={href} onClick={onClick} className={className} data-call-context={callContext}>
      {children}
    </a>
  );
}
