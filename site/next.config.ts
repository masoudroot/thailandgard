import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // استقرار روی Prisma Compute: خروجی standalone اجباری است
  // (بدون آن دپلوی موفق می‌شود ولی URL خطا می‌دهد).
  output: "standalone",
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
    ];
  },
  cacheComponents: true,
  partialPrefetching: true,
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
