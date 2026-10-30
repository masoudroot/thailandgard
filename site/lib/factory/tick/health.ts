/**
 * وضعیت واقعی کارخانهٔ Tick در R2، از روی دیتابیس سایت (staging).
 * فقط شمارش‌ها و وضعیت‌های عملیاتی برمی‌گردد؛ هیچ Secret، توکن یا
 * متن خطای دیتابیس در خروجی نیست. هر خطای خواندن، throw می‌شود تا
 * مسیر health آن را fail-closed به 503 تبدیل کند.
 */
import { dbConfig, postgrestGet, type DbCfg } from "./internal-api";
import { evaluateKillSwitches } from "./factory-tick";

export interface TickHealth {
  configured: boolean;
  paused: boolean;
  publishingEnabled: boolean;
  stepsQueued: number;
  stepsClaimed: number;
  outboxOpen: number;
  lastRun: { status: string; finishedAt: string | null } | null;
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

  return {
    configured: true,
    paused: switches.factoryPaused,
    publishingEnabled: switches.dataPublishingEnabled,
    stepsQueued,
    stepsClaimed,
    outboxOpen,
    lastRun,
  };
}
