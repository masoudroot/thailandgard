/**
 * ردیف هشدار لید؛ پیاده‌سازی حکم چیدمان design
 * ‏(agents/design/SPECS/lead-alert-layout-2026-10-11-17.md)‏.
 *
 * ساختار (راست‌به‌چپ): [چیپ وضعیت] + متن تک‌خطی؛ شناسهٔ کوتاه لید داخل متن؛
 * نام تور در ردیف نمی‌آید (در title و صفحهٔ جزئیات).
 * نگاشت رجیستری: چیپ ← components/badge. انحراف ثبت‌شده: پس‌زمینهٔ ملایم
 * روی چیپ (خوانایی وضعیت روی موبایل فروش)؛ agents/vibefarsi/DEVIATIONS.md.
 * اندازه‌گیری‌شده با Vazirmatn واقعی: هر سه ردیف زیر ۳۶۰ پیکسل‌اند؛
 * کنتراست متن چیپ‌ها بالای ۴٫۵:۱ است (ممیزی a11y ساعت ۱۷).
 */
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn, fa } from "@/lib/utils";
import {
  LEAD_SLA_MS,
  LEAD_STAGE_LABEL,
  leadAlertText,
  shortLeadId,
  tehranClock,
  type LeadAlertStage,
} from "@/lib/lead-alert";

const CHIP: Record<
  LeadAlertStage,
  { variant: "success" | "warning" | "secondary"; tint: string }
> = {
  // سایهٔ /5 (نه /10 حکم) چون اندازه‌گیری نشان داد /10 کنتراست را زیر ۴٫۵:۱ می‌برد؛
  // چیپ «گذشته» خنثی (secondary) است: هم کنتراست ۶٫۲۵:۱ دارد هم بار منفی قرمز را ندارد (بافت مثبت حکم)
  fresh: { variant: "success", tint: "bg-success/5 px-1.5" },
  enroute: { variant: "warning", tint: "bg-warning/5 px-1.5" },
  past: { variant: "secondary", tint: "bg-muted px-1.5" },
};

export interface LeadAlertRowProps {
  /** شناسهٔ کامل لید؛ ۵ کاراکتر اول نمایش داده می‌شود */
  leadId: string;
  stage: LeadAlertStage;
  /** زمان ثبت لید (ISO)؛ مبنای محاسبهٔ سررسید مرحلهٔ «در مسیر» */
  createdAt: string;
  /** زمینهٔ تور: فقط در title و صفحهٔ جزئیات، نه در متن ردیف */
  tourTitle?: string;
  /** لینک/دکمهٔ جزئیات لید */
  href?: string;
  className?: string;
}

export function LeadAlertRow({
  leadId,
  stage,
  createdAt,
  tourTitle,
  href,
  className,
}: LeadAlertRowProps) {
  const chip = CHIP[stage];
  const deadline = new Date(new Date(createdAt).getTime() + LEAD_SLA_MS);
  const text = leadAlertText({ leadId, stage, deadline });

  // زمینهٔ تور در title (حکم بخش ۱ و بازخورد ۴ design)
  const titleParts = [`لید #${fa(shortLeadId(leadId))}`];
  if (tourTitle) titleParts.push(`تور: ${tourTitle}`);
  titleParts.push(`ثبت: ساعت ${tehranClock(new Date(createdAt))} به وقت تهران`);
  const title = titleParts.join("؛ ");

  const rowClass = cn(
    "flex min-h-[44px] w-full max-w-[360px] items-center gap-2 rounded-control px-3 py-2",
    href && "transition-transform duration-200 hover:bg-muted/60 motion-reduce:transition-none",
    className,
  );
  const inner = (
    <>
      <Badge variant={chip.variant} className={chip.tint}>
        {LEAD_STAGE_LABEL[stage]}
      </Badge>
      <span className="min-w-0 flex-1 truncate text-sm text-foreground">{text}</span>
    </>
  );

  if (href) {
    return (
      <Link href={href} title={title} className={rowClass} aria-label={text}>
        {inner}
      </Link>
    );
  }
  return (
    <div title={title} className={rowClass} role="group" aria-label={text}>
      {inner}
    </div>
  );
}
