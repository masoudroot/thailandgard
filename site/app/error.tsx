"use client";

import { ErrorPage } from "@/components/templates/error-pages";
import { PHONE_MOBILE_LINK } from "@/lib/site";

/**
 * صفحهٔ خطای سراسری (۵۰۰). ایمپورت واقعی آیتم templates/error-pages رجیستری وایب‌فارسی.
 * ترتیب CTAها طبق اسپک error-pages §۳ و متن نهایی محتوا: «تماس با کارشناس» اول
 * (تل، آیکون Phone) و «تلاش دوباره» دوم (ghost؛ retry ترجیحی Next.js ۱۶ و reset
 * قدیمی هم پذیرفته می‌شود تا با هر نسخه‌ای که فریم‌ورک پاس داد کار کند).
 * «کد پیگیری» فقط وقتی digest هست رندر می‌شود.
 */
export default function Error({
  error,
  retry,
  reset,
}: {
  error: Error & { digest?: string };
  retry?: () => void;
  reset?: () => void;
}) {
  return (
    <ErrorPage
      kind="500"
      primaryHref={PHONE_MOBILE_LINK}
      onSecondary={() => (retry ?? reset)?.()}
      refCode={error.digest?.slice(0, 8)}
    />
  );
}
