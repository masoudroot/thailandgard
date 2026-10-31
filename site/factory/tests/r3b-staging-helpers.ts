import {
  postgrestGet,
  postgrestRpc,
  postgrestWrite,
  type DbCfg,
} from "@/lib/factory/tick/internal-api";

/**
 * ابزار تست Staging برای R3B. فقط وقتی متغیرهای R3B_STAGING_*
 * داده شده باشند فعال است؛ در غیر این صورت، فایل‌های تست
 * وابسته skip می‌شوند و CI تحت تأثیر قرار نمی‌گیرد.
 * هیچ کلیدی در این فایل چاپ یا ذخیره نمی‌شود.
 */

export const GUIDE_DOC_ID = "2dd09695-6d9e-42ca-99f3-bf8c2c3e290c";

export interface StagingEnv {
  cfg: DbCfg;
  anonKey: string;
}

export function stagingEnv(): StagingEnv | null {
  const url = process.env.R3B_STAGING_URL;
  const serviceKey = process.env.R3B_STAGING_SERVICE_KEY;
  const anonKey = process.env.R3B_STAGING_ANON_KEY;
  if (!url || !serviceKey || !anonKey) {
    return null;
  }
  return { cfg: { url, serviceKey }, anonKey };
}

export async function setDailyLimit(cfg: DbCfg, value: number): Promise<void> {
  await postgrestWrite(cfg, "PATCH", "factory_settings?key=eq.daily_budget_limit", {
    value: String(value),
  });
}

export async function getDailyLimit(cfg: DbCfg): Promise<string | null> {
  const rows = (await postgrestGet(
    cfg,
    "factory_settings?key=eq.daily_budget_limit&select=value",
  )) as Record<string, unknown>[];
  return rows[0] ? String(rows[0]["value"]) : null;
}

export interface TestItem {
  itemId: string;
  stepId: string;
}

export async function makeTestItem(
  cfg: DbCfg,
  workKey: string,
  budgetLimit: number,
): Promise<TestItem> {
  const items = (await postgrestWrite(cfg, "POST", "factory_work_items", {
    work_key: workKey,
    work_type: "guide_edit",
    title: `R3B test ${workKey}`,
    description: "r3b staging test item",
    content_id: GUIDE_DOC_ID,
    status: "queued",
    execution_mode: "tick_managed",
    workflow_version: "gateway_test_v1",
    budget_limit: budgetLimit,
    budget_spent: 0,
  })) as Record<string, unknown>[];
  const item = items[0];
  if (!item) {
    throw new Error("test work item insert returned no row");
  }
  const itemId = String(item["id"]);
  const steps = (await postgrestWrite(cfg, "POST", "factory_work_steps", {
    work_item_id: itemId,
    step_key: "gateway_model_call",
    sequence_no: 1,
    status: "queued",
    attempt_count: 0,
    max_attempts: 5,
  })) as Record<string, unknown>[];
  const step = steps[0];
  if (!step) {
    throw new Error("test work step insert returned no row");
  }
  return { itemId, stepId: String(step["id"]) };
}

export async function getWorkItemByKey(
  cfg: DbCfg,
  workKey: string,
): Promise<Record<string, unknown> | null> {
  const rows = (await postgrestGet(
    cfg,
    `factory_work_items?work_key=eq.${encodeURIComponent(workKey)}&select=*`,
  )) as Record<string, unknown>[];
  return rows[0] ?? null;
}

export async function getStep(
  cfg: DbCfg,
  stepId: string,
): Promise<Record<string, unknown> | null> {
  const rows = (await postgrestGet(
    cfg,
    `factory_work_steps?id=eq.${encodeURIComponent(stepId)}&select=*`,
  )) as Record<string, unknown>[];
  return rows[0] ?? null;
}

export async function getOperationByLogicalId(
  cfg: DbCfg,
  logicalId: string,
): Promise<Record<string, unknown> | null> {
  const rows = (await postgrestGet(
    cfg,
    `factory_gateway_operations?logical_operation_id=eq.${encodeURIComponent(logicalId)}&order=created_at.desc&limit=1&select=*`,
  )) as Record<string, unknown>[];
  return rows[0] ?? null;
}

export async function getAttemptRows(
  cfg: DbCfg,
  workItemId: string,
): Promise<Record<string, unknown>[]> {
  return (await postgrestGet(
    cfg,
    `factory_attempts?work_item_id=eq.${encodeURIComponent(workItemId)}&select=*`,
  )) as Record<string, unknown>[];
}

export async function getLedgerRows(
  cfg: DbCfg,
  workItemId: string,
  factoryAttemptId: string,
): Promise<Record<string, unknown>[]> {
  return (await postgrestGet(
    cfg,
    `factory_cost_ledger?work_item_id=eq.${encodeURIComponent(workItemId)}&attempt_id=eq.${encodeURIComponent(factoryAttemptId)}&select=entry_kind,amount`,
  )) as Record<string, unknown>[];
}

export function countKind(
  rows: Record<string, unknown>[],
  kind: string,
): number {
  return rows.filter((row) => String(row["entry_kind"]) === kind).length;
}

export async function getReconciliationsForItem(
  cfg: DbCfg,
  workItemId: string,
): Promise<Record<string, unknown>[]> {
  return (await postgrestGet(
    cfg,
    `factory_gateway_reconciliations?work_item_id=eq.${encodeURIComponent(workItemId)}&order=created_at.asc&select=*`,
  )) as Record<string, unknown>[];
}

export async function getSettlementByKey(
  cfg: DbCfg,
  key: string,
): Promise<Record<string, unknown> | null> {
  const rows = (await postgrestGet(
    cfg,
    `factory_gateway_settlements?idempotency_key=eq.${encodeURIComponent(key)}&select=*`,
  )) as Record<string, unknown>[];
  return rows[0] ?? null;
}

export async function resetStepToQueued(
  cfg: DbCfg,
  stepId: string,
): Promise<void> {
  await postgrestWrite(cfg, "PATCH", `factory_work_steps?id=eq.${encodeURIComponent(stepId)}`, {
    status: "queued",
    lease_owner: null,
    lease_until: null,
    error_code: null,
  });
}

export async function quarantineItem(
  cfg: DbCfg,
  itemId: string,
): Promise<unknown> {
  return postgrestRpc(cfg, "quarantine_work_item", {
    p_work_item_id: itemId,
    p_reason: "r3b-test-cleanup",
    p_actor: "r3b-operator",
  });
}
