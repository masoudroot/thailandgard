import type { Metadata } from "next";
import { SITE_URL } from "./site";

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

/**
 * سازندهٔ متادیتای صفحه (ریفکتور ساعت ۱۳، ۱۹ مهر ۱۴۰۵).
 * الگوی تکراری «title.absolute + description + openGraph هم‌نام + canonical»
 * را به یک فراخوانی می‌رساند. images پیش‌فرض همین‌جا وصل می‌ماند
 * (قانون «openGraph صفحه جایگزین لی‌اوت می‌شود، نه ادغام»).
 */
export function pageSeo({
  title,
  description,
  canonical,
  type = "website",
}: {
  title: string;
  description: string;
  canonical: string;
  type?: "website" | "article";
}): Metadata {
  return {
    title: { absolute: title },
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type,
      images: defaultOgImages(SITE_URL),
    },
  };
}
