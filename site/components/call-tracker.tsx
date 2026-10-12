"use client";

import { useEffect } from "react";

/**
 * ردیاب تماس (قفل ۵ موتور رشد): شنوندهٔ سراسری کلیک روی لینک‌های tel:.
 * هیچ PII جمع نمی‌کند؛ فقط «کدام شماره»، «کدام صفحه» و «از کدام کانال».
 * ارسال با sendBeacon است تا ترک صفحه، ثبت را از دست ندهد.
 */

/** کلید first-touch در localStorage (هندآف تحلیل ۲۰ مهر ۱۴۰۵)؛ همان قرارداد CallbackForm. */
const FIRST_TOUCH_KEY = "tg_first_touch";

interface FirstTouch {
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
  utm_term: string;
  landing: string;
  saved_at: string;
}

function readFirstTouch(): FirstTouch | null {
  try {
    const raw = window.localStorage.getItem(FIRST_TOUCH_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<FirstTouch>;
    return {
      utm_source: p.utm_source ?? "",
      utm_medium: p.utm_medium ?? "",
      utm_campaign: p.utm_campaign ?? "",
      utm_content: p.utm_content ?? "",
      utm_term: p.utm_term ?? "",
      landing: p.landing ?? "",
      saved_at: p.saved_at ?? "",
    };
  } catch {
    return null;
  }
}

/** ساخت source سه‌بخشی «کانال|صفحه|کمپین» طبق قرارداد SOURCE-TRACKING.md (همان منطق CallbackForm). */
function buildSource(): string {
  const params = new URLSearchParams(window.location.search);
  let utmMedium = (params.get("utm_medium") || "").toLowerCase();
  let utmCampaign = params.get("utm_campaign") || "none";
  // اگر این صفحه UTM نداشت، ورودی اول (first-touch) را از localStorage بردار؛
  // یعنی اگر کاربر از صفحه‌ای بدون UTM روی tel: کلیک کرد، مقدار ورودی اول حفظ می‌شود.
  if (!params.get("utm_source") && !params.get("utm_medium") && !params.get("utm_campaign")) {
    const ft = readFirstTouch();
    if (ft) {
      utmMedium = ft.utm_medium.toLowerCase();
      utmCampaign = ft.utm_campaign || "none";
    }
  }

  let channel = "direct";
  const ref = document.referrer;
  if (utmMedium.includes("cpc") || utmMedium.includes("paid") || utmMedium === "ad") channel = "ad";
  else if (/google\.|bing\.com|duckduckgo\./.test(ref)) channel = "organic";
  else if (ref) channel = "referral";

  const page = window.location.pathname.replace(/^\//, "") || "home";
  return `${channel}|${page}|${utmCampaign}`;
}

export function CallTracker() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest?.('a[href^="tel:"]') as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute("href") ?? "";
      if (!href.startsWith("tel:")) return;
      try {
        navigator.sendBeacon(
          "/api/track-call",
          JSON.stringify({
            href: href.slice(0, 64),
            page: window.location.pathname.slice(0, 128),
            source: buildSource().slice(0, 128),
          }),
        );
      } catch {
        /* ردیابی هرگز تجربهٔ کاربر را نمی‌شکند */
      }
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
