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
 * قانون ۳۳ سئو (۲۰ مهر ۱۴۰۵): عنوان محتوایی نباید خودش برند را حمل کند،
 * چون پسوند «تایلندگرد» را همین‌جا می‌چسبانیم. دنباله‌های «؛ تایلندگرد» و
 * «| تایلندگرد» (با فاصله‌های اختیاری) از انتهای عنوان محتوا پاک می‌شود؛
 * بعد عنوانی که با ؟ یا ! تمام می‌شود « | تایلندگرد» می‌گیرد، بقیه «؛ تایلندگرد».
 * (یافتهٔ سئو: «بانکوک بهترین شهر جهان شد؛ رأی ۲۹۶ هزار خواننده؟ | تایلندگرد؛ تایلندگرد»)
 */
export function brandTitle(raw: string): string {
  const clean = raw.replace(/\s*[؛|]\s*تایلندگرد\s*$/, "").trim();
  return /[؟!]$/.test(clean) ? `${clean} | تایلندگرد` : `${clean}؛ تایلندگرد`;
}

/**
 * عنوان نمایشی (D-053؛ همان قدم اول «brandTitle»، بدون چسباندن دوبارهٔ برند):
 * دنبالهٔ «| تایلندگرد» نباید روی کارت‌ها و تیترهای داخل صفحه دیده شود.
 */
export function displayTitle(raw: string): string {
  // دنبالهٔ برند ممکن است چند بار پشت سر هم چسبیده باشد
  // («… | تایلندگرد؛ تایلندگرد»)؛ همه را یک‌جا می‌زداییم.
  return raw.replace(/(\s*[؛|]\s*تایلندگرد)+$/, "").trim();
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
      url: canonical,
      locale: "fa_IR",
      images: defaultOgImages(SITE_URL),
    },
    // یافتهٔ S2 تیم سئو (۱۹ مهر ۱۴۰۵): بلوک twitter و فیلدهای url/locale
    // به کارت اشتراک‌گذاری اضافه شد.
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: defaultOgImages(SITE_URL),
    },
  };
}
