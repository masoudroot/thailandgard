import type { Metadata } from "next";
import { Suspense } from "react";
import localFont from "next/font/local";
import "./dashboard-theme.css";
import Nav from "@/components/dashboard/Nav";
import MobileNav from "@/components/dashboard/MobileNav";
import PageTransition from "@/components/dashboard/PageTransition";
import ThemeInit from "@/components/dashboard/ThemeInit";
import KnowledgeNavLink from "./KnowledgeNavLink";

/* دستور مسعود: ‎/dashboard‎ در گوگل ایندکس نشود. */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};



/* فونت نمایشی تیترها: پینار، نسخه FD با ارقام فارسی (وریبل، wght از ۳۰۰ تا ۹۰۰) */
const fontDisplay = localFont({
  src: "../../public/fonts/pinar/Pinar-FD-VF[wght-KSHD-DSTY].woff2",
  variable: "--font-dash-display",
  weight: "300 900",
  display: "swap",
});

/* فونت بدنه: ایران‌سنس X (Regular بدنه، Medium تأکید، Bold دکمه و لیبل مهم) */
const fontBody = localFont({
  src: [
    { path: "../../public/fonts/iransansx/IRANSansX-Regular.woff2", weight: "400" },
    { path: "../../public/fonts/iransansx/IRANSansX-Medium.woff2", weight: "500" },
    { path: "../../public/fonts/iransansx/IRANSansX-Bold.woff2", weight: "700" },
  ],
  variable: "--font-dash-body",
  display: "swap",
});

/**
 * لی‌اوت داشبورد: سایدبار راست (نخستین فرزند در فلکس، یعنی سمت شروع در راست‌چین)
 * و محتوای اصلی با هدر بالایی ثابت.
 * همه‌چیز داخل اسکوپ .tg-dashboard است تا تم و فونت داشبورد با سایت تداخل نکند.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`tg-dashboard ${fontDisplay.variable} ${fontBody.variable}`}>
      <ThemeInit />
      <Suspense>
      <div className="flex min-h-dvh bg-background font-sans text-foreground antialiased">
        {/* سایدبار دسکتاپ */}
        <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 border-e border-border bg-card lg:block">
          <Nav />
        </aside>

        {/* ستون محتوا */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 border-b border-border bg-background pt-[env(safe-area-inset-top)]">
            <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4 lg:h-16 lg:px-6">
              <h1 className="text-base font-bold leading-7 lg:text-lg">
                <span className="lg:hidden">داشبورد</span>
                <span className="hidden lg:inline">
                  داشبورد ایجنتیک تایلندگرد
                </span>
              </h1>
              {/* لینک «دانش» در هدر؛ هم موبایل هم دسکتاپ (تیم ۵، پروژه دانش) */}
              <KnowledgeNavLink />
            </div>
          </header>

          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 lg:px-6 lg:py-8">
            <PageTransition>{children}</PageTransition>
            {/* فاصله‌گذار برای ناوبری پایینی موبایل (قرارداد با تیم ناوبری) */}
            <div
              aria-hidden="true"
              className="pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-8"
            />
          </main>

          <footer className="border-t border-border">
            <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-center gap-1 px-4 py-4 text-xs leading-5 text-muted-foreground sm:flex-row sm:justify-between sm:px-6 lg:px-6">
              <p className="font-medium">داشبورد ایجنتیک تایلندگرد</p>
              <p className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="hidden h-1 w-1 rounded-full bg-border sm:block"
                />
                نسخهٔ ۱
              </p>
            </div>
          </footer>
        </div>

        {/* ناوبری موبایل: ناوبری پایینی ثابت + دراور کناری (تیم ۲) */}
        <MobileNav />
      </div>
      </Suspense>
    </div>
  );
}
