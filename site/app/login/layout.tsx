import type { Metadata } from "next";
import localFont from "next/font/local";
import "../_dashboard-old/dashboard-theme.css";
import ThemeInit from "@/components/dashboard/ThemeInit";

/* دستور مسعود: ‎/login‎ هم در گوگل ایندکس نشود. */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};



/* فونت نمایشی تیترها: پینار، نسخه FD با ارقام فارسی */
const fontDisplay = localFont({
  src: "../../public/fonts/pinar/Pinar-FD-VF[wght-KSHD-DSTY].woff2",
  variable: "--font-dash-display",
  weight: "300 900",
  display: "swap",
});

/* فونت بدنه: ایران‌سنس X */
const fontBody = localFont({
  src: [
    { path: "../../public/fonts/iransansx/IRANSansX-Regular.woff2", weight: "400" },
    { path: "../../public/fonts/iransansx/IRANSansX-Medium.woff2", weight: "500" },
    { path: "../../public/fonts/iransansx/IRANSansX-Bold.woff2", weight: "700" },
  ],
  variable: "--font-dash-body",
  display: "swap",
});

/** لی‌اوت صفحهٔ ورود داشبورد؛ داخل اسکوپ تم داشبورد. */
export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`tg-dashboard ${fontDisplay.variable} ${fontBody.variable}`}>
      <ThemeInit />
      {children}
    </div>
  );
}
