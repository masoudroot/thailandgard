/**
 * حلقهٔ ساعت داخلی پروژه (THG-SCHED-02).
 *
 * این فایل، تنها جایی است که کارها را اجرا می‌کند. تصمیم «چه وقت»
 * فقط از جدول scheduler_jobs خوانده می‌شود؛ هیچ زمان‌بند بیرونی
 * (GitHub Actions، Vercel Cron، دیسپچر، سرویس یادآور) این‌جا نیست.
 *
 * اجرا:
 *   npx tsx worker/scheduler-worker.ts            حلقهٔ هر ۶۰ ثانیه
 *   npx tsx worker/scheduler-worker.ts --once     یک دور کامل و خروج
 *   npx tsx worker/scheduler-worker.ts --job <key> یک کار، برای اثبات
 *
 * متغیرهای لازم (فقط نام؛ مقدار هرگز این‌جا نوشته نمی‌شود):
 *   SUPABASE_URL، SUPABASE_SERVICE_ROLE_KEY، INTERNAL_PUBLISH_TOKEN
 *   SCHEDULER_ORIGIN (پیش‌فرض https://thailandgard.ir)
 *   SCHEDULER_SITE_DIR (پیش‌فرض پوشهٔ کاری؛ اسکریپت‌های intel و gsc از آن‌جا اجرا می‌شوند)
 *   WORKER_TICK_MS (پیش‌فرض ۶۰۰۰۰)
 *
 * تک‌نمونه بودن با flock در اسکریپت راه‌انداز تضمین می‌شود، نه این‌جا؛
 * اگر دو نمونه هم‌زمان بالا بیایند، هر دو همان کار سررسیدشده را
 * می‌بینند ولی تیک و پمپ با Lease و idempotency در برابر هم‌پوشانی امن‌اند
 * و اسکریپت‌های intel و gsc هم idempotent هستند (ضدتکراری و upsert).
 * هیچ سکرتی در لاگ یا ledger نوشته نمی‌شود؛ خروجی اسکریپت‌ها پیش از
 * ذخیره، از خط‌های دارای کلید و توکن پاک می‌شود.
 */

import { spawn } from "node:child_process";
import { join } from "node:path";
import { logger } from "../lib/logger";
import { computeNextDue } from "../lib/scheduler/jobs";

type JobRow = {
  id: string;
  job_key: string;
  display_name: string;
  kind: "interval" | "daily";
  interval_minutes: number | null;
  daily_utc_time: string | null;
  enabled: boolean;
  next_due: string;
  last_run_at: string | null;
  last_status: string | null;
  last_result: unknown;
  last_error: string | null;
};

const SUPABASE_URL = (process.env.SUPABASE_URL ?? "").replace(/\/$/, "");
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const PUBLISH_TOKEN = process.env.INTERNAL_PUBLISH_TOKEN ?? "";
const ORIGIN = (process.env.SCHEDULER_ORIGIN ?? "https://thailandgard.ir").replace(/\/$/, "");
const SITE_DIR = process.env.SCHEDULER_SITE_DIR ?? process.cwd();
const TICK_MS = Number(process.env.WORKER_TICK_MS ?? 60_000) || 60_000;

function log(message: string): void {
  logger.info(`[scheduler-worker] ${message}`);
}

function headers(): Record<string, string> {
  return {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    "Content-Type": "application/json",
  };
}

async function postgrest(path: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { ...headers(), ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`postgrest ${path} failed with ${res.status}`);
  return text ? (JSON.parse(text) as unknown) : null;
}

async function getDueJobs(now: Date): Promise<JobRow[]> {
  const rows = (await postgrest(
    `scheduler_jobs?select=*&enabled=eq.true&next_due=lte.${encodeURIComponent(now.toISOString())}&order=next_due.asc`,
  )) as JobRow[];
  return rows;
}

async function getJob(jobKey: string): Promise<JobRow | null> {
  const rows = (await postgrest(
    `scheduler_jobs?select=*&job_key=eq.${encodeURIComponent(jobKey)}`,
  )) as JobRow[];
  return rows[0] ?? null;
}

async function updateJob(job: JobRow, status: string, result: unknown, error: string | null, finishedAt: Date): Promise<void> {
  const nextDue = computeNextDue(
    { kind: job.kind, interval_minutes: job.interval_minutes, daily_utc_time: job.daily_utc_time },
    finishedAt,
  );
  await postgrest(`scheduler_jobs?job_key=eq.${encodeURIComponent(job.job_key)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      last_run_at: finishedAt.toISOString(),
      last_status: status,
      last_result: result,
      last_error: error,
      next_due: nextDue.toISOString(),
      updated_at: finishedAt.toISOString(),
    }),
  });
}

async function insertRun(
  jobKey: string,
  trigger: string,
  status: string,
  startedAt: Date,
  finishedAt: Date,
  result: unknown,
  error: string | null,
): Promise<void> {
  await postgrest("scheduler_runs", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      job_key: jobKey,
      trigger,
      source: "internal_worker",
      status,
      started_at: startedAt.toISOString(),
      finished_at: finishedAt.toISOString(),
      result,
      error,
    }),
  });
}

/** پاک‌سازی خروجی اسکریپت از هر خطی که بوی سکرت بدهد. */
function scrubTail(text: string): string {
  const lines = text.split("\n").filter((line) => !/api[_-]?key|token|secret|password|bearer/i.test(line));
  return lines.slice(-20).join("\n").slice(-1500);
}

async function postInternal(path: string, timeoutMs: number): Promise<{ ok: boolean; status: number; body: unknown }> {
  const res = await fetch(`${ORIGIN}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-publish-token": PUBLISH_TOKEN,
    },
    body: "{}",
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? (JSON.parse(text) as unknown) : null;
  } catch {
    body = { raw: text.slice(0, 300) };
  }
  return { ok: res.ok, status: res.status, body };
}

