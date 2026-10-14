"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Home, Inbox, Phone, RefreshCw, SearchX, ServerCrash, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * ایمپورت واقعی آیتم رجیستری وایب‌فارسی: templates/error-pages
 * (سورس: registry/r/templates/error-pages.json).
 *
 * تطبیق‌های مجاز (مستند، نه انحراف ساختاری):
 * - تطبیق کپی: میکروکپی نهایی مصوب (بدنهٔ ۴۰۴ بدون اشاره به جست‌وجو چون
 *   سایت جست‌وجو ندارد؛ «راهنمای سفر» هماهنگ با لیبل ناوبری؛ بدنهٔ تازهٔ ۵۰۰).
 * - لحن انسانی (نبض D-006): تیترهای گرم و محاوره‌ای به‌جای متن خشک سیستمی
 *   («این‌جا چیزی نیست» به‌جای «این صفحه وجود ندارد»؛ «یک اشکال فنی پیش آمد»
 *   با «تقصیر شما نیست»)؛ بدنهٔ آفلاین بدون ادعای «تغییرات ذخیره‌نشده» (این
 *   سایت چیزی ذخیره نمی‌کند)؛ بدنهٔ خالی اداری (CMS) → توریستی.
 *   تطبیق کپی طبق قانون ۸ پلی‌بوک رجیستری انحراف نیست.
 * - حذف عمدی باکس جست‌وجوی ۴۰۴ (پراپ search): انحراف ثبت‌شدهٔ اسپک error-pages
 *   §۵؛ جعبهٔ مرده از نبودش بدتر است؛ با آمدن جست‌وجو برمی‌گردد.
 * - CTAها در سطح استفاده داده می‌شوند (tel با asChild + آیکون Phone)؛
 *   فایل آیتم دست نخورده می‌ماند.
 * - ترتیب CTAهای ۵۰۰: «تماس با مشاور سفر» اول (تل، آیکون Phone) و «تلاش دوباره»
 *   دوم (ghost، آیکون RefreshCw)؛ طبق اسپک error-pages §۳ و متن نهایی محتوا.
 *   مدل فروش تلفنی است و retry به‌تنهایی کاربر را گم می‌کند. این ترتیب عین
 *   پیاده‌سازی پیش از mount تمپلیت بود و mount ۰۹ آن را برعکس کرده بود.
 * - ref نمونهٔ تمپلیت با «کد پیگیری» واقعی (digest) جایگزین می‌شود.
 *
 * هستهٔ آیتم دست‌نخورده: کد بزرگ محو (ارقام فارسی)، تیتر خبری، بدنهٔ دو جمله‌ای
 * با قدم بعدی، بافت نقطه‌ای توکن‌محور، صفر برند، `text-[11px]` خط ref.
 */

export type ErrorKind = "404" | "500" | "offline" | "empty";

const COPY: Record<ErrorKind, { code?: string; icon: React.ComponentType<{ className?: string }>; title: string; body: string; primary: string; secondary?: string }> = {
  "404": { code: "۴۰۴", icon: SearchX, title: "این‌جا چیزی نیست", body: "احتمالاً آدرس اشتباه تایپ شده یا این صفحه جابه‌جا شده. از صفحهٔ اصلی سفرتان را ادامه بدهید.", primary: "صفحهٔ اصلی", secondary: "راهنمای سفر" },
  "500": { code: "۵۰۰", icon: ServerCrash, title: "یک اشکال فنی پیش آمد", body: "نتوانستیم صفحه را بارگذاری کنیم؛ تقصیر شما نیست. کمی بعد دوباره تلاش کنید یا با کارشناس مقصد تماس بگیرید تا پیگیری کنیم.", primary: "تماس با مشاور سفر", secondary: "تلاش دوباره" },
  offline: { icon: WifiOff, title: "به نظر می‌رسد اینترنت قطع شده", body: "اتصالتان را بررسی کنید و دوباره تلاش کنید؛ همین‌جا منتظرتان هستیم.", primary: "تلاش دوباره" },
  empty: { icon: Inbox, title: "هنوز خالی است", body: "هنوز چیزی برای این بخش آماده نشده؛ به‌زودی پر می‌شود. فعلاً نگاهی به تورها بیندازید.", primary: "دیدن تورها", secondary: "تماس با مشاور سفر" },
};

