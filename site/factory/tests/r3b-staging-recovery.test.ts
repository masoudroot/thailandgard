import { describe, expect, it } from "vitest";
import { PostgrestBudgetLedger } from "@/lib/factory/gateway/ledger";
import { computeLogicalOperationId } from "@/lib/factory/gateway/operations";
import {
  GATEWAY_TEST_OPERATION,
  GATEWAY_TEST_STEP_KEY,
  recoverGatewayOperation,
  type RecoveryReport,
} from "@/lib/factory/tick/gateway-attempt-cycle";
import {
  getLedgerRows,
  countKind,
  getOperationByLogicalId,
  getReconciliationsForItem,
  getSettlementByKey,
  getStep,
  getWorkItemByKey,
  stagingEnv,
} from "./r3b-staging-helpers";

/**
 * فایل بازیابی پس از Restart. این فایل در فرایندی کاملاً جدا از
 * فایل چرخه اجرا می‌شود (فراخوان vitest جداگانه با PID تازه) و
 * هیچ وضعیتی از حافظهٔ فرایند چرخه به آن نمی‌رسد: کلیدهای کار
 * قطعی‌اند و شناسهٔ عملیات منطقی از روی شناسهٔ Work Item دوباره
 * محاسبه می‌شود. تنها منبع حقیقت، سطرهای دیتابیس است. این فایل
 * هرگز Provider را صدا نمی‌زند؛ بازیابی فقط ledger و سطر عملیات
 * را می‌خواند و می‌نویسد.
 */

const STAGING = stagingEnv();
const SCENARIO = process.env.R3B_SCENARIO ?? "";
const only = (n: string) => SCENARIO !== "" && SCENARIO !== n;

async function recoverUntilStable(
  cfg: NonNullable<typeof STAGING>["cfg"],
  logicalId: string,
): Promise<{ reports: RecoveryReport[]; finalState: string }> {
  const ledger = new PostgrestBudgetLedger({ url: cfg.url, serviceKey: cfg.serviceKey });
  const reports: RecoveryReport[] = [];
  let lastState = "";
  for (let i = 0; i < 5; i += 1) {
    const report = await recoverGatewayOperation(cfg, ledger, logicalId);
    reports.push(report);
    const changed = report.state_after !== report.state_before;
    lastState = report.state_after;
    const terminal = ["settled", "released", "referred", "failed", "abandoned"].includes(lastState);
    if (!changed && (report.action.includes("no action") || report.action.includes("nothing to recover") || terminal)) {
      break;
    }
    if (!changed && report.action.includes("terminal operation with an unfinished step")) {
      continue;
    }
    if (!changed) {
      break;
    }
  }
  return { reports, finalState: lastState };
}

describe.skipIf(!STAGING)("r3b staging recovery in a fresh process", () => {
  // بدنهٔ describe حتی در حالت skip هم در زمان جمع‌آوری اجرا
  // می‌شود؛ پس cfg باید null-safe باشد. این مقدار ساختگی فقط
  // وقتی STAGING نیست دیده می‌شود و هرگز مصرف نمی‌شود.
  const env = STAGING ?? { cfg: { url: "", serviceKey: "" }, anonKey: "" };
  const cfg = env.cfg;

  it.skipIf(only("4"))("S4 recovery: pending with reservation -> released", async () => {
    const item = await getWorkItemByKey(cfg, "r3b-test-s4");
    expect(item).not.toBeNull();
    const logicalId = computeLogicalOperationId(item?.id as string, GATEWAY_TEST_STEP_KEY, GATEWAY_TEST_OPERATION);
    const before = await getOperationByLogicalId(cfg, logicalId);
    expect(before?.state).toBe("pending");
    expect(before?.provider_calls).toBe(0);
    const { reports, finalState } = await recoverUntilStable(cfg, logicalId);
    expect(finalState).toBe("released");
    expect(reports[0].state_before).toBe("pending");
    expect(reports[0].state_after).toBe("reserved");
    const released = reports.find((r) => r.state_after === "released");
    expect(released).toBeDefined();
    const after = await getOperationByLogicalId(cfg, logicalId);
    expect(after?.provider_calls).toBe(0);
    const rows = await getLedgerRows(cfg, item?.id as string, after?.factory_attempt_id as string);
    expect(countKind(rows, "reservation")).toBe(1);
    expect(countKind(rows, "release")).toBe(1);
    expect(countKind(rows, "commit")).toBe(0);
  });

  it.skipIf(only("4b"))("S4b recovery: released operation finishes the step as blocked", async () => {
    const item = await getWorkItemByKey(cfg, "r3b-test-s4b");
    expect(item).not.toBeNull();
    const logicalId = computeLogicalOperationId(item?.id as string, GATEWAY_TEST_STEP_KEY, GATEWAY_TEST_OPERATION);
    const before = await getOperationByLogicalId(cfg, logicalId);
    expect(before?.state).toBe("pending");
    const { finalState } = await recoverUntilStable(cfg, logicalId);
    expect(finalState).toBe("released");
    const after = await getOperationByLogicalId(cfg, logicalId);
    expect(after?.provider_calls).toBe(0);
    const step = await getStep(cfg, before?.work_step_id as string);
    expect(step?.status).toBe("blocked");
    expect(step?.error_code).toBe("timeout");
    const rows = await getLedgerRows(cfg, item?.id as string, after?.factory_attempt_id as string);
    expect(countKind(rows, "reservation")).toBe(1);
    expect(countKind(rows, "release")).toBe(1);
    expect(countKind(rows, "commit")).toBe(0);
  });

  it.skipIf(only("5"))("S5 recovery: sent without response stays unknown", async () => {
    const item = await getWorkItemByKey(cfg, "r3b-test-s5");
    expect(item).not.toBeNull();
    const logicalId = computeLogicalOperationId(item?.id as string, GATEWAY_TEST_STEP_KEY, GATEWAY_TEST_OPERATION);
    const before = await getOperationByLogicalId(cfg, logicalId);
    expect(before?.state).toBe("sent");
    expect(before?.provider_calls).toBe(1);
    const { reports, finalState } = await recoverUntilStable(cfg, logicalId);
    expect(finalState).toBe("unknown");
    expect(reports[0].state_before).toBe("sent");
    expect(reports[0].state_after).toBe("unknown");
    const after = await getOperationByLogicalId(cfg, logicalId);
    expect(after?.provider_calls).toBe(1);
    expect(await getSettlementByKey(cfg, "r3b-s5-key")).toBeNull();
    const recs = await getReconciliationsForItem(cfg, item?.id as string);
    const unknown = recs.find((r) => r["kind"] === "unknown");
    expect(unknown?.status).toBe("pending_reconciliation");
  });

  it.skipIf(only("6"))("S6 recovery: stored response settles without a new call", async () => {
    const item = await getWorkItemByKey(cfg, "r3b-test-s6");
    expect(item).not.toBeNull();
    const logicalId = computeLogicalOperationId(item?.id as string, GATEWAY_TEST_STEP_KEY, GATEWAY_TEST_OPERATION);
    const before = await getOperationByLogicalId(cfg, logicalId);
    expect(before?.state).toBe("response_recorded");
    const { finalState } = await recoverUntilStable(cfg, logicalId);
    expect(finalState).toBe("settled");
    const after = await getOperationByLogicalId(cfg, logicalId);
    expect(after?.provider_calls).toBe(1);
    expect(after?.settled_amount).toBe(30);
    const settlement = await getSettlementByKey(cfg, "r3b-s6-key");
    expect(settlement).not.toBeNull();
    expect(Number(settlement?.committed_amount)).toBe(30);
    const step = await getStep(cfg, before?.work_step_id as string);
    expect(step?.status).toBe("succeeded");
    const rows = await getLedgerRows(cfg, item?.id as string, after?.factory_attempt_id as string);
    expect(countKind(rows, "commit")).toBe(1);
  });

  it.skipIf(only("7a"))("S7a recovery: existing settlement finishes the step", async () => {
    const item = await getWorkItemByKey(cfg, "r3b-test-s7a");
    expect(item).not.toBeNull();
    const logicalId = computeLogicalOperationId(item?.id as string, GATEWAY_TEST_STEP_KEY, GATEWAY_TEST_OPERATION);
    const before = await getOperationByLogicalId(cfg, logicalId);
    expect(before?.state).toBe("response_recorded");
    expect(await getSettlementByKey(cfg, "r3b-s7a-key")).not.toBeNull();
    const { finalState } = await recoverUntilStable(cfg, logicalId);
    expect(finalState).toBe("settled");
    const step = await getStep(cfg, before?.work_step_id as string);
    expect(step?.status).toBe("succeeded");
    const after = await getOperationByLogicalId(cfg, logicalId);
    expect(after?.provider_calls).toBe(1);
  });

  it.skipIf(only("7b"))("S7b recovery: settled_unreturned finishes the step", async () => {
    const item = await getWorkItemByKey(cfg, "r3b-test-s7b");
    expect(item).not.toBeNull();
    const logicalId = computeLogicalOperationId(item?.id as string, GATEWAY_TEST_STEP_KEY, GATEWAY_TEST_OPERATION);
    const before = await getOperationByLogicalId(cfg, logicalId);
    expect(before?.state).toBe("settled_unreturned");
    const { finalState } = await recoverUntilStable(cfg, logicalId);
    expect(finalState).toBe("settled");
    const step = await getStep(cfg, before?.work_step_id as string);
    expect(step?.status).toBe("succeeded");
    const settlement = await getSettlementByKey(cfg, "r3b-s7b-key");
    expect(Number(settlement?.committed_amount)).toBe(30);
  });
});
