import { Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { CallbackForm } from "@/components/site/CallbackForm";
import { fa } from "@/lib/utils";

/**
 * سکشن ۸ وایرفریم: CTA مشاوره.
 * شماره‌های بزرگ کلیک‌شدنی (تک‌منبع getSiteSettings) + ساعت پاسخ‌گویی
 * + فرم کوتاه «نام | شماره تماس» (CallbackForm آماده).
 */
export function AboutCta({
  contactName,
  mobileDisplay,
  mobileLink,
  landlineDisplay,
  landlineLink,
}: {
  contactName: string;
  mobileDisplay: string;
  mobileLink: string;
  landlineDisplay: string;
  landlineLink: string;
}) {
  return (
    <section id="callback" className="scroll-mt-24 px-6 py-12">
      <div className="mx-auto max-w-5xl">
        <Card className="overflow-hidden border-brand-deep">
          <CardContent className="grid gap-8 px-6 py-8 sm:px-10 lg:grid-cols-2">
            <div className="flex flex-col justify-center text-center lg:text-start">
              <h2 className="text-balance text-2xl sm:text-3xl">هنوز سؤال دارید؟</h2>
              <p className="text-pretty mt-3 text-sm leading-[1.9] text-muted-foreground">
                با {contactName} حرف بزنید؛ مشاوره رایگان است و هیچ تعهدی ندارد.
              </p>
              <p className="mt-6 text-2xl font-bold tracking-tight">
                <a
                  href={mobileLink}
                  className="rounded-sm underline decoration-brand decoration-2 underline-offset-4 focus-visible:bg-accent"
                >
                  <span dir="ltr">{mobileDisplay}</span>
                </a>
              </p>
              <p className="mt-2 text-lg font-semibold">
                <a
                  href={landlineLink}
                  className="rounded-sm underline decoration-brand/60 underline-offset-4 focus-visible:bg-accent"
                >
                  <span dir="ltr">{landlineDisplay}</span>
                </a>
              </p>
              <p className="mt-5 flex items-center justify-center gap-2 text-sm text-muted-foreground lg:justify-start">
                <Clock aria-hidden className="size-4 shrink-0" />
                ساعت پاسخ‌گویی: شنبه تا پنجشنبه، {fa(9)} صبح تا {fa(9)} شب
              </p>
            </div>
            <div>
              <h3 className="text-balance text-xl font-semibold">ما زنگ می‌زنیم</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                وقت ندارید؟ شماره‌تان را بگذارید؛ خودمان با شما تماس می‌گیریم.
              </p>
              <div className="mt-4">
                <CallbackForm contactName={contactName} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
