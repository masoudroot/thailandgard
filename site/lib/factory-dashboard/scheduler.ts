/**
 * لایهٔ خواندن و کنترل ساعت داخلی از داشبورد (THG-SCHED-02).
 * فقط سمت سرور. خواندن با همان الگوی PostgREST سمت سرور data.ts
 * (dbConfig + کلید service_role) انجام می‌شود. متن خام خطای دیتابیس
 * هرگز به مرورگر نمی‌رسد؛ داشبورد فقط جملهٔ سادهٔ plainErrorFa را می‌بیند.
 */
import {
  dbConfig,
  postgrestGet,
  postgrestWrite,
  type DbCfg,
} from "@/lib/factory/tick/internal-api";
import {
  computeNextDue,
  plainErrorFa,
  watchdogStatus,
  type SchedulerJob,
  type SchedulerRun,
  type WatchdogStatus,
} from "@/lib/scheduler/jobs";

export interface SchedulerJobView extends SchedulerJob {
  plain_error: string | null;
}

export interface SchedulerOverview {
  jobs: SchedulerJobView[];
  runs: SchedulerRun[];
  watchdog: WatchdogStatus;
  watchdog_text: string;
}

function watchdogText(status: WatchdogStatus): string {
  switch (status) {
    case "healthy":
      return "ساعت داخلی سالم است؛ اجرای داخلی در ۱۵ دقیقهٔ گذشته ثبت شده است.";
    case "down":
      return "زمان‌بند قطع است؛ در ۱۵ دقیقهٔ گذشته هیچ اجرای داخلی ثبت نشده است.";
    case "paused":
      return "تیک و پمپ از داشبورد خاموش است؛ این تصمیم کاربر است نه خرابی.";
    case "unknown":
    default:
      return "جدول زمان‌بند هنوز ساخته نشده است؛ ساعت داخلی راه نیفتاده است.";
  }
}

function isSchedulerJob(value: unknown): value is SchedulerJob {
  if (typeof value !== "object" || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.job_key === "string" &&
    typeof row.display_name === "string" &&
    (row.kind === "interval" || row.kind === "daily" || row.kind === "once") &&
    (typeof row.next_due === "string" || row.next_due === null)
  );
}

function isSchedulerRun(value: unknown): value is SchedulerRun {
  if (typeof value !== "object" || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.job_key === "string" &&
    typeof row.started_at === "string" &&
    typeof row.status === "string"
  );
}

/** خواندن کارها، اجراهای اخیر و وضعیت نگهبانی. جدول نباشد → unconfigured. */
export async function getSchedulerOverview(): Promise<
  { ok: true; data: SchedulerOverview } | { ok: false; reason: string }
> {
  const cfg: DbCfg | null = dbConfig();
  if (!cfg) return { ok: false, reason: "پیکربندی دیتابیس کامل نیست." };
  try {
    const jobsRaw = await postgrestGet(
      cfg,
      "scheduler_jobs?select=*&order=job_key.asc",
    );
    const runsRaw = await postgrestGet(
      cfg,
      "scheduler_runs?select=*&order=started_at.desc&limit=20",
    );
    const tickRunsRaw = await postgrestGet(
      cfg,
      "scheduler_runs?select=*&job_key=eq.tick_pump&source=eq.internal_worker&order=started_at.desc&limit=5",
    );
    const jobs = jobsRaw.filter(isSchedulerJob);
    const runs = runsRaw.filter(isSchedulerRun);
    const tickRuns = tickRunsRaw.filter(isSchedulerRun);
    const watchdog = watchdogStatus(jobs, tickRuns, new Date());
    return {
      ok: true,
      data: {
        jobs: jobs.map((job) => ({
          ...job,
          plain_error: plainErrorFa(job.last_error),
        })),
        runs,
        watchdog,
        watchdog_text: watchdogText(watchdog),
      },
    };
  } catch {
    return { ok: false, reason: "جدول زمان‌بند در دیتابیس نیست یا خواندنی نیست." };
  }
}

export interface SchedulerJobPatch {
  enabled?: boolean;
  interval_minutes?: number;
  daily_utc_time?: string;
}

/**
 * تغییر یک کار از داشبورد: روشن/خاموش، فاصله یا ساعت روزانه.
 * فقط همان سه میدان مجازند؛ تغییر فاصله یا ساعت، سررسید بعدی را از
 * همین لحظه دوباره حساب می‌کند. کار نباشد یا مقدار نامعتبر باشد، خطا
 * می‌دهد و چیزی نمی‌نویسد.
 */
export async function updateSchedulerJob(
  jobKey: string,
  patch: SchedulerJobPatch,
): Promise<{ ok: true; job: SchedulerJob } | { ok: false; reason: string }> {
  const cfg: DbCfg | null = dbConfig();
  if (!cfg) return { ok: false, reason: "پیکربندی دیتابیس کامل نیست." };
  try {
    const found = await postgrestGet(
      cfg,
      `scheduler_jobs?select=*&job_key=eq.${encodeURIComponent(jobKey)}`,
    );
    const job = found.filter(isSchedulerJob)[0];
    if (!job) return { ok: false, reason: "چنین کاری در زمان‌بند نیست." };
    const body: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (typeof patch.enabled === "boolean") body.enabled = patch.enabled;
    if (job.kind === "once" && (patch.interval_minutes !== undefined || patch.daily_utc_time !== undefined)) {
      return { ok: false, reason: "کار یک‌بارمصرف فاصله یا ساعت ندارد." };
    }
    if (job.kind === "interval" && patch.interval_minutes !== undefined) {
      const minutes = Math.floor(patch.interval_minutes);
      if (!Number.isFinite(minutes) || minutes < 1 || minutes > 1440) {
        return { ok: false, reason: "فاصله باید عددی بین ۱ تا ۱۴۴۰ دقیقه باشد." };
      }
      body.interval_minutes = minutes;
      const next = computeNextDue(
        { kind: "interval", interval_minutes: minutes, daily_utc_time: null },
        new Date(),
      );
      if (next) body.next_due = next.toISOString();
    }
    if (job.kind === "daily" && patch.daily_utc_time !== undefined) {
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(patch.daily_utc_time)) {
        return { ok: false, reason: "ساعت روزانه باید به شکل HH:MM باشد." };
      }
      body.daily_utc_time = patch.daily_utc_time;
      const next = computeNextDue(
        { kind: "daily", interval_minutes: null, daily_utc_time: patch.daily_utc_time },
        new Date(),
      );
      if (next) body.next_due = next.toISOString();
    }
    if (job.kind === "interval" && patch.daily_utc_time !== undefined) {
      return { ok: false, reason: "کار فاصله‌ای ساعت روزانه ندارد." };
    }
    if (job.kind === "daily" && patch.interval_minutes !== undefined) {
      return { ok: false, reason: "کار روزانه فاصلهٔ دقیقه‌ای ندارد." };
    }
    const updated = await postgrestWrite(
      cfg,
      "PATCH",
      `scheduler_jobs?job_key=eq.${encodeURIComponent(jobKey)}`,
      body,
    );
    const next = updated.filter(isSchedulerJob)[0];
    if (!next) return { ok: false, reason: "به‌روزرسانی کار انجام نشد." };
    return { ok: true, job: next };
  } catch {
    return { ok: false, reason: "نوشتن در جدول زمان‌بند ممکن نشد." };
  }
}
