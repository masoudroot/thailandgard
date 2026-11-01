/* فهرست تیم‌های فاز ۳ برای داشبورد کارخانه.
   فقط نمایش است: هیچ دکمهٔ انتشار، هیچ لینک اقدام و هیچ فراخوانی
   داده‌ای در این‌جا نیست. داده از Registry تیم‌ها می‌رسد و شمار
   کارهای در انتظار تأیید هم از خلاصهٔ موجود داشبورد گرفته می‌شود.
   جزئیات فنی سطح پایین، جای دیگری نمایش داده می‌شوند نه این‌جا. */

import { formatJalali } from "@/lib/jalali";
import { faNumber } from "@/lib/utils";
import type { TeamDisplay } from "@/lib/factory-dashboard/teams";

const DISPLAY_STATUS_LABELS: Record<string, string> = {
  configured_not_active: "پیکربندی‌شده، هنوز فعال نشده",
  configured: "پیکربندی‌شده",
  ready: "آماده",
  blocked: "مسدود",
  active: "فعال",
};

function displayStatusLabel(status: string): string {
  return DISPLAY_STATUS_LABELS[status] ?? status;
}

function jalali(value: string | null): string {
  if (!value) return "هنوز اجرا نشده است";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "نامشخص";
  return formatJalali(d, { year: true });
}

export function TeamSection({
  teams,
  awaitingApprovalCount,
}: {
  teams: TeamDisplay[];
  awaitingApprovalCount: number;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {awaitingApprovalCount > 0
          ? `${faNumber(awaitingApprovalCount)} کار در انتظار تأیید انسانی است؛ تیم‌ها تا تأیید انسانی، چیزی منتشر نمی‌کنند.`
          : "کاری در انتظار تأیید نیست؛ تیم‌ها هنوز خودمختار نیستند و چیزی منتشر نمی‌کنند."}
      </p>
      {teams.length === 0 ? (
        <p className="text-sm text-muted-foreground">تیمی در Registry ثبت نشده است.</p>
      ) : (
        <ul className="space-y-2">
          {teams.map((team) => (
            <li key={team.teamKey} className="rounded-xl border border-border bg-card p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-semibold">{team.displayName}</span>
                <span className="inline-flex shrink-0 items-center rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {displayStatusLabel(team.displayStatus)}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{team.mission}</p>
              <p className="mt-1 text-xs text-muted-foreground" dir="ltr">{team.teamKey}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                گردش‌کار:{" "}
                <span dir="ltr">
                  {team.workflowVersions.length > 0 ? team.workflowVersions.join(", ") : "ثبت نشده است"}
                </span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                محیط فعال: <span dir="ltr">{team.enabledEnvironment}</span>
                {" · "}آخرین فعالیت: {jalali(team.lastRun)}
              </p>
              {team.blockedReason && (
                <p className="mt-1 text-xs text-muted-foreground">دلیل توقف: {team.blockedReason}</p>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">
        این بخش فقط‌خواندنی است؛ تأیید، انتشار و تغییر وضعیت تیم‌ها از این‌جا انجام نمی‌شود.
      </p>
    </div>
  );
}
