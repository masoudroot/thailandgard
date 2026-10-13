"use client";

/**
 * ورودی موبایل. دست‌ساز می‌ماند: placeholder فارسی است (۹۱۲ ۳۴۵ ۶۷۸۹)؛
 * نسخهٔ رجیستری placeholder لاتین دارد.
 * انحراف ثبت‌شده (DEVIATIONS.md): پراپ `forceError` در آیتم رجیستری نیست؛
 * برای خطای اجباری روی submit فرم (دیف UX فرم «درخواست تماس»، ۲۰ مهر) اضافه شد.
 * انحراف دوم (فعال، ۲۱ مهر ۱۴۰۵، حکم نقد ۵ artdir): hint و متن خطا `text-sm`‌اند
 * (کف ۱۴px برای متن‌های عملکردی فرم)؛ آیتم `text-xs` تجویز می‌کند. پیام خطای امری
 * با «لطفاً» شروع می‌شود (قاعدهٔ «لطفاً در خطا»، حکم ۴۰ design-ir).
 */

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatIranMobile, isIranMobile, mobileOperator, normalizeIranMobile } from "@/lib/persian";

export interface PhoneInputProps {
  value?: string;
  /** Receives the 10-digit national number («912…») and validity. */
  onChange?: (digits: string, valid: boolean) => void;
  className?: string;
  id?: string;
  autoFocus?: boolean;
  /** برای اندازه‌گیری (callback_field_start) روی اولین لمس فیلد */
  onFocus?: React.FocusEventHandler<HTMLInputElement>;
  /** خطای اجباری از بیرون (روی submit فرم): hint خطا را نشان می‌دهد و
      aria-invalid + حلقهٔ خطا هم به همین پرچم گره می‌خورند. */
  forceError?: boolean;
}

/** شماره‌ی موبایل ایران. «+98» fixed on the left, groups of 3-3-4, operator detection, Persian digits accepted. */
export function PhoneInput({ value, onChange, className, id, autoFocus, onFocus, forceError }: PhoneInputProps) {
  const [internal, setInternal] = React.useState("");
  const digits = normalizeIranMobile(value ?? internal);
  const valid = isIranMobile(digits);
  const op = mobileOperator(digits);
  // الگوی cb-name-error: متن راهنما/خطا شناسه دارد و اینپوت به آن وصل است
  const hintId = id ? `${id}-hint` : undefined;
  // قید ممیزی فاز ۳ (farsiui F-078 + vibefarsi): خطای اجباری بدون aria-invalid ناقص است؛
  // هر سه (حلقه، aria-invalid، متن hint) به همان پرچم forceError گره می‌خورند.
  const showError = forceError || (digits.length === 10 && !valid);

  function set(next: string) {
    const d = normalizeIranMobile(next);
    if (value === undefined) setInternal(d);
    onChange?.(d, isIranMobile(d));
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className={cn("flex h-10 items-center gap-2 rounded-field border-line-field bg-field shadow-field px-3 transition-colors focus-within:ring-2 focus-within:ring-ring/60", showError ? "border-destructive/60" : "border-input")} dir="ltr">
        {/* پیش‌شماره عمداً لاتین می‌ماند: رجیستری وایب‌فارسی برای فیلد موبایل start addon «+98» را در کانتینر dir="ltr" تجویز می‌کند (design-rules.md) */}
        <span className="text-sm text-muted-foreground">+98</span>
        <input
          id={id}
          type="tel"
          inputMode="tel"
          // D-401 (نبض دیزاین ۲۲:۴۴): کلید «بعدی» کیبورد موبایل به‌جای return؛
          // بعد از موبایل، گروه زمان تماس می‌آید.
          enterKeyHint="next"
          autoComplete="tel-national"
          autoFocus={autoFocus}
          value={formatIranMobile(digits)}
          onChange={(e) => set(e.target.value)}
          onFocus={onFocus}
          placeholder="۹۱۲ ۳۴۵ ۶۷۸۹"
          className="h-full min-w-0 flex-1 bg-transparent text-sm tabular-nums outline-none placeholder:text-muted-foreground/70"
          aria-invalid={showError ? true : undefined}
          aria-describedby={hintId}
        />
        {valid && <Check aria-hidden className="size-4 text-success-text" />}
      </div>
      <p id={hintId} className="text-sm text-muted-foreground">
        {forceError ? <span role="alert" className="text-destructive">لطفاً شمارهٔ موبایل را کامل و درست وارد کنید.</span> : op ? `اپراتور: ${op}` : valid ? "شماره معتبر است" : digits.length === 10 && !valid ? <span role="alert" className="text-destructive">شماره باید با ۹ شروع شود و ۱۰ رقم باشد</span> : "بدون صفر اول هم می‌توانید وارد کنید"}
      </p>
    </div>
  );
}