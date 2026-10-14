import { MessageCircle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getSiteSettings } from "@/lib/db-content";

/** دکمه‌های تماس فروش: موبایل اصلی، ثابت دوم، و مشاوره واتس‌اپی. */
export async function CallButtons({ compact = false }: { compact?: boolean }) {
  const s = await getSiteSettings();
  const CONTACT_NAME = s.CONTACT_NAME;
  const CONTACT_TITLE = s.CONTACT_TITLE;
  const PHONE_CHANNELS_NOTE = s.PHONE_CHANNELS_NOTE;
  const PHONE_LANDLINE_DISPLAY = s.PHONE_LANDLINE_DISPLAY;
  const PHONE_LANDLINE_LINK = s.PHONE_LANDLINE_LINK;
  const PHONE_MOBILE_DISPLAY = s.PHONE_MOBILE_DISPLAY;
  const PHONE_MOBILE_LINK = s.PHONE_MOBILE_LINK;
  const WHATSAPP_LINK = s.WHATSAPP_LINK;
  return (
    <div className={compact ? "flex flex-wrap items-center gap-3" : "grid gap-4 sm:grid-cols-2"}>
      <Button asChild size="lg" className="w-full" variant="brand">
        <a href={PHONE_MOBILE_LINK} data-call-context="callbuttons-main">
          <Phone aria-hidden="true" />
          تماس با مشاور سفر
        </a>
      </Button>
      <Button asChild size="lg" className="w-full" variant="secondary">
        <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer">
          <MessageCircle aria-hidden="true" />
          مشاوره واتس‌اپی
          <span className="sr-only"> (در تب جدید)</span>
        </a>
      </Button>
      {compact && (
        <p className="w-full text-sm text-muted-foreground">
          {/* F-005 (یافتهٔ جزئی بازرس، ۱۹ مهر ۱۴۰۵ :۳۵): شماره‌ها بدون لیبل
              بودند؛ «موبایل» و «ثابت» اضافه شد. */}
          موبایل:{" "}
          <a href={PHONE_MOBILE_LINK} data-call-context="callbuttons-mobile-num" className="rounded-sm font-semibold underline underline-offset-4 focus-visible:bg-accent">
            <span dir="ltr">{PHONE_MOBILE_DISPLAY}</span>
          </a>
          {"؛ "}ثابت:{" "}
          <a href={PHONE_LANDLINE_LINK} data-call-context="callbuttons-landline-num" className="rounded-sm font-semibold underline underline-offset-4 focus-visible:bg-accent">
            <span dir="ltr">{PHONE_LANDLINE_DISPLAY}</span>
          </a>
        </p>
      )}
      {!compact && (
        <Card className="sm:col-span-2">
          <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">
                {CONTACT_NAME}؛ {CONTACT_TITLE}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                موبایل:{" "}
                <a href={PHONE_MOBILE_LINK} data-call-context="callbuttons-mobile-num" className="rounded-sm font-semibold underline underline-offset-4 focus-visible:bg-accent">
                  <span dir="ltr">{PHONE_MOBILE_DISPLAY}</span>
                </a>
                {"؛ "}ثابت:{" "}
                <a href={PHONE_LANDLINE_LINK} data-call-context="callbuttons-landline-num" className="rounded-sm font-semibold underline underline-offset-4 focus-visible:bg-accent">
                  <span dir="ltr">{PHONE_LANDLINE_DISPLAY}</span>
                </a>
                {"؛ "}
                {PHONE_CHANNELS_NOTE}
              </p>
            </div>
          </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
