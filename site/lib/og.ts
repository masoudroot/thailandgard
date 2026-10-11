/**
 * پیش‌فرض سراسری og:image (دستور سئو، اجرای ۱۲:۰۵).
 * چون Next.js آبجکت openGraph صفحه را جایگزین لی‌اوت می‌کند (ادغام نمی‌کند)،
 * هر صفحه‌ای که openGraph خودش را دارد باید همین هلپر را صدا بزند.
 * وقتی صفحه‌ای عکس اختصاصی گرفت، آرایهٔ images همان صفحه بازنویسی می‌شود.
 */
export function defaultOgImages(siteUrl: string) {
  return [
    {
      url: `${siteUrl}/images/hero-phuket-sunset.webp`,
      width: 2400,
      height: 1600,
      alt: "غروب خورشید بر فراز خلیج فنگ‌نا در پوکت؛ یکی از مقصدهای تورهای تایلندگرد",
    },
  ];
}
