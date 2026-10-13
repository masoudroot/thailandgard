"use client";

import * as React from "react";
import { PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Alert } from "@/components/ui/alert";
import { LoadingDots } from "@/components/animations/loading-dots";
import { WHATSAPP_LINK, PHONE_MOBILE_LINK } from "@/lib/site";
import { clarityEvent } from "@/lib/clarity";
import { isWithinWorkingHours, nextCallbackDayName, callbackSlotLabel } from "@/lib/working-hours";

/** کلید first-touch در localStorage (هندآف تحلیل ۲۰ مهر ۱۴۰۵). */
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

/** ساخت source سه‌بخشی «کانال|صفحه|کمپین» طبق قرارداد SOURCE-TRACKING.md */
function buildSource(tourSlug?: string): string {
  const params = new URLSearchParams(window.location.search);
  let utmMedium = (params.get("utm_medium") || "").toLowerCase();
  let utmCampaign = params.get("utm_campaign") || "none";
  // اگر این صفحه UTM نداشت، ورودی اول (first-touch) را از localStorage بردار؛
  // یعنی اگر کاربر از صفحه‌ای بدون UTM فرم را فرستاد، مقدار ورودی اول حفظ می‌شود.
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

  const page = tourSlug ? `tour/${tourSlug}` : window.location.pathname.replace(/^\//, "") || "home";
  return `${channel}|${page}|${utmCampaign}`;
}

/** فرم «درخواست تماس»: نام + موبایل، با اعتبارسنجی ایرانی. */
export function CallbackForm({
  tourSlug,
  tourTitle,
  contactName,
}: {
  tourSlug?: string;
  tourTitle?: string;
  /** نام کارشناس مقصد؛ از تنظیمات سایت (دیتابیس) می‌آید */
  contactName: string;
}) {
  const [name, setName] = React.useState("");
  const [mobile, setMobile] = React.useState("");
  const [mobileValid, setMobileValid] = React.useState(false);
  const [nameError, setNameError] = React.useState<string | undefined>();
  // دیف UX فرم ۲۰ مهر ۱۴۰۵: دکمه دیگر با موبایل نامعتبر غیرفعال نمی‌شود؛
  // روی submit با موبایل نامعتبر این پرچم ست می‌شود و فوکس به فیلد موبایل می‌رود (الگوی nameError).
  const [mobileForceError, setMobileForceError] = React.useState(false);
  const [status, setStatus] = React.useState<"idle" | "busy" | "done" | "error">("idle");
  const [serverError, setServerError] = React.useState("");
  // قلم ۱ لید (زمان ترجیحی تماس): بدون انتخاب = رشتهٔ خالی؛ سرور بدون کلید هم سازگار است.
  const [callTime, setCallTime] = React.useState("");
  const statusAlertRef = React.useRef<HTMLDivElement>(null);
  // بستهٔ اندازه‌گیری کلریتی (تحلیل ۱۷ مهر): هر فیلد فقط یک‌بار «شروع»
  const startedFieldsRef = React.useRef<Set<string>>(new Set());
  const extra = React.useMemo(() => ({ tourSlug }), [tourSlug]);
  const trackFieldStart = React.useCallback(
    (field: string) => {
      if (startedFieldsRef.current.has(field)) return;
      startedFieldsRef.current.add(field);
      clarityEvent("callback_field_start", { ...extra, field });
    },
    [extra],
  );
  // ساعت‌آگاهی فقط کلاینت‌ساید: در useEffect تا رندر استاتیک (prerender) نشکند.
  // پیش‌فرض null = نسخهٔ داخل ساعت کاری (فقط تا hydrate؛ پیام موفقیت فقط پس از ثبت و روی کلاینت دیده می‌شود).
  const [withinHours, setWithinHours] = React.useState<boolean | null>(null);
  React.useEffect(() => {
    setWithinHours(isWithinWorkingHours());
    clarityEvent("callback_view", { tourSlug });
  }, [tourSlug]);
  // first-touch (هندآف تحلیل ۲۰ مهر): اگر ورود با UTM بود، همان‌جا ذخیره شود تا
  // فرم در صفحه‌ای بدون UTM هم منبع ورودی اول را نگه دارد.
  React.useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const hasUtm = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].some(
        (k) => params.get(k),
      );
      if (!hasUtm) return;
      window.localStorage.setItem(
        FIRST_TOUCH_KEY,
        JSON.stringify({
          utm_source: params.get("utm_source") || "",
          utm_medium: params.get("utm_medium") || "",
          utm_campaign: params.get("utm_campaign") || "",
          utm_content: params.get("utm_content") || "",
          utm_term: params.get("utm_term") || "",
          landing: window.location.pathname,
          saved_at: new Date().toISOString(),
        } satisfies FirstTouch),
      );
    } catch {
      // localStorage در دسترس نیست؛ منبع همان «direct» می‌ماند
    }
  }, []);
  const outsideHours = withinHours === false;

  // پس از «ثبت شد» یا خطای سرور، فوکس به پیام وضعیت می‌رود (مدیریت فوکس)
  React.useEffect(() => {
    if (status === "done" || status === "error") statusAlertRef.current?.focus();
  }, [status]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    clarityEvent("callback_submit_attempt", { tourSlug });
    if (name.trim().length < 2) {
      // حکم ۵ برندینگ: خطا «چرا» را هم می‌گوید، نه فقط امر.
      setNameError("نام را کامل وارد کنید؛ بدون نام نمی‌توانیم با شما تماس بگیریم.");
      clarityEvent("callback_validation_fail", { ...extra, field: "name" });
      return;
    }
    if (!mobileValid) {
      setMobileForceError(true);
      document.getElementById("cb-mobile")?.focus();
      clarityEvent("callback_validation_fail", { ...extra, field: "mobile" });
      return;
    }
    setStatus("busy");
    setServerError("");
    let statusCode = 0;
    try {
      const res = await fetch("/api/callback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          mobile,
          tourSlug,
          source: buildSource(tourSlug),
          ...(callTime ? { preferredCallTime: callTime } : {}),
        }),
      });
      statusCode = res.status;
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "خطا");
      setStatus("done");
      clarityEvent("callback_submit_success", { tourSlug });
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "یک بار دیگر تلاش کنید؛ درخواستتان ثبت نشد.");
      setStatus("error");
      clarityEvent("callback_server_error", { ...extra, code: statusCode > 0 ? String(statusCode) : "network" });
    }
  }

  if (status === "done") {
    return (
      <Alert ref={statusAlertRef} tabIndex={-1} variant="success" title="درخواستتان ثبت شد">
        {outsideHours ? (
          <>
            {/* حکم ۱۶ design-ir: قول «روز معلوم» به‌جای «روز کاری بعد»؛ نام روز
                با همان منطق isWithinWorkingHours (جمعه‌شب ← شنبه) و بازهٔ
                پیش‌فرض «بین ۹ تا ۱۲»، مگر بازهٔ انتخابی خود کاربر. */}
            درخواستتان ثبت شد. {nextCallbackDayName()} {callbackSlotLabel(callTime)} زنگ می‌زنیم. اگر عجله دارید،{" "}
            <a href={WHATSAPP_LINK} className="underline" target="_blank" rel="noopener noreferrer">
              در واتس‌اپ پیام بدهید
            </a>
            .
          </>
        ) : (
          // حکم ۷ برندینگ: «ممنون؛» اضافی حذف شد (تیتر Alert همان را می‌گوید).
          "امروز در ساعت کاری (۹ صبح تا ۹ شب) با شما تماس می‌گیریم. اگر عجله دارید، مستقیم زنگ بزنید."
        )}
      </Alert>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {/* پیام ساعت‌کاری بالای فرم (حکم ۱۶/۱۷/۱۸ design-ir): در خارج ساعت، اول
          «چرا» (رفتار دکمهٔ تلفنی بی‌توضیح «ترفند» خوانده می‌شود)، بعد قول
          «روز معلوم»، بعد لینک واتس‌اپ به‌عنوان راه «الان». بالای فرم است تا
          با اسکرولِ خارج‌ساعتِ لینک‌های tel: بی‌درنگ دیده شود.
          یافتهٔ لید (نیمه‌شب SSR): تا hydrate نشده، پیام خنثی بدون «امروز»
          است تا قولِ دروغِ نیمه‌شب داده نشود. */}
      <p id="callback-hours-notice" className="text-sm text-muted-foreground">
        {outsideHours ? (
          <>
            الان خارج از ساعت کاری هستیم و کسی پشت خط نیست. شماره‌تان را بگذارید؛{" "}
            {nextCallbackDayName()} {callbackSlotLabel(callTime)} زنگ می‌زنیم. اگر عجله دارید،{" "}
            <a href={WHATSAPP_LINK} className="underline" target="_blank" rel="noopener noreferrer">
              در واتس‌اپ پیام بدهید
            </a>
            .
          </>
        ) : withinHours === null ? (
          "با ثبت این فرم، در ساعت کاری (۹ صبح تا ۹ شب) با شما تماس می‌گیریم."
        ) : (
          "با ثبت این فرم، امروز در ساعت کاری (۹ صبح تا ۹ شب) با شما تماس می‌گیریم."
        )}
      </p>
      <Field label="نام و نام خانوادگی" htmlFor="cb-name">
        <Input
          id="cb-name"
          autoComplete="name"
          value={name}
          onFocus={() => trackFieldStart("name")}
          onChange={(e) => {
            setName(e.target.value);
            if (nameError && e.target.value.trim().length >= 2) setNameError(undefined);
          }}
          placeholder="مثلاً سارا محمدی"
          aria-invalid={nameError ? true : undefined}
          aria-describedby={nameError ? "cb-name-error" : undefined}
        />
        {nameError && (
          <p id="cb-name-error" className="text-xs text-destructive">
            {nameError}
          </p>
        )}
      </Field>
      <Field label="شمارهٔ موبایل" htmlFor="cb-mobile">
        <PhoneInput id="cb-mobile" forceError={mobileForceError} onFocus={() => trackFieldStart("mobile")} onChange={(digits, valid) => { setMobile(digits); setMobileValid(valid); if (mobileForceError && valid) setMobileForceError(false); }} />
      </Field>
      {/* خط اطمینان (دستور تیزشدهٔ لید، ۱۹ مهر ۱۴۰۵): کاهش‌دهندهٔ ریسک با بافت
          مثبت (چه می‌شود، نه چه نمی‌شود)؛ رجیستر «شما»؛ بدون واژهٔ منفی. */}
      <p className="text-sm text-muted-foreground">
        شماره‌تان فقط برای همین تماس برگشتی استفاده می‌شود؛ کارشناس مقصد در روز کاری (شنبه تا پنجشنبه، ۹ صبح تا ۹ شب) با شما تماس می‌گیرد.
      </p>
      {/* قلم ۱ لید (۱۹ مهر): «زمان ترجیحی تماس»؛ اختیاری، هیچ گزینه‌ای پیش‌فرض نیست؛
          fieldset/legend + رادیوهای بومی برای دسترس‌پذیری صفحه‌کلید؛ ارقام فارسی؛ رجیستر «شما». */}
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">چه ساعتی با شما تماس بگیریم؟</legend>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: "morning", label: "صبح (۹ تا ۱۲)" },
            { value: "midday", label: "ظهر (۱۲ تا ۱۵)" },
            { value: "afternoon", label: "عصر (۱۵ تا ۱۸)" },
            { value: "evening", label: "شب (۱۸ تا ۲۱)" },
          ].map((o) => (
            <label
              key={o.value}
              className={
                "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors " +
                (callTime === o.value ? "border-brand bg-brand/10" : "border-border")
              }
            >
              <input
                type="radio"
                name="cb-call-time"
                value={o.value}
                checked={callTime === o.value}
                onChange={() => {
                  setCallTime(o.value);
                  trackFieldStart("call-time");
                }}
                className="size-4 accent-[var(--brand)]"
              />
              {o.label}
            </label>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">اختیاری است؛ اگر انتخاب نکنید، در ساعت کاری با شما تماس می‌گیریم.</p>
      </fieldset>
      {status === "error" && (
        <Alert ref={statusAlertRef} tabIndex={-1} variant="destructive" title="مشکلی پیش آمد">
          {serverError} اگر عجله دارید،{" "}
          <a href={PHONE_MOBILE_LINK} data-call-context="form" className="underline" onClick={() => clarityEvent("tel_fallback_click", { ...extra, source: buildSource(tourSlug) })}>
            مستقیم زنگ بزنید
          </a>
          .
        </Alert>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={status === "busy"}>
        <PhoneCall aria-hidden />
        {status === "busy" ? (
          <>
            {/* حکم ۴ برندینگ: الگوی بارگذاری محور ششم؛ رجیستر «شما»، نه ربات. */}
            یک لحظه صبر کنید؛ داریم درخواستتان را ثبت می‌کنیم
            {/* انحراف از دستور اجرایی (loading-dots + aria-hidden): پراپ aria-hidden در
                API آیتم رجیستری نیست و کامپایل نمی‌شود؛ نقطه‌های داخلی خود آیتم
                aria-hidden‌اند و role=status روی wrapper خالی است، پس متن دکمه
                خوانده می‌شود. اگر ممیزی حکم دیگری داد، برمی‌گردانیم. */}
            <LoadingDots />
          </>
        ) : tourTitle ? (
          `درخواست تماس برای ${tourTitle}`
        ) : (
          "درخواست تماس"
        )}
      </Button>
    </form>
  );
}
