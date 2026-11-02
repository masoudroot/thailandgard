/* مدل نمایشی تیم‌های فاز ۳ برای داشبورد.
   منبع داده فقط Registry تیم‌ها است (site/lib/factory/teams/registry)؛
   این فایل هیچ داده‌ای از دیتابیس نمی‌خواند و هیچ عددی نمی‌سازد.
   نگاشت وضعیت نمایشی: تیمی که در Registry وضعیت configured دارد و
   هنوز اجرا نشده (last_run برابر null) در داشبورد با وضعیت
   configured_not_active نشان داده می‌شود. */

import { TEAMS, type TeamContract } from "@/lib/factory/teams/registry";
import { getWorkflow } from "@/lib/factory/teams/workflows";

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
  /** دلیل قابل‌فهم برای مدیر محصول؛ از وضعیت واقعی قرارداد و گردش‌کار ساخته می‌شود، نه حدس. */
  reason: string;
  workflowVersions: string[];
  enabledEnvironment: string;
  lastRun: string | null;
  lastSuccess: string | null;
  blockedReason: string | null;
}

/* دلیل نمایشی هر تیم، از وضعیت گردش‌کارش در workflows.ts.
   «ready» این‌جا فقط یعنی «آمادهٔ یک اجرای محدود دستی از مسیر
   داشبورد، بدون فراخوان مدل» و هرگز یعنی اجرای خودکار نیست:
   قرارداد Registry همچنان configured است و ابزارهای تیم‌ها
   پیاده نشده‌اند، پس اجرای خودکار، بدون ابزار محدود، بودجه و
   سیاست دسترسی، ممکن نیست. */
export function teamDisplayReason(team: TeamContract): string {
  const executions = team.workflow_versions.map(
    (v) => getWorkflow(v)?.tick_execution ?? "blocked",
  );
  if (
    team.team_key === "content" &&
    executions.length > 0 &&
    executions.every((e) => e === "executable")
  ) {
    return "فقط برای یک اجرای محدود دستی از مسیر داشبورد آماده است: بدون فراخوان مدل، با تأیید انسانی و بدون خرج. اجرای خودکار هنوز فعال نیست.";
  }
  if (executions.includes("deferred")) {
    return "گردش‌کارش عمداً موکول شده و در آزمایشگاه می‌ماند؛ پیشنهادهایش فقط کاندید هستند و تأیید تجاری یا قیمت نهایی نیستند.";
  }
  if (executions.includes("defined_not_wired")) {
    return "قراردادش تعریف شده ولی گردش‌کارش هنوز به Tick وصل نیست و ابزارهایش پیاده نشده‌اند؛ پس فعلاً اجرا نمی‌شود و خرج تازه هم مجاز نیست.";
  }
  return "هنوز فعال نیست؛ ابزار محدود، بودجه و سیاست دسترسی‌اش کامل نشده است.";
}

/* تبدیل وضعیت Registry به وضعیت نمایشی. مقایسه با رشته انجام می‌شود
   تا اگر عامل Registry اجتماع وضعیت را کمی متفاوت تعریف کرد، این
   نگاشت در ادغام نشکند؛ مقدار ناشناخته به configured برمی‌گردد. */
export function toDisplayStatus(team: TeamContract): TeamDisplayStatus {
  const status = team.status as string;
  if (status === "configured" && team.last_run === null) {
    /* قاعدهٔ نمایشیِ محدودِ محتوا (قرارداد دست نمی‌خورد):
       محتوا تنها تیمی است که گردش‌کارش tick-executable است و مسیر
       دستی داشبوردش وجود دارد؛ پس نمایش، آن را «ready» می‌گذارد،
       ولی دلیل همراهش، محدوده را صریح می‌کند: اجرای دستی، بدون
       فراخوان مدل. بقیهٔ تیم‌ها configured_not_active می‌مانند. */
    if (
      team.team_key === "content" &&
      team.workflow_versions.length > 0 &&
      team.workflow_versions.every(
        (v) => getWorkflow(v)?.tick_execution === "executable",
      )
    ) {
      return "ready";
    }
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
    reason: teamDisplayReason(team),
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
