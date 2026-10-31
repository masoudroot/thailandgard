import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // استقرار روی Prisma Compute: خروجی standalone اجباری است
  // (بدون آن دپلوی موفق می‌شود ولی URL خطا می‌دهد).
  output: process.env.NETLIFY ? undefined : "standalone",
  // ریدایرکت دائمی مسیر منتقل‌شدهٔ کمپین اکتبر (بریف سئو ۰۶:۳۵، ۱۴۰۵/۰۷/۲۰؛
  // قانون ۳۶: انتقال مسیر = ریدایرکت همان اجرا). permanent:true یعنی ۳۰۸ که
  // گوگل معادل ۳۰۱ می‌خواند.
  // به‌روزرسانی ۲۱ مهر ۱۴۰۵ (S-103، اجرای ۰۸): مقصد قبلی ‎/guide/phuket-in-october
  // هرگز ساخته نشد و ۴۰۴ می‌داد (زنجیرهٔ ۳۰۸←۴۰۴)؛ مقصد به نزدیک‌ترین صفحهٔ
  // زنده (راهنمای مسیرهای پروازی پوکت) تغییر کرد؛ همان مقصدی که لینک‌های
  // داخلی «جزئیات پروازهای اکتبر» از ران ۰۸:۴۳ به آن می‌دهند.
  async redirects() {
    return [
      {
        source: "/tours/phuket-october",
        destination: "/guide/phuket-flight-routes",
        permanent: true,
      },
      {
        source: "/phuket-october",
        destination: "/guide/phuket-flight-routes",
        permanent: true,
      },
      // ریدایرکت دائمی ‎/guides‎ به ‎/guide‎ (ممیزی سخت‌گیرانهٔ ۱۶:۳۰؛
      // مسیر جمع اشتباه است، مسیر درست ‎/guide‎ است).
      {
        source: "/guides",
        destination: "/guide",
        permanent: true,
      },
      {
        source: "/dashboard",
        has: [{ type: "host", value: "thailandgard.ir" }],
        destination: "https://admin.thailandgard.ir/dashboard",
        permanent: false,
      },
      {
        source: "/dashboard/:path*",
        has: [{ type: "host", value: "thailandgard.ir" }],
        destination: "https://admin.thailandgard.ir/dashboard/:path*",
        permanent: false,
      },
      {
        source: "/",
        has: [{ type: "host", value: "admin.thailandgard.ir" }],
        destination: "/dashboard",
        permanent: false,
      },
    ];
  },
  // دستور مسعود: مسیر ‎/dashboard‎ در گوگل ایندکس نشود.
  // هدر X-Robots-Tag روی همه زیرمسیرهای ‎/dashboard‎ اعمال می‌شود؛
  // چه داشبورد بعداً داخل همین ریپو بیاید چه از اپ جدا rewrite شود.
  async headers() {
    return [
      // تکمیل noindex بستهٔ R3C (§6): فقط روی بیلد Preview ورسل، همهٔ مسیرها
      // هدر noindex, nofollow می‌گیرند. گیت، متغیر زمان بیلد VERCEL_ENV است؛
      // روی Production (VERCEL_ENV=production) و اجرای محلی (بدون VERCEL_ENV)
      // این قانون اصلاً ساخته نمی‌شود و رفتار قبلی بدون تغییر می‌ماند.
      ...(process.env.VERCEL_ENV === "preview"
        ? [
            {
              source: "/:path*",
              headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
            },
          ]
        : []),
      {
        // Q3-05: قلم‌های سایت از URL پایدار و بدون هش سرو می‌شوند؛ بدون کش
        // بلندمدت، هر بازدید یک درخواست شرطی می‌سازد و در نسخهٔ بعدی همان
        // پنجرهٔ FOUT/CLS برمی‌گردد. قاعده: هنگام تغییر فایل قلم، نام فایل هم
        // عوض می‌شود (بازنویسی بی‌نام در این کش نمی‌نشیند).
        source: "/fonts/site/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/dashboard/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "admin.thailandgard.ir" }],
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        /*
         * Q4-04: هدرهای امنیتی لبه. HSTS را Vercel روی خود دامنه می‌فرستد
         * (max-age=63072000)، پس اینجا تکرار نمی‌شود.
         *
         * CSP فعلاً Report-Only است، نه اجرایی: صفحه‌ها ۵۴ اسکریپت inline
         * دارند (Next) و Clarity هم از دو دامنه بارگذاری می‌شود. با حالت
         * اجرایی، اولین بازدید کاربر واقعی می‌شکند. بعد از جمع‌شدن گزارش‌ها
         * در Vercel و پاک‌شدن نقض‌ها، این هدر به
         * Content-Security-Policy تبدیل می‌شود.
         */
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
          {
            key: "Content-Security-Policy-Report-Only",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' https://www.clarity.ms https://scripts.clarity.ms",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://www.clarity.ms https://*.clarity.ms https://*.supabase.co",
              "frame-src 'self' https://www.clarity.ms",
              "frame-ancestors 'self'",
              "base-uri 'self'",
              "form-action 'self'",
              "object-src 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    /*
     * F4 (بودجهٔ FCP): CSS سایت یک فایل ۹۹KB (۱۷KB gzip) است و به‌صورت
     * render-blocking در head می‌آید. در ترِیس کندسازی واقعی، اولین رنگ‌آمیزی
     * دقیقاً پس از رسیدن همین فایل شروع می‌شود (پایان CSS در ۱۶۴۲ms و یک تسک
     * ۵۵۳ms بلافاصله بعدش). با inline شدن، CSS قبل از پایان پاسخ سند حاضر است
     * و یک رفت‌وبرگشت کامل شبکه (RTT + دانلود) از مسیر بحرانی حذف می‌شود.
     * هزینه: HTML هر صفحه ~۱۷KB بزرگ‌تر (با brotli کمتر) و از کش مشترک CSS
     * بین صفحه‌ها خبری نیست؛ برای صفحهٔ فرود (اولین بازدید) بردش بیشتر است.
     */
    inlineCss: true,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
