import type { Metadata } from "next";
import DashboardClient from "./DashboardClient";

export const metadata: Metadata = {
  title: "داشبورد کارخانه",
  description: "نمای فقط‌خواندنی وضعیت کارخانه: کارها، قدم‌ها، انتشارها، خطاها و بودجه.",
};

/* پوستهٔ استاتیک صفحه. دادهٔ کارخانه این‌جا نیست و در بیلد پیش‌رندر
   نمی‌شود؛ محتوای پویا را DashboardClient از مسیر API فقط‌خواندنی
   می‌گیرد. دلیل این ساختار در سربرگ dashboard-view.tsx آمده است:
   لی‌اوت ریشه ensureStatic='navigation' دارد و رندرِ درخواستیِ سمت
   سرور را برای هیچ صفحه‌ای نمی‌گذارد، پس الگوی مصوب خود پروژه
   (صفحهٔ استاتیک + API فقط‌خواندنی) به کار رفت. */

export default function FactoryDashboardPage() {
  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">داشبورد کارخانه</h1>
        <p className="text-sm text-muted-foreground">
          نمای فقط‌خواندنی وضعیت کارخانه. این صفحه چیزی را تغییر
          نمی‌دهد.
        </p>
      </div>
      <DashboardClient />
    </main>
  );
}
