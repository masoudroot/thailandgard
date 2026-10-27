import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getSiteSettings } from "@/lib/db-content";
import { defaultOgImages } from "@/lib/og";

/** همهٔ مسیرها استاتیک‌اند؛ هر رندر درخواستیِ آینده بیلد را قرمز می‌کند. */
export const ensureStatic = "navigation";

/**
 * قلم‌ها (Q3-05): @font-face صریح در globals.css روی public/fonts/site.
 * دلیلِ کنار گذاشتن next/font محلی: در Next 16.4 این پروژه هیچ
 * `<link rel="preload">` برای قلم تولید نمی‌شد؛ قلم‌ها بعد از اولین رنگ‌آمیزی
 * می‌رسیدند، h1 اول با قلم فالبک می‌شکست و بعد جابه‌جا می‌شد
 * (CLS 0.10 و LCP 3.9s). با URL پایدار، این سه فایل پیش‌بارگذاری می‌شوند و
 * قلم قبل از اولین متن آماده است. فالبک هم‌متریک در globals.css مانده است.
 */
const PRELOADED_FONTS = [
  "/fonts/site/Vazirmatn-arabic.woff2",
  "/fonts/site/Vazirmatn-latin.woff2",
  "/fonts/site/Pinar-FD-Bold.woff2",
];

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSiteSettings();
  return {
    metadataBase: new URL(s.SITE_URL),
    title: {
      default: `${s.SITE_NAME}؛ ${s.SITE_SLOGAN}`,
      template: `%s؛ ${s.SITE_NAME}`,
    },
    description:
      "تایلندگرد فقط تور تایلند برگزار می‌کند: پوکت، بانکوک، پاتایا، سامویی و کرابی. مشاوره و رزرو فقط با تماس تلفنی.",
    // S-033 (هندآف سئو ۱۹:۰۰): تگ meta keywords قالبی حذف شد؛ گوگل آن را
    // نادیده می‌گیرد و boilerplate یکسان در همهٔ صفحه‌ها سیگنال ضعیف می‌سازد.
    // D-489 (نبض دیزاین ۰۰:۲۹): آیکون لمسی iOS؛ فایل ۱۸۰×۱۸۰ بازسازی تیز
    // نشان «N» فاوآیکون روی رنگ جوهر گرافیت (--foreground) است.
    icons: { apple: "/apple-touch-icon.png" },
    openGraph: {
      type: "website",
      locale: "fa_IR",
      siteName: s.SITE_NAME,
      title: `${s.SITE_NAME}؛ ${s.SITE_SLOGAN}`,
      description: s.SITE_TAGLINE,
      // دستور سئو ۱۲:۰۵؛ پیش‌فرض سراسری og:image (عکس موجود هیروی خانه، ۲۴۰۰×۱۶۰۰)
      images: defaultOgImages(s.SITE_URL),
    },
    robots: { index: true, follow: true },
    // D-398 (نبض دیزاین ۲۲:۴۴): خاموش کردن تشخیص خودکار شماره‌تلفن در iOS؛
    // سافاری موبایل شماره‌ها را با استایل پیش‌فرض (آبی و زیرخط‌دار) می‌کرد و
    // زبان graphite را می‌شکست. شماره‌های تماس عمداً با SmartTelLink لینک‌اند.
    formatDetection: { telephone: false },
  };
}

// D-840 (نبض دیزاین ۰۹:۲۷): viewport صریح به‌جای پیش‌فرض نکست.
// themeColor از D-382 به این‌جا منتقل شد (جای استانداردش؛ در metadata تکرار نمی‌شود).
// viewportFit: "cover" نوارهای چسبان موبایل (TourStickyBar/MobileOctoberBar) را زنده می‌کند:
// بدون آن env(safe-area-inset-bottom) در iOS صفر است و پدینگ پایین نوارها مرده می‌ماند.
export const viewport: Viewport = {
  themeColor: "#FAF9F6",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <head>
        {PRELOADED_FONTS.map((href) => (
          <link key={href} rel="preload" href={href} as="font" type="font/woff2" crossOrigin="anonymous" />
        ))}
      </head>
      <body className="flex min-h-screen flex-col">
        {children}
      </body>
    </html>
  );
}
