import Link from "next/link";
import { ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

/** صفحهٔ ۴۰۴. بر اساس الگوی error-pages رجیستری وایب‌فارسی: متن فارسی ساده و یک کار بعدی مشخص. */
export default function NotFound() {
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-6 py-16 text-foreground">
      <div className="relative w-full max-w-md text-center">
        <p className="font-display text-7xl tabular-nums text-foreground/15 sm:text-8xl">۴۰۴</p>
        <h1 className="mt-4 text-2xl">این صفحه وجود ندارد</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          شاید لینک قدیمی باشد یا آدرس اشتباه تایپ شده. از صفحهٔ اصلی ادامه دهید.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/">
              <Home />
              صفحهٔ اصلی
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/guide">
              راهنماها
              <ArrowLeft />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