function runScript(script: string, timeoutMs: number): Promise<{ code: number | null; tail: string }> {
  return new Promise((resolve) => {
    const child = spawn("npx", ["tsx", join("worker", script)], {
      cwd: SITE_DIR,
      env: process.env,
      timeout: timeoutMs,
    });
    let output = "";
    child.stdout?.on("data", (chunk: Buffer) => {
      output += chunk.toString();
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      output += chunk.toString();
    });
    child.on("error", (err: Error) => {
      resolve({ code: -1, tail: scrubTail(`spawn error: ${err.message}`) });
    });
    child.on("close", (code) => {
      resolve({ code, tail: scrubTail(output) });
    });
  });
}

async function runHandler(jobKey: string): Promise<{ status: "success" | "failed"; result: unknown; error: string | null }> {
  if (jobKey === "tick_pump") {
    const tick = await postInternal("/api/factory/tick", 240_000);
    const pump = await postInternal("/api/internal/process-outbox", 240_000);
    const result = { tick: tick.body, pump: pump.body };
    if (tick.ok && pump.ok) return { status: "success", result, error: null };
    return {
      status: "failed",
      result,
      error: `tick_http_${tick.status}_pump_http_${pump.status}`,
    };
  }
  if (jobKey === "autonomous_daily") {
    const cycle = await postInternal("/api/internal/autonomous-cycle", 240_000);
    if (cycle.ok) return { status: "success", result: cycle.body, error: null };
    return { status: "failed", result: cycle.body, error: `cycle_http_${cycle.status}` };
  }
  if (jobKey === "intel_daily") {
    const out = await runScript("intel-daily.ts", 20 * 60_000);
    if (out.code === 0) return { status: "success", result: { log_tail: out.tail }, error: null };
    return { status: "failed", result: { log_tail: out.tail }, error: `intel_script_exit_${out.code}` };
  }
  if (jobKey === "gsc_daily") {
    const out = await runScript("gsc-daily.ts", 15 * 60_000);
    if (out.code === 0) return { status: "success", result: { log_tail: out.tail }, error: null };
    return { status: "failed", result: { log_tail: out.tail }, error: `gsc_script_exit_${out.code}` };
  }
  return { status: "failed", result: null, error: `unknown_job_${jobKey}` };
}

async function runJob(job: JobRow, trigger: string): Promise<boolean> {
  const startedAt = new Date();
  log(`run ${job.job_key} (trigger=${trigger})`);
  let outcome: { status: "success" | "failed"; result: unknown; error: string | null };
  try {
    outcome = await runHandler(job.job_key);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    outcome = { status: "failed", result: null, error: message.slice(0, 300) };
  }
  const finishedAt = new Date();
  try {
    await insertRun(job.job_key, trigger, outcome.status, startedAt, finishedAt, outcome.result, outcome.error);
    await updateJob(job, outcome.status, outcome.result, outcome.error, finishedAt);
  } catch (err) {
    log(`ledger failed for ${job.job_key}: ${err instanceof Error ? err.message : "unknown"}`);
    return false;
  }
  log(`done ${job.job_key}: ${outcome.status}`);
  return outcome.status === "success";
}

async function runDueOnce(trigger: string): Promise<boolean> {
  const now = new Date();
  let allOk = true;
  let due: JobRow[];
  try {
    due = await getDueJobs(now);
  } catch (err) {
    log(`fetch due jobs failed: ${err instanceof Error ? err.message : "unknown"}`);
    return false;
  }
  for (const job of due) {
    const ok = await runJob(job, trigger);
    allOk = allOk && ok;
  }
  return allOk;
}

async function main(): Promise<number> {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    log("missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return 2;
  }
  const args = process.argv.slice(2);
  const jobIndex = args.indexOf("--job");
  if (jobIndex >= 0) {
    const jobKey = args[jobIndex + 1];
    if (!jobKey) {
      log("--job needs a job key");
      return 2;
    }
    const job = await getJob(jobKey);
    if (!job) {
      log(`unknown job: ${jobKey}`);
      return 2;
    }
    if (!job.enabled) {
      log(`job disabled, not running: ${jobKey}`);
      return 2;
    }
    const ok = await runJob(job, "manual_proof");
    return ok ? 0 : 1;
  }
  if (args.includes("--once")) {
    const ok = await runDueOnce("worker_loop");
    return ok ? 0 : 1;
  }
  log(`loop started (tick ${TICK_MS}ms, origin ${ORIGIN})`);
  for (;;) {
    try {
      await runDueOnce("worker_loop");
    } catch (err) {
      log(`loop iteration failed: ${err instanceof Error ? err.message : "unknown"}`);
    }
    await new Promise((resolve) => setTimeout(resolve, TICK_MS));
  }
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((err: unknown) => {
    log(`fatal: ${err instanceof Error ? err.message : "unknown"}`);
    process.exitCode = 1;
  });
