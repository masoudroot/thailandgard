/* بخش تیم‌های کارخانه در داشبورد. داده فقط از قرارداد یخ‌زدهٔ
   تیم‌ها (site/lib/factory/teams/registry) می‌آید؛ این بخش چیزی از
   دیتابیس نمی‌خواند، عددی نمی‌سازد و ادعای اجرای زنده نمی‌کند.
   وضعیت‌ها و دلیل‌ها را getTeamDisplays می‌دهد و این‌جا فقط
   همان‌ها نشان داده می‌شوند. */

import { Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getTeamDisplays,
  type TeamDisplayStatus,
} from "@/lib/factory-dashboard/teams";

const STATUS_LABELS: Record<TeamDisplayStatus, string> = {
  configured_not_active: "پیکربندی‌شده، غیرفعال",
  configured: "پیکربندی‌شده",
  ready: "آمادهٔ اجرای محدود دستی",
  blocked: "مسدود",
  active: "فعال",
};

function StatusPill({ status }: { status: TeamDisplayStatus }) {
  return (
    <span className="inline-flex shrink-0 items-center rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
      {STATUS_LABELS[status]}
    </span>
  );
}

export default function TeamsSection() {
  const teams = getTeamDisplays();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <span aria-hidden className="text-muted-foreground">
            <Users aria-hidden className="size-5" />
          </span>
          تیم‌های کارخانه
        </CardTitle>
        <CardDescription>
          وضعیت‌ها از قرارداد تیم‌ها می‌آیند، نه از اجرای زنده؛ هنوز هیچ
          اجرایی برای هیچ تیمی ثبت نشده است و هیچ تیمی به‌صورت خودکار
          فعال نیست.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {teams.map((team) => (
            <li
              key={team.teamKey}
              className="rounded-xl border border-border bg-card p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-semibold" dir="ltr">
                  {team.displayName}
                </span>
                <StatusPill status={team.displayStatus} />
              </div>
              <p className="mt-1 text-sm">{team.mission}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {team.reason}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                گردش‌کار:{" "}
                <span dir="ltr">{team.workflowVersions.join("، ")}</span>
                {" · "}محیط: <span dir="ltr">{team.enabledEnvironment}</span>
                {" · "}آخرین اجرا:{" "}
                {team.lastRun ?? "هیچ اجرایی ثبت نشده است"}
              </p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
