import type { Metadata } from "next";
import { Clock, MessageCircle, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { CallButtons } from "@/components/site/CallButtons";
import { CallbackForm } from "@/components/site/CallbackForm";
import { getSiteSettings } from "@/lib/db-content";
import { fa } from "@/lib/utils";

export const metadata: Metadata = {
  title: "تماس با تایلندگرد؛ مشاورهٔ تلفنی تور تایلند",
  description:
    "فروش تایلندگرد فقط تلفنی است؛ پرداخت آنلاین نداریم. با غزل عینی، متخصص و مشاور تورهای تایلند، تماس بگیرید یا درخواست تماس ثبت کنید.",
  openGraph: {
    title: "تماس با تایلندگرد؛ مشاورهٔ تلفنی تور تایلند",
    description:
      "فروش تایلندگرد فقط تلفنی است؛ پرداخت آنلاین نداریم. با غزل عینی، متخصص و مشاور تورهای تایلند، تماس بگیرید یا درخواست تماس ثبت کنید.",
  },
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const s = await getSiteSettings();
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <header className="max-w-2xl">
        <p className="inline-flex items-center gap-2 rounded-full bg-brand/15 px-3 py-1 text-xs font-semibold text-brand-foreground">
          <Phone className="size-4" />
          تماس
        </p>
        <h1 className="mt-3 text-4xl">تماس با تایلندگرد</h1>
        <p className="mt-4 text-base leading-8 text-muted-foreground">
          فروش ما فقط تلفنی است؛ پرداخت آنلاین نداریم. یک تماس کوتاه، همهٔ ابهام‌های سفرتان
          را برطرف می‌کند.
        </p>
      </header>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-border bg-muted/40">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">{s.CONTACT_NAME}</h2>
                <CardDescription className="mt-1">{s.CONTACT_TITLE}</CardDescription>
              </div>
              <Badge variant="brand">پاسخگوی فروش</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 pt-6">
            <CallButtons compact />
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <MessageCircle className="size-4" />
              واتس‌اپ و بله روی موبایل فعال است؛ پیام بدهید، جواب می‌گیرید. با شمارهٔ ثابت هم می‌توانید زنگ بزنید.
            </p>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="size-4" />
              ساعت کاری: شنبه تا پنجشنبه، {fa(9)} صبح تا {fa(9)} شب
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b border-border bg-muted/40">
            <h2 className="text-xl font-semibold">درخواست تماس</h2>
            <CardDescription className="leading-7">
              شماره‌تان را بگذارید، {s.CONTACT_NAME} در اولین فرصت زنگ می‌زند.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CallbackForm contactName={s.CONTACT_NAME} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
