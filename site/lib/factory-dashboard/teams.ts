/* مدل نمایشی تیم‌های فاز ۳ برای داشبورد.
   منبع داده فقط Registry تیم‌ها است (site/lib/factory/teams/registry)؛
   این فایل هیچ داده‌ای از دیتابیس نمی‌خواند و هیچ عددی نمی‌سازد.
   نگاشت وضعیت نمایشی: تیمی که در Registry وضعیت configured دارد و
   هنوز اجرا نشده (last_run برابر null) در داشبورد با وضعیت
   configured_not_active نشان داده می‌شود. */

import { TEAMS, type TeamContract } from "@/lib/factory/teams/registry";

export type TeamDisplayStatus =
  | "configured_not_active"
  | "configured"
  | "ready"
  | "blocked"
  | "active";

export interface TeamDisplay {
  teamKey: string;
  displayName: string;
  mission: string;
  displayStatus: TeamDisplayStatus;
  workflowVersions: string[];
  enabledEnvironment: string;
  lastRun: string | null;
  lastSuccess: string | null;
  blockedReason: string | null;
}

/* تبدیل وضعیت Registry به وضعیت نمایشی. مقایسه با رشته انجام می‌شود
   تا اگر عامل Registry اجتماع وضعیت را کمی متفاوت تعریف کرد، این
   نگاشت در ادغام نشکند؛ مقدار ناشناخته به configured برمی‌گردد. */
export function toDisplayStatus(team: TeamContract): TeamDisplayStatus {
  const status = team.status as string;
  if (status === "configured" && team.last_run === null) {
    return "configured_not_active";
  }
  if (status === "blocked" || status === "ready" || status === "active") {
    return status;
  }
  return "configured";
}

function toISODate(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

export function toTeamDisplay(team: TeamContract): TeamDisplay {
  return {
    teamKey: team.team_key,
    displayName: team.display_name,
    mission: team.mission,
    displayStatus: toDisplayStatus(team),
    workflowVersions: Array.isArray(team.workflow_versions)
      ? team.workflow_versions
      : [],
    enabledEnvironment: team.enabled_environment,
    lastRun: toISODate(team.last_run),
    lastSuccess: toISODate(team.last_success),
    blockedReason: team.blocked_reason ?? null,
  };
}

/* فهرست نمایشی شش تیم، دقیقاً به ترتیبی که Registry می‌دهد.
   تیمی که در Registry نیست این‌جا ساخته نمی‌شود. */
export function getTeamDisplays(): TeamDisplay[] {
  return TEAMS.map((team) => toTeamDisplay(team));
}
