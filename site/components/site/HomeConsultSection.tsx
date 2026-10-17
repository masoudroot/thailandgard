import Link from "next/link";
import { ArrowLeft, Check, Phone } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CallbackForm } from "@/components/site/CallbackForm";

/**
 * سکشن ۶ وایرفریم صفحهٔ خانه: فرم مشاورهٔ «از متخصص بپرس» (حرکت ۴: اقدام).
 * یک قدم کوچک کم‌ریسک (پرسیدن، نه خریدن): ۳ وعدهٔ کوتاه + فرم درخواست تماس.
 * فرم همان CallbackForm ثبت‌شده است؛ پیام بعد از ارسالش هم همان «درخواستتان
 * ثبت شد؛ ... زنگ می‌زنیم» است (وایرفریم: «پیامتان رسید؛ [نام] تا [زمان] تماس می‌گیرد»).
 * فیلد سوم وایرفریم («چه می‌خواهید بدانید؟») فیلد اختیاری پیام است که جایی
 * برای ذخیره ندارد (جدول leads ستون پیام ندارد)؛ پس فرم همان ۲ فیلد ثبت‌شدهٔ
 * نام + موبایل + زمان ترجیحی تماس می‌ماند و وعده‌ها سؤال‌پرسیدن را پوشش می‌دهند.
 */
const PROMISES = [
  {
    title: "مشاوره رایگان است",
    text: "برای جواب گرفتن لازم نیست چیزی بخرید؛ فقط سؤالتان را می‌پرسید.",
  },
  {
    title: "خودمان زنگ می‌زنیم",
    text: "در روزهای کاری (شنبه تا پنجشنبه، ۹ صبح تا ۹ شب) کارشناس مقصد با شما تماس می‌گیرد.",
  },
  {
    title: "بدون فشار برای خرید",
    text: "فقط جواب سؤالتان را می‌گیرید؛ تصمیم آخر همیشه با شماست.",
  },
];

export function HomeConsultSection({
  contactName,
  contactTitle,
  phoneHref,
}: {
  contactName: string;
  contactTitle: string;
  phoneHref: string;
}) {
  return (
    <section className="border-y border-border bg-muted/40">
      {/* D-258: py-12 هم‌ریتم با سکشن‌های خانه */}
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="max-w-2xl">
          <h2 className="text-balance text-2xl sm:text-3xl">از متخصص بپرس</h2>
          <p className="mt-2 text-muted-foreground">
            پوکت یا پاتایا؟ تابستان یا زمستان؟ تور ارزان یا تور درست؟ اگر در انتخاب
            مطمئن نیستید، از متخصص بپرسید؛ رایگان.
          </p>
        </div>
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {/* ستون وعده‌ها + کارشناس */}
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-balance text-xl">سه قولی که به شما می‌دهیم</CardTitle>
              <CardDescription>
                {contactName}، {contactTitle.toLowerCase()}، خودش پاسخ‌گوی شماست.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {PROMISES.map((p) => (
                  <li key={p.title} className="flex items-start gap-3">
                    <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-brand/15 text-brand-foreground">
                      <Check aria-hidden className="size-4" />
                    </span>
                    <span>
                      <span className="font-semibold">{p.title}</span>
                      <span className="mt-0.5 block text-sm leading-7 text-muted-foreground">{p.text}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border pt-6">
                <Button asChild variant="brand">
                  <a href={phoneHref} data-call-context="home-consult">
                    <Phone aria-hidden />
                    تماس با مشاور سفر
                  </a>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/contact">
                    راه‌های دیگر تماس
                    <ArrowLeft aria-hidden />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
          {/* ستون فرم */}
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-balance text-xl">شماره‌تان را بگذارید؛ ما زنگ می‌زنیم</CardTitle>
              <CardDescription>
                فقط نام و موبایل کافی است؛ در بازه‌ای که می‌گویید با شما تماس می‌گیریم.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CallbackForm contactName={contactName} />
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
