"use client";

import * as React from "react";
import { PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Alert } from "@/components/ui/alert";
import { LoadingDots } from "@/components/animations/loading-dots";
import { WHATSAPP_LINK, PHONE_MOBILE_LINK } from "@/lib/site";

/**
 * ساعت‌آگاهی (پیشنهاد ۱ لید، ساعت ۱۴): فرم ۲۴ساعته باز است ولی ساعت کاری
 * «شنبه تا پنجشنبه، ۹ صبح تا ۹ شب» است؛ پیام موفقیت طبق ساعت تهران تصمیم می‌گیرد
 * تا «به‌زودی»ی که نیمه‌شب دروغ می‌شد، تکرار نشود.
 */
function isWithinWorkingHours(): boolean {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tehran",
    hour: "numeric",
    hourCycle: "h23",
    weekday: "short",
  }).formatToParts(new Date());
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const weekday = parts.find((p) => p.type === "weekday")?.value;
  // جمعه = تعطیل؛ بقیهٔ روزها فقط ۹ تا ۲۱
  return weekday !== "Fri" && hour >= 9 && hour < 21;
}

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
  // ساعت‌آگاهی فقط کلاینت‌ساید: در useEffect تا رندر استاتیک (prerender) نشکند.
  // پیش‌فرض null = نسخهٔ داخل ساعت کاری (فقط تا hydrate؛ پیام موفقیت فقط پس از ثبت و روی کلاینت دیده می‌شود).
  const [withinHours, setWithinHours] = React.useState<boolean | null>(null);
  React.useEffect(() => {
    setWithinHours(isWithinWorkingHours());
  }, []);
  const outsideHours = withinHours === false;

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
        {outsideHours ? (
          <>
            درخواستتان ثبت شد. ساعت کاری ما شنبه تا پنجشنبه، ۹ صبح تا ۹ شب است؛ در اولین فرصتِ روز
            کاری بعد با شما تماس می‌گیریم. اگر عجله دارید،{" "}
            <a href={WHATSAPP_LINK} className="underline" target="_blank" rel="noopener noreferrer">
              در واتس‌اپ پیام بدهید
            </a>
            .
          </>
        ) : (
          "ممنون؛ در اولین فرصتِ امروز با شما تماس می‌گیریم. اگر عجله دارید، مستقیم زنگ بزنید."
        )}
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
      {/* خط اطمینان (دستور تیزشدهٔ لید، ۱۹ مهر ۱۴۰۵): کاهش‌دهندهٔ ریسک با بافت
          مثبت (چه می‌شود، نه چه نمی‌شود)؛ رجیستر «شما»؛ بدون واژهٔ منفی. */}
      <p className="text-xs text-muted-foreground">
        شماره‌تان فقط برای همین تماس برگشتی استفاده می‌شود؛ کارشناس فروش در اولین فرصتِ روز کاری با شما تماس می‌گیرد.
      </p>
      {status === "error" && (
        <Alert ref={statusAlertRef} tabIndex={-1} variant="destructive" title="مشکلی پیش آمد">
          {serverError} اگر عجله دارید،{" "}
          <a href={PHONE_MOBILE_LINK} className="underline">
            مستقیم زنگ بزنید
          </a>
          .
        </Alert>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={status === "busy" || !mobileValid}>
        <PhoneCall />
        {status === "busy" ? (
          <>
            در حال ثبت…
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
      <p className="text-center text-xs text-muted-foreground">
        {outsideHours
          ? "با ثبت این فرم، در اولین فرصتِ روز کاری بعد (شنبه تا پنجشنبه، ۹ صبح تا ۹ شب) با شما تماس می‌گیریم."
          : "با ثبت این فرم، در اولین فرصتِ امروز با شما تماس می‌گیریم."}
      </p>
    </form>
  );
}
