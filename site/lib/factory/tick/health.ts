/**
 * وضعیت واقعی کارخانهٔ Tick در R2-A، از روی دیتابیس سایت (staging).
 * فقط شمارش‌ها، کدهای خطا و وضعیت‌های عملیاتی برمی‌گردد؛ هیچ Secret،
 * توکن یا متن خطای دیتابیس در خروجی نیست. هر خطای خواندن، throw
 * می‌شود تا مسیر health آن را fail-closed به 503 تبدیل کند.
 *
 * فیلدهای R2 (configured تا lastRun) برای سازگاری مانده‌اند؛ R2-A
 * سه گروه اضافه می‌کند: کارهای در حال اجرا، خطاهای اخیر (فقط کد،
 * نه متن) و همهٔ Kill Switchها با مقدار خام‌شان.
 */
import { dbConfig, postgrestGet, type DbCfg } from "./internal-api";
import { evaluateKillSwitches } from "./factory-tick";

export interface RecentTickError {
  finishStatus: string;
  errorCode: string | null;
  startedAt: string;
}

export interface TickSwitches {
  factoryPaused: string | null;
  generationEnabled: string | null;
  dataPublishingEnabled: string | null;
  discoveryEnabled: string | null;
  codeAgentsEnabled: string | null;
  dailyBudgetLimit: string | null;
}

export interface TickHealth {
  configured: boolean;
  paused: boolean;
  publishingEnabled: boolean;
  stepsQueued: number;
  stepsClaimed: number;
  outboxOpen: number;
  lastRun: { status: string; finishedAt: string | null } | null;
  runningWorkItems: number;
  recentErrors: RecentTickError[];
  switches: TickSwitches;
}

/** پیکربندی Tick از env سایت؛ null یعنی Tick در این محیط پیکربندی نشده است. */
export function tickDbConfig(): DbCfg | null {
  return dbConfig();
}

export async function checkTickHealth(cfg: DbCfg): Promise<TickHealth> {
  const settingsRows = (await postgrestGet(cfg, "factory_settings?select=key,value")) as {
    key: string;
    value: string;
  }[];
  const settings: Record<string, string> = {};
  for (const row of settingsRows) settings[row.key] = row.value;
  const switches = evaluateKillSwitches(settings);

  const steps = (await postgrestGet(cfg, "factory_work_steps?select=status")) as { status: string }[];
  const stepsQueued = steps.filter((s) => s.status === "queued").length;
  const stepsClaimed = steps.filter((s) => s.status === "claimed").length;

  const outbox = (await postgrestGet(cfg, "factory_outbox_events?select=status")) as { status: string }[];
  const outboxOpen = outbox.filter((e) => e.status !== "succeeded" && e.status !== "failed").length;

  const runs = (await postgrestGet(
    cfg,
    "factory_runs?order=started_at.desc&limit=1&select=run_status,finished_at",
  )) as { run_status: string; finished_at: string | null }[];
  const lastRun = runs.length > 0 ? { status: runs[0].run_status, finishedAt: runs[0].finished_at } : null;

  // کارهای در حال اجرا: اجتماع Work Itemهای دارای Step claimed و
  // Work Itemهای با وضعیت publishing. فقط شناسه خوانده می‌شود.
  const claimedSteps = (await postgrestGet(
    cfg,
    "factory_work_steps?status=eq.claimed&select=work_item_id",
  )) as { work_item_id: string }[];
  const publishingItems = (await postgrestGet(
    cfg,
    "factory_work_items?status=eq.publishing&select=id",
  )) as { id: string }[];
  const runningIds = new Set<string>();
  for (const s of claimedSteps) runningIds.add(s.work_item_id);
  for (const wi of publishingItems) runningIds.add(wi.id);

  // خطاهای اخیر: فقط کد خطا و وضعیت پایان Attempt، نه متن خطا و نه
  // بار داده. پنج Attempt ناموفق اخیر، به ترتیب زمان شروع.
  const failedAttempts = (await postgrestGet(
    cfg,
    "factory_attempts?finish_status=in.(failed,timeout,outcome_unknown)&order=started_at.desc&limit=5&select=finish_status,error_code,started_at",
  )) as { finish_status: string; error_code: string | null; started_at: string }[];
  const recentErrors: RecentTickError[] = failedAttempts.map((a) => ({
    finishStatus: a.finish_status,
    errorCode: a.error_code,
    startedAt: a.started_at,
  }));

  return {
    configured: true,
    paused: switches.factoryPaused,
    publishingEnabled: switches.dataPublishingEnabled,
    stepsQueued,
    stepsClaimed,
    outboxOpen,
    lastRun,
    runningWorkItems: runningIds.size,
    recentErrors,
    switches: {
      factoryPaused: settings["factory_paused"] ?? null,
      generationEnabled: settings["generation_enabled"] ?? null,
      dataPublishingEnabled: settings["data_publishing_enabled"] ?? null,
      discoveryEnabled: settings["discovery_enabled"] ?? null,
      codeAgentsEnabled: settings["code_agents_enabled"] ?? null,
      dailyBudgetLimit: settings["daily_budget_limit"] ?? null,
    },
  };
}
