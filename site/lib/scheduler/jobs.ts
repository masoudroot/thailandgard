/**
 * ساعت داخلی پروژه (THG-SCHED-02): تعریف کارها، محاسبهٔ سررسید بعدی
 * و وضعیت نگهبانی. همهٔ توابع این فایل خالص‌اند تا تست‌پذیر بمانند؛
 * هیچ‌کدام به دیتابیس یا شبکه دست نمی‌زنند.
 *
 * تصمیم «چه وقت» فقط از جدول scheduler_jobs خوانده می‌شود. این فایل
 * فقط همان تصمیم را حساب می‌کند، نه اینکه زمان‌بند بیرونی صدا بزند.
 */

export type SchedulerJobKind = "interval" | "daily" | "once";

export interface SchedulerJob {
  id: string;
  job_key: string;
  display_name: string;
  kind: SchedulerJobKind;
  interval_minutes: number | null;
  daily_utc_time: string | null;
  enabled: boolean;
  next_due: string | null;
  last_run_at: string | null;
  last_status: string | null;
  last_result: unknown;
  last_error: string | null;
  payload?: unknown;
}

export interface SchedulerRun {
  id: string;
  job_key: string;
  trigger: string;
  source: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  result: unknown;
  error: string | null;
}

export type WatchdogStatus = "healthy" | "down" | "paused" | "unknown";

/** آستانهٔ نگهبانی: اگر تیک و پمپ بیش از این روشن نماند، قطع است. */
export const WATCHDOG_WINDOW_MINUTES = 15;

/** تعریف چهار کار تکرارشوندهٔ ساعت داخلی؛ بذر Migration هم همین‌هاست.
 * کار یک‌بارمصرف بازنشستگی، جداگانه با Migration کارهای once بذر می‌شود. */
export const SCHEDULER_JOB_DEFS: Array<{
  job_key: string;
  display_name: string;
  kind: SchedulerJobKind;
  interval_minutes: number | null;
  daily_utc_time: string | null;
}> = [
  { job_key: "tick_pump", display_name: "تیک و پمپ", kind: "interval", interval_minutes: 5, daily_utc_time: null },
  { job_key: "autonomous_daily", display_name: "چرخهٔ روزانهٔ خودمختار", kind: "daily", interval_minutes: null, daily_utc_time: "02:00" },
  { job_key: "intel_daily", display_name: "جمع‌آوری خبر تایلند", kind: "daily", interval_minutes: null, daily_utc_time: "04:00" },
  { job_key: "gsc_daily", display_name: "دادهٔ سرچ کنسول", kind: "daily", interval_minutes: null, daily_utc_time: "02:30" },
];

/**
 * سررسید بعدی یک کار از لحظهٔ from.
 * فاصله‌ای: همان لحظه به‌اضافهٔ فاصله. روزانه: نزدیک‌ترین وقوع بعدی
 * زمان UTC (اگر زمان امروز گذشته باشد، فردا). یک‌بارمصرف: null است،
 * چون پس از اجرا دیگر سررسیدی ندارد و worker آن را خاموش می‌کند.
 * همه‌چیز با UTC حساب می‌شود تا جابه‌جایی ساعت تهران و تابستانی،
 * برنامه را به‌هم نریزد.
 */
export function computeNextDue(
  job: Pick<SchedulerJob, "kind" | "interval_minutes" | "daily_utc_time">,
  from: Date,
): Date | null {
  if (job.kind === "once") return null;
  if (job.kind === "interval") {
    const minutes = job.interval_minutes ?? 5;
    return new Date(from.getTime() + minutes * 60_000);
  }
  const time = job.daily_utc_time ?? "00:00";
  const [hh, mm] = time.split(":").map((part) => Number.parseInt(part, 10));
  const candidate = new Date(from);
  candidate.setUTCHours(hh, mm, 0, 0);
  if (candidate.getTime() <= from.getTime()) {
    candidate.setUTCDate(candidate.getUTCDate() + 1);
  }
  return candidate;
}

/**
 * وضعیت نگهبانی ساعت داخلی.
 * - paused: تیک و پمپ از داشبورد خاموش شده است (تصمیم کاربر، نه خرابی).
 * - healthy: تیک و پمپ روشن است و در پنجرهٔ نگهبانی، اجرای داخلی ثبت شده است.
 * - down: تیک و پمپ روشن است ولی در پنجره، هیچ اجرای داخلی ثبت نشده است.
 * - unknown: جدول کارها خالی است یا کار تیک و پمپ نیست.
 * فقط اجراهای با source برابر internal_worker شمرده می‌شوند؛ اجرای
 * دیسپچر بیرونی یا زمان‌بند گیت‌هاب، نگهبانی را سبز نمی‌کند.
 */
export function watchdogStatus(
  jobs: SchedulerJob[],
  runs: SchedulerRun[],
  now: Date,
): WatchdogStatus {
  const tickPump = jobs.find((job) => job.job_key === "tick_pump");
  if (!tickPump) return "unknown";
  if (!tickPump.enabled) return "paused";
  const windowStart = now.getTime() - WATCHDOG_WINDOW_MINUTES * 60_000;
  const recent = runs.some(
    (run) =>
      run.job_key === "tick_pump" &&
      run.source === "internal_worker" &&
      new Date(run.started_at).getTime() >= windowStart,
  );
  return recent ? "healthy" : "down";
}

/**
 * ترجمهٔ علت خرابی به زبان ساده برای داشبورد. متن خام خطا هرگز به
 * مرورگر نمی‌رسد؛ فقط همین جمله‌های ثابت. علت ناشناخته، جملهٔ کلی
 * می‌گیرد نه متن دیتابیس یا خروجی ابزار.
 */
export function plainErrorFa(error: string | null | undefined): string | null {
  if (!error) return null;
  // پیام سنجش بازنشستگی، خودش فارسیِ ساده است؛ همان را نشان بده.
  if (error.startsWith("retirement_gap:")) {
    return error.slice("retirement_gap:".length).trim() || "سنجش بازنشستگی شکاف نشان داد؛ چیزی خاموش نشد.";
  }
  const text = error.toLowerCase();
  if (text.includes("provider_unavailable") || text.includes("arrearage") || text.includes("upstream_error")) {
    return "سرویس مدل پاسخ نمی‌دهد؛ چیزی منتشر نشده است.";
  }
  if (text.includes("gsc") && (text.includes("credential") || text.includes("service_account") || text.includes("not created"))) {
    return "حساب سرویس سرچ کنسول هنوز ساخته نشده است؛ داده‌ای درج نشد.";
  }
  if (text.includes("llm") && (text.includes("missing") || text.includes("no active") || text.includes("not found"))) {
    return "درگاه مدل برای ساخت متن پیدا نشد؛ خبرها درج نشدند.";
  }
  if (text.includes("401") || text.includes("unauthorized")) {
    return "توکن داخلی معتبر نیست؛ اجرای کار رد شد.";
  }
  if (text.includes("timeout") || text.includes("timed out")) {
    return "پاسخ سرویس دیر رسید؛ اجرا ناتمام ماند.";
  }
  return "اجرای کار با خطا روبه‌رو شد؛ جزئیات در ledger است.";
}
