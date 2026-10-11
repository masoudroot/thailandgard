import { CalendarDays, Clock, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PHONE_MOBILE_LINK } from "@/lib/site";
import { fa } from "@/lib/utils";

export interface PillarHeroProps {
  badge: string;
  title: string;
  description: string;
  readingMinutes: number;
  updatedFa: string;
}

/**
 * هیروی متنی صفحهٔ ستونی «تور تایلند؛ راهنمای کامل».
 * ترکیب از بلوک hero رجیستری + جفت CTA صفحهٔ جزئیات تور.
 * انحراف‌های آگاهانه: بدون قاب عکس (حکم وایرفریم)، ریتم فشرده
 * (pt-10/sm:pt-14 تا هر دو CTA بالای تا دیده شوند)، خط متا
 * «لیبل اول، عدد بعد» طبق قانون راست‌چین عدد و لیبل.
 */
export function PillarHero({ badge, title, description, readingMinutes, updatedFa }: PillarHeroProps) {
  return (
    <section className="relative overflow-hidden px-6 pb-8 pt-10 text-center sm:pb-10 sm:pt-14">
      <div className="relative mx-auto max-w-3xl">
        <Badge variant="brand">{badge}</Badge>
        <h1 className="mt-5 text-4xl font-bold leading-tight sm:text-5xl">{title}</h1>
        <p className="mx-auto mt-5 max-w-xl leading-9 text-muted-foreground sm:text-lg">{description}</p>
        <div className="mt-8 flex flex-col justify-center gap-2 sm:flex-row">
          <Button asChild size="lg" variant="brand" className="rounded-full">
            <a href={PHONE_MOBILE_LINK}>
              <Phone />
              تماس با کارشناس
            </a>
          </Button>
          <Button asChild size="lg" variant="outline" className="rounded-full">
            <a href="#callback">درخواست مشاوره</a>
          </Button>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-4" aria-hidden />
            زمان مطالعه: {fa(readingMinutes)} دقیقه
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-4" aria-hidden />
            به‌روزرسانی: {updatedFa}
          </span>
        </div>
      </div>
    </section>
  );
}
