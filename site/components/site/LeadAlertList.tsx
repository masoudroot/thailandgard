/**
 * فهرست هشدارهای لید — ظرف نگاشت‌شده به components/alert (حکم design، بخش ۴).
 *
 * فقط لیدهای وضعیت new وارد چرخهٔ هشدار می‌شوند (ران‌بوک SLA)؛ مرحلهٔ هر لید
 * از سن آن (اکنون منهای createdAt) حساب می‌شود. ردیف‌های «تازه» داخل ناحیهٔ
 * ‏aria-live="polite"‏ می‌نشینند تا اعلانشان برای assistive technology بیاید؛
 * وضعیت فقط با رنگ منتقل نمی‌شود (چیپ متنی همیشه هست).
 */
import { Alert } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { stageForAge } from "@/lib/lead-alert";
import { LeadAlertRow } from "./LeadAlertRow";

export interface LeadAlertListItem {
  leadId: string;
  createdAt: string;
  tourTitle?: string;
  href?: string;
}

export interface LeadAlertListProps {
  items: LeadAlertListItem[];
  /** «اکنون» برای محاسبهٔ سن؛ پیش‌فرض زمان رندر (تست‌پذیر) */
  now?: Date;
  className?: string;
}

export function LeadAlertList({ items, now = new Date(), className }: LeadAlertListProps) {
  const nowMs = now.getTime();
  const rows = items
    .map((item) => ({ item, stage: stageForAge(nowMs - new Date(item.createdAt).getTime()) }))
    .filter((r): r is { item: LeadAlertListItem; stage: NonNullable<ReturnType<typeof stageForAge>> } => r.stage !== null);

  const fresh = rows.filter((r) => r.stage === "fresh");
  const rest = rows.filter((r) => r.stage !== "fresh");

  if (rows.length === 0) return null;

  return (
    <Alert variant="info" className={cn("w-full max-w-[400px]", className)}>
      <ul className="w-full space-y-1">
        {fresh.length > 0 && (
          <li aria-live="polite" className="space-y-1">
            {fresh.map(({ item, stage }) => (
              <LeadAlertRow
                key={item.leadId}
                leadId={item.leadId}
                stage={stage}
                createdAt={item.createdAt}
                tourTitle={item.tourTitle}
                href={item.href}
              />
            ))}
          </li>
        )}
        {rest.map(({ item, stage }) => (
          <li key={item.leadId}>
            <LeadAlertRow
              leadId={item.leadId}
              stage={stage}
              createdAt={item.createdAt}
              tourTitle={item.tourTitle}
              href={item.href}
            />
          </li>
        ))}
      </ul>
    </Alert>
  );
}
