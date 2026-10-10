import { MessageCircle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CONTACT_NAME,
  CONTACT_TITLE,
  PHONE_CHANNELS_NOTE,
  PHONE_LANDLINE_DISPLAY,
  PHONE_LANDLINE_LINK,
  PHONE_MOBILE_DISPLAY,
  PHONE_MOBILE_LINK,
  WHATSAPP_LINK,
} from "@/lib/site";

/** دکمه‌های تماس فروش: موبایل اصلی، ثابت دوم، و واتس‌اپ. */
export function CallButtons({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "flex flex-wrap items-center gap-3" : "grid gap-4 sm:grid-cols-2"}>
      <Button asChild size="lg" className="w-full" variant="brand">
        <a href={PHONE_MOBILE_LINK}>
          <Phone />
          تماس با {CONTACT_NAME}
        </a>
      </Button>
      <Button asChild size="lg" className="w-full" variant="secondary">
        <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer">
          <MessageCircle />
          واتس‌اپ
        </a>
      </Button>
      {!compact && (
        <div className="sm:col-span-2 rounded-surface border border-border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">
                {CONTACT_NAME} | {CONTACT_TITLE}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                <a href={PHONE_MOBILE_LINK} className="font-semibold underline underline-offset-4">
                  <span dir="ltr">{PHONE_MOBILE_DISPLAY}</span>
                </a>
                {" | "}
                <span dir="ltr">{PHONE_LANDLINE_DISPLAY}</span>
                {" | "}
                {PHONE_CHANNELS_NOTE}
              </p>
            </div>
            <a href={PHONE_LANDLINE_LINK} className="text-sm font-semibold text-foreground underline underline-offset-4">
              <span dir="ltr">{PHONE_LANDLINE_DISPLAY}</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
