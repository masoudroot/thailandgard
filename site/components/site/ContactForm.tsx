"use client";

import * as React from "react";
import { MessageCircle, PhoneCall, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { LoadingDots } from "@/components/animations/loading-dots";
import { cn } from "@/lib/utils";
import { clarityEvent } from "@/lib/clarity";

/**
 * فرم ۴ فیلدی صفحهٔ تماس (وایرفریم /contact، فاز ۵):
 * نام | موبایل (اعتبارسنجی ۰۹...) | موضوع کشویی | پیام.
 * ارسال به /api/contact-message؛ در جدول leads با پیشوند «موضوع: ...» ذخیره می‌شود.
 * موفقیت: تأیید داخل همان صفحه + راه فرار «عجله دارید؟ همین حالا زنگ بزنید».
 */

const SUBJECTS = [
  { value: "tour", label: "تور" },
  { value: "hotel", label: "هتل" },
  { value: "flight", label: "پرواز" },
  { value: "visa", label: "ویزا" },
  { value: "other", label: "سؤال دیگر" },
] as const;

interface Errors {
  name?: string;
  mobile?: string;
  subject?: string;
  message?: string;
}

export function ContactForm({
  telHref,
  telDisplay,
}: {
  /** لینک tel: شمارهٔ اصلی از تنظیمات سایت (دیتابیس) */
  telHref: string;
  /** نمایش فارسی شمارهٔ اصلی */
  telDisplay: string;
}) {
  const [name, setName] = React.useState("");
  const [mobile, setMobile] = React.useState("");
  const [mobileValid, setMobileValid] = React.useState(false);
  const [mobileTouched, setMobileTouched] = React.useState(false);
  const [subject, setSubject] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [errors, setErrors] = React.useState<Errors>({});
  const [status, setStatus] = React.useState<"idle" | "busy" | "done" | "error">("idle");
  const [serverError, setServerError] = React.useState("");
  const statusAlertRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (status === "done" || status === "error") statusAlertRef.current?.focus();
  }, [status]);

  function validate(): Errors {
    const e: Errors = {};
    if (name.trim().length < 2) e.name = "لطفاً نام را کامل وارد کنید؛ بدون نام نمی‌توانیم با شما تماس بگیریم.";
    if (!mobileValid) e.mobile = "شمارهٔ موبایل را کامل و درست وارد کنید.";
    if (!subject) e.subject = "یکی از موضوع‌ها را انتخاب کنید تا پیام‌تان به کارشناس درست برسد.";
    if (message.trim().length < 5) e.message = "پیام‌تان را بنویسید؛ چند کلمه کافی است.";
    return e;
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    clarityEvent("contact_form_submit_attempt", {});
    const e = validate();
    setErrors(e);
    setMobileTouched(true);
    const firstBad = (["name", "mobile", "subject", "message"] as const).find((k) => e[k]);
    if (firstBad) {
      document.getElementById(`cf-${firstBad}`)?.focus();
      return;
    }
    setStatus("busy");
    setServerError("");
    try {
      const res = await fetch("/api/contact-message", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim(), mobile, subject, message: message.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "خطا");
      setStatus("done");
      clarityEvent("contact_form_submit_success", {});
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "لطفاً یک بار دیگر تلاش کنید؛ پیام‌تان ثبت نشد.");
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <Alert ref={statusAlertRef} tabIndex={-1} variant="success" title="پیام‌تان رسید">
        <p>
          کارشناس ما تا آخر امروز با همین شماره با شما تماس می‌گیرد.
        </p>
        <p className="mt-3 font-semibold">
          عجله دارید؟{" "}
          <a href={telHref} className="underline decoration-brand/60 underline-offset-4 transition-[text-decoration-color] duration-200 hover:decoration-brand focus-visible:bg-accent">
            همین حالا زنگ بزنید (<span dir="ltr">{telDisplay}</span>)
          </a>
          .
        </p>
      </Alert>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Field label="نام و نام خانوادگی" htmlFor="cf-name">
        <Input
          id="cf-name"
          autoComplete="name"
          enterKeyHint="next"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (errors.name && e.target.value.trim().length >= 2) setErrors((p) => ({ ...p, name: undefined }));
          }}
          placeholder="مثلاً سارا محمدی"
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? "cf-name-error" : undefined}
        />
        {errors.name && (
          <p id="cf-name-error" role="alert" className="text-sm text-destructive">
            {errors.name}
          </p>
        )}
      </Field>

      <Field label="شمارهٔ موبایل" htmlFor="cf-mobile">
        <PhoneInput
          id="cf-mobile"
          forceError={mobileTouched && !mobileValid}
          onChange={(digits, valid) => {
            setMobile(digits);
            setMobileValid(valid);
          }}
        />
        {errors.mobile && (
          <p id="cf-mobile-error" role="alert" className="text-sm text-destructive">
            {errors.mobile}
          </p>
        )}
      </Field>

      <Field label="موضوع پیام" htmlFor="cf-subject">
        <select
          id="cf-subject"
          value={subject}
          onChange={(e) => {
            setSubject(e.target.value);
            if (e.target.value) setErrors((p) => ({ ...p, subject: undefined }));
          }}
          aria-invalid={errors.subject ? true : undefined}
          aria-describedby={errors.subject ? "cf-subject-error" : undefined}
          className={cn(
            "w-full rounded-field border-line-field border-input bg-field px-3 py-2 text-base leading-7 text-foreground shadow-field",
            !subject && "text-muted-foreground",
          )}
        >
          <option value="" disabled>
            انتخاب کنید
          </option>
          {SUBJECTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        {errors.subject && (
          <p id="cf-subject-error" role="alert" className="text-sm text-destructive">
            {errors.subject}
          </p>
        )}
      </Field>

      <Field label="پیام‌تان" htmlFor="cf-message">
        <Textarea
          id="cf-message"
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            if (errors.message && e.target.value.trim().length >= 5) setErrors((p) => ({ ...p, message: undefined }));
          }}
          rows={4}
          maxLength={1000}
          showCount
          placeholder="مثلاً برای اواخر مهر دنبال تور بانکوک و پاتایای ۷ شب هستم؛ بودجه‌ام حدود فلان است."
          aria-invalid={errors.message ? true : undefined}
          aria-describedby={errors.message ? "cf-message-error" : undefined}
        />
        {errors.message && (
          <p id="cf-message-error" role="alert" className="text-sm text-destructive">
            {errors.message}
          </p>
        )}
      </Field>

      {status === "error" && (
        <Alert ref={statusAlertRef} tabIndex={-1} variant="destructive" title="مشکلی پیش آمد">
          {serverError} اگر عجله دارید،{" "}
          <a href={telHref} className="rounded-sm underline decoration-brand/60 underline-offset-4 transition-[text-decoration-color] duration-200 hover:decoration-brand focus-visible:bg-accent">
            مستقیم زنگ بزنید
          </a>
          .
        </Alert>
      )}

      <Button type="submit" size="lg" variant="brand" className="w-full" disabled={status === "busy"}>
        <Send aria-hidden />
        {status === "busy" ? (
          <>
            یک لحظه صبر کنید؛ داریم پیام‌تان را می‌فرستیم
            <LoadingDots />
          </>
        ) : (
          "ارسال پیام"
        )}
      </Button>

      {/* جملهٔ «بعدش چه می‌شود» (اجباری وایرفریم، سکشن ۴): زیر دکمه. */}
      <p className="flex items-start gap-2 text-sm text-muted-foreground">
        <PhoneCall aria-hidden className="mt-0.5 size-4 shrink-0" />
        پیام‌تان را که فرستادید، کارشناس ما تا آخر امروز با همین شماره تماس می‌گیرد.
      </p>
      <p className="flex items-start gap-2 text-sm text-muted-foreground">
        <MessageCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
        اگر عجله دارید، پیام‌تان را در واتس‌اپ بفرستید؛ معمولاً کمتر از یک ساعت جواب می‌دهیم.
      </p>
    </form>
  );
}