/** صفحه‌های خطا و خالی: ۴۰۴، ۵۰۰، آفلاین و حالت خالی؛ فارسی ساده و طبیعی، نه «اوپس». */
export function ErrorPage({
  kind = "404",
  className,
  // D-799 (نبض دیزاین ۰۹:۰۱): پیش‌فرض false طبق تصمیم ثبت‌شدهٔ اسپک error-pages §۵
  // («حذف عمدی باکس جست‌وجوی ۴۰۴؛ جعبهٔ مرده از نبودش بدتر است»)؛ با آمدن جست‌وجوی
  // واقعی، فراخواننده صراحتاً search={true} می‌دهد. قبلاً kind === "404" بود.
  search = false,
  primaryHref,
  secondaryHref,
  onPrimary,
  onSecondary,
  refCode,
}: {
  kind?: ErrorKind;
  className?: string;
  /** باکس جست‌وجوی ۴۰۴؛ روی این سایت false چون جست‌وجو نداریم (انحراف ثبت‌شده) */
  search?: boolean;
  primaryHref?: string;
  secondaryHref?: string;
  onPrimary?: () => void;
  onSecondary?: () => void;
  /** کد پیگیری ۵۰۰ (۸ نویسهٔ اول digest)؛ فقط وقتی هست رندر می‌شود */
  refCode?: string;
}) {
  const c = COPY[kind];
  return (
    <div className={cn("relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-6 py-16 text-foreground", className)}>
      <div aria-hidden className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_10%,transparent_65%)]" style={{ backgroundImage: "repeating-radial-gradient(circle at 50% 50%, oklch(from var(--foreground) l c h / 14%) 0 1px, transparent 1px 26px)" }} />
      <div className="relative w-full max-w-md text-center">
        {c.code ? <p className="font-mono text-7xl font-bold tabular-nums text-foreground/15 sm:text-8xl">{c.code}</p> : <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-secondary"><c.icon aria-hidden className="size-7 text-muted-foreground" /></span>}
        <h1 className="mt-4 text-balance text-2xl font-bold">{c.title}</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">{c.body}</p>
        {search && <div className="mx-auto mt-6 max-w-xs"><Input placeholder="جست‌وجو در سایت…" /></div>}
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          {primaryHref ? (
            <Button asChild><Link href={primaryHref}>{kind === "404" ? <Home aria-hidden /> : kind === "500" ? <Phone aria-hidden /> : <RefreshCw aria-hidden />}{c.primary}</Link></Button>
          ) : (
            <Button onClick={onPrimary}>{kind === "404" ? <Home aria-hidden /> : kind === "500" ? <Phone aria-hidden /> : <RefreshCw aria-hidden />}{c.primary}</Button>
          )}
          {c.secondary && (
            secondaryHref ? (
              <Button asChild variant="outline"><Link href={secondaryHref}>{kind === "404" ? <ArrowLeft aria-hidden /> : <Phone aria-hidden />}{c.secondary}</Link></Button>
            ) : (
              <Button variant={kind === "500" ? "ghost" : "outline"} onClick={onSecondary}>{kind === "404" ? <ArrowLeft aria-hidden /> : kind === "500" ? <RefreshCw aria-hidden /> : <Phone aria-hidden />}{c.secondary}</Button>
            )
          )}
        </div>
        {kind === "500" && refCode && (
          <p className="mt-6 text-xs text-muted-foreground">
            کد پیگیری: <span dir="ltr" className="font-mono">{refCode}</span>
          </p>
        )}
      </div>
    </div>
  );
}

/** Preview helper: all four states with a switcher. ابزار dev است و به پروداکشن نمی‌رود. */
export function ErrorPagesDemo() {
  const [kind, setKind] = React.useState<ErrorKind>("404");
  return (
    <div className="relative">
      <div className="absolute start-1/2 top-4 z-10 inline-flex -translate-x-1/2 rounded-lg border border-border bg-card p-0.5 text-xs">
        {(Object.keys(COPY) as ErrorKind[]).map((k) => <button key={k} type="button" onClick={() => setKind(k)} className={cn("cursor-pointer rounded-md px-2.5 py-1 font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background", kind === k ? "bg-secondary font-semibold" : "text-muted-foreground")}>{k}</button>)}
      </div>
      <ErrorPage kind={kind} />
    </div>
  );
}
