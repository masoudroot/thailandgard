import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BookOpenText, CalendarDays, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GUIDES } from "@/lib/guides";
import { fa } from "@/lib/utils";

export const metadata: Metadata = {
  title: "راهنمای سفر تایلند؛ ویزا، بهترین زمان و مقایسهٔ مقصدها",
  description:
    "راهنماهای کاربردی سفر به تایلند؛ بهترین زمان سفر، ویزا و مدارک، مقایسهٔ مقصدها. تیم محتوای تایلندگرد این صفحه را با راهنماهای تازه به‌روز نگه می‌دارد.",
  alternates: { canonical: "/guide" },
  openGraph: {
    title: "راهنمای سفر تایلند؛ ویزا، بهترین زمان و مقایسهٔ مقصدها؛ تایلندگرد",
    description:
      "راهنماهای کاربردی سفر به تایلند؛ بهترین زمان سفر، ویزا و مدارک، مقایسهٔ مقصدها. تیم محتوای تایلندگرد این صفحه را با راهنماهای تازه به‌روز نگه می‌دارد.",
  },
};

export default function GuideIndexPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <header className="max-w-2xl">
        <p className="inline-flex items-center gap-2 rounded-full bg-brand/15 px-3 py-1 text-xs font-semibold text-brand-foreground">
          <BookOpenText className="size-4" />
          راهنمای سفر
        </p>
        <h1 className="mt-3 text-4xl">راهنمای سفر تایلند</h1>
        <p className="mt-4 text-base leading-8 text-muted-foreground">
          این‌جا را تیم محتوا با راهنماهای تازه به‌روز نگه می‌دارد. هر چه برای تصمیم گرفتن
          دربارهٔ سفر تایلند لازم داری، این‌جا پیدا می‌کنی؛ ساده، به‌روز و بدون حاشیه.
        </p>
      </header>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {GUIDES.map((guide) => (
          <Link key={guide.slug} href={`/guide/${guide.slug}`} className="group block">
            <Card className="flex h-full flex-col transition-colors group-hover:border-brand/60">
              <CardHeader>
                <Badge variant="brand">{guide.category}</Badge>
                <CardTitle className="mt-2 text-xl leading-8">{guide.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4">
                <p className="text-sm leading-7 text-muted-foreground">{guide.excerpt}</p>
                <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-4 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="size-3.5" />
                    {fa(guide.readingMinutes)} دقیقه مطالعه
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="size-3.5" />
                    به‌روزرسانی: {guide.updatedFa}
                  </span>
                </div>
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                  خواندن راهنما
                  <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}
