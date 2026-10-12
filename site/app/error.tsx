"use client";

import { ErrorPage } from "@/components/templates/error-pages";
import { PHONE_MOBILE_LINK } from "@/lib/site";

/**
 * صفحهٔ خطای سراسری (۵۰۰). ایمپورت واقعی آیتم templates/error-pages رجیستری وایب‌فارسی.
 * «تلاش دوباره» دکمهٔ اصلی است (retry ترجیحی Next.js ۱۶؛ reset قدیمی هم پذیرفته
 * می‌شود تا با هر نسخه‌ای که فریم‌ورک پاس داد کار کند)؛ «تماس با کارشناس» لینک tel.
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
      onPrimary={() => (retry ?? reset)?.()}
      secondaryHref={PHONE_MOBILE_LINK}
      refCode={error.digest?.slice(0, 8)}
    />
  );
}
