"use client";

import * as React from "react";
import { PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Alert } from "@/components/ui/alert";

/** فرم «درخواست تماس»: نام + موبایل، با اعتبارسنجی ایرانی. */
export function CallbackForm({
  tourSlug,
  tourTitle,
  contactName,
}: {
  tourSlug?: string;
  tourTitle?: string;
  /** نام کارشناس فروش؛ از تنظیمات سایت (دیتابیس) می‌آید */
  contactName: string;
}) {
  const [name, setName] = React.useState("");
  const [mobile, setMobile] = React.useState("");
  const [mobileValid, setMobileValid] = React.useState(false);
  const [nameError, setNameError] = React.useState<string | undefined>();
  const [status, setStatus] = React.useState<"idle" | "busy" | "done" | "error">("idle");
  const [serverError, setServerError] = React.useState("");
  const statusAlertRef = React.useRef<HTMLDivElement>(null);

  // پس از «ثبت شد» یا خطای سرور، فوکس به پیام وضعیت می‌رود (مدیریت فوکس)
  React.useEffect(() => {
    if (status === "done" || status === "error") statusAlertRef.current?.focus();
  }, [status]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) {
      setNameError("نام را کامل وارد کنید.");
      return;
    }
    if (!mobileValid) return;
    setStatus("busy");
    setServerError("");
    try {
      const res = await fetch("/api/callback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim(), mobile, tourSlug, source: "site-form" }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "خطا");
      setStatus("done");
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "درخواستتان ثبت نشد؛ یک بار دیگر تلاش کنید.");
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <Alert ref={statusAlertRef} tabIndex={-1} variant="success" title="درخواستتان ثبت شد">
        {contactName} به‌زودی با همین شماره تماس می‌گیرد. اگر عجله دارید، مستقیم زنگ بزنید.
      </Alert>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Field label="نام و نام خانوادگی" htmlFor="cb-name">
        <Input
          id="cb-name"
          autoComplete="name"
          value={name}
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
      <Field label="شمارهٔ موبایل" htmlFor="cb-mobile" hint="به همین شماره زنگ می‌زنیم">
        <PhoneInput id="cb-mobile" onChange={(digits, valid) => { setMobile(digits); setMobileValid(valid); }} />
      </Field>
      {status === "error" && (
        <Alert ref={statusAlertRef} tabIndex={-1} variant="destructive" title="مشکلی پیش آمد">
          {serverError}
        </Alert>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={status === "busy" || !mobileValid}>
        <PhoneCall />
        {status === "busy" ? "در حال ثبت…" : tourTitle ? `درخواست تماس برای ${tourTitle}` : "درخواست تماس"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">با ثبت این فرم، {contactName} در اولین فرصت با شما تماس می‌گیرد.</p>
    </form>
  );
}
