import Link from "next/link";
import { ArrowLeft, BadgeCheck, BookOpen, HandHelping } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { fa } from "@/lib/utils";

function SectionHead({ eyebrow, title, lead }: { eyebrow: string; title: string; lead?: string }) {
  return (
    <div className="mx-auto mb-8 max-w-2xl text-center">
      <p className="inline-flex items-center gap-2 rounded-full bg-brand/15 px-3 py-1 text-xs font-semibold text-brand-foreground">
        {eyebrow}
      </p>
      <h2 className="text-balance mt-3 text-2xl sm:text-3xl">{title}</h2>
      {lead && <p className="text-pretty mt-3 text-sm leading-[1.9] text-muted-foreground">{lead}</p>}
    </div>
  );
}

/* ---------- سکشن ۲: نوار دغدغه‌ها ---------- */
const CONCERNS: { worry: string; answer: string }[] = [
  {
    worry: "نمی‌دانم کدام شهر به من می‌خورد",
    answer: "در مشاورهٔ رایگان، بر اساس بودجه و سلیقه‌تان پیشنهاد می‌دهیم.",
  },
  {
    worry: "این قیمت آخرش همین است؟",
    answer: "قیمت را قلم‌به‌قلم روی میز می‌گذاریم؛ بدون هزینهٔ پنهان.",
  },
  {
    worry: "در سفر کسی فارسی جوابم را می‌دهد؟",
    answer: "لیدر فارسی‌زبان در سفر همراه شماست.",
  },
  {
    worry: "مدارک و بلیت را خودم باید دنبال کنم؟",
    answer: "کارهای مدارک و رزرو را قدم‌به‌قدم با شما پیش می‌بریم.",
  },
];

export function AboutConcerns() {
  return (
    <section className="px-6 py-12">
      <div className="mx-auto max-w-5xl">
        <SectionHead eyebrow="دغدغه‌های شما" title="سؤال‌هایی که همه می‌پرسند" />
        <div className="grid gap-4 sm:grid-cols-2">
          {CONCERNS.map((c) => (
            <Card key={c.worry} className="h-full">
              <CardContent className="pt-6">
                <p className="text-balance font-semibold text-foreground">«{c.worry}»</p>
                <p className="mt-2 text-sm leading-[1.9] text-muted-foreground">{c.answer}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- سکشن ۳: ما کی هستیم ---------- */
export function AboutWhoWeAre() {
  return (
    <section className="bg-muted/40 px-6 py-12">
      <div className="mx-auto max-w-3xl text-center">
        <SectionHead eyebrow="ما کی هستیم" title="فقط یک مقصد؛ فقط تایلند" />
        <div className="space-y-4 text-pretty text-base leading-[1.9]">
          <p>
            تایلندگرد آژانسی است که فقط تور تایلند برگزار می‌کند؛ از مشاورهٔ تلفنی و
            پیشنهاد سفر تا رزرو و همراهی در سفر.
          </p>
          <p>
            با ایرلاین‌ها، هتل‌ها و لیدرهای فارسی‌زبان همکاری می‌کنیم تا سفر شما
            از تماس اول تا برگشت، یک‌جا و یکدست هماهنگ شود.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ---------- سکشن ۴: چرا فقط تایلند (قلب تمایز) ---------- */
export function AboutWhyThailand({ guideCount }: { guideCount: number }) {
  return (
    <section className="px-6 py-12">
      <div className="mx-auto max-w-3xl">
        <SectionHead
          eyebrow="چرا فقط تایلند"
          title="تمرکز، ما را متخصص کرده"
          lead="آژانسی که ده مقصد می‌فروشد از هر کدام کمی می‌داند؛ تیمی که فقط تایلند کار می‌کند، تفاوت پوکت و پاتایا را از تجربه می‌شناسد."
        />
        <Card className="border-brand">
          <CardContent className="pt-6 text-center">
            <BookOpen aria-hidden className="mx-auto size-8 text-brand-foreground" />
            <p className="text-pretty mt-4 text-base leading-[1.9]">
              تاکنون <strong>{fa(guideCount)} راهنمای سفر به تایلند</strong> را خودمان
              نوشته و منتشر کرده‌ایم؛ هر کدام با تاریخ به‌روزرسانی مشخص.
            </p>
            <p className="mt-4">
              <Link
                href="/guide"
                className="underline decoration-brand decoration-2 underline-offset-4 transition-[text-decoration-color] duration-200 hover:decoration-brand-foreground"
              >
                راهنمای سفر به تایلند را ببینید
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

/* ---------- سکشن ۶: قول‌ها با شاهد ----------
 * قانون وایرفریم: هر قول یک شاهد قابل‌کلیک؛ قول بی‌شاهد حذف می‌شود.
 * کارت «لیدر فارسی‌زبان» شاهد قابل‌کلیک (عکس و نام لیدرها) ندارد؛ پس از
 * صفحه حذف شد. سه قول مانده هر کدام شاهد واقعی دارند.
 */
const PROMISES: {
  icon: typeof BadgeCheck;
  promise: string;
  witness: string;
  href: string;
}[] = [
  {
    icon: BookOpen,
    promise: "اطلاعات کاربردی و به‌روز",
    witness: "راهنماهای تایلند با تاریخ به‌روزرسانی",
    href: "/guide",
  },
  {
    icon: HandHelping,
    promise: "مشاورهٔ انسانی و رایگان",
    witness: "تماس با مشاور؛ رایگان و بدون تعهد",
    href: "/contact",
  },
  {
    icon: BadgeCheck,
    promise: "قیمت شفاف",
    witness: "هر صفحهٔ تور بخش «شامل و ناشامل» دارد",
    href: "/tours",
  },
];

export function AboutPromises() {
  return (
    <section className="bg-muted/40 px-6 py-12">
      <div className="mx-auto max-w-5xl">
        <SectionHead
          eyebrow="قول‌های ما"
          title="هر قول، یک شاهد"
          lead="شعار نمی‌دهیم؛ هر قولی که می‌دهیم را می‌توانید همین حالا راستی کنید."
        />
        <div className="grid gap-4 sm:grid-cols-3">
          {PROMISES.map((p) => (
            <Card key={p.promise} className="h-full">
              <CardContent className="flex h-full flex-col pt-6 text-center">
                <p.icon aria-hidden className="mx-auto size-8 text-brand-foreground" />
                <h3 className="text-balance mt-3 font-semibold">{p.promise}</h3>
                <p className="mt-auto pt-4">
                  <Link
                    href={p.href}
                    className="inline-flex items-center gap-1.5 text-sm text-brand-foreground underline decoration-brand/60 underline-offset-4 transition-[text-decoration-color] duration-200 hover:decoration-brand-foreground"
                  >
                    {p.witness}
                    <ArrowLeft aria-hidden className="size-3.5" />
                  </Link>
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
