import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { z } from "zod";
import { ModelGateway } from "@/lib/factory/gateway/gateway";
import { PostgrestBudgetLedger } from "@/lib/factory/gateway/ledger";
import { MockProvider } from "@/lib/factory/gateway/mock-provider";
import { createDefaultRegistry } from "@/lib/factory/gateway/provider";
import { SimulatedCrashError } from "@/lib/factory/gateway/crash-test";
import {
  computeLogicalOperationId,
} from "@/lib/factory/gateway/operations";
import {
  GATEWAY_TEST_OPERATION,
  GATEWAY_TEST_STEP_KEY,
  runGatewayAttemptCycle,
  resolveOperationReconciliation,
  type GatewayCycleInput,
} from "@/lib/factory/tick/gateway-attempt-cycle";
import {
  countKind,
  getLedgerRows,
  getOperationByLogicalId,
  getReconciliationsForItem,
  getSettlementByKey,
  getStep,
  getDailyLimit,
  getAttemptRows,
  makeTestItem,
  resetStepToQueued,
  setDailyLimit,
  stagingEnv,
} from "./r3b-staging-helpers";

const ANSWER_SCHEMA = z.object({ answer: z.string() });
const STAGING = stagingEnv();
const SCENARIO = process.env.R3B_SCENARIO ?? "";
const only = (n: string) => SCENARIO !== "" && SCENARIO !== n;
const crashOff = process.env.R3B_TEST_MODE !== "1";

function ledger(cfg: NonNullable<typeof STAGING>["cfg"]) {
  return new PostgrestBudgetLedger({ url: cfg.url, serviceKey: cfg.serviceKey });
}

function cycleInput(
  itemId: string,
  key: string,
  tokenLimit: number,
  timeout = 5000,
): GatewayCycleInput {
  return {
    work_item_id: itemId,
    operation_name: GATEWAY_TEST_OPERATION,
    idempotency_key: key,
    capability: "test-cap",
    provider: "mock",
    model_id: "mock-1",
    prompt_version: "v1",
    token_limit: tokenLimit,
    timeout,
    input: { q: "r3b" },
    output_schema: ANSWER_SCHEMA,
  };
}

async function mockOkCycle(
  cfg: NonNullable<typeof STAGING>["cfg"],
  input: GatewayCycleInput,
  mockConfig: Record<string, unknown> = {},
) {
  return runGatewayAttemptCycle(
    cfg,
    {
      ledger: ledger(cfg),
      estimateUnitPrice: 1,
      mockConfig: mockConfig as never,
    },
    input,
  );
}

describe.skipIf(!STAGING)("r3b staging cycle", () => {
  // بدنهٔ describe حتی در حالت skip هم در زمان جمع‌آوری اجرا
  // می‌شود؛ پس cfg و anonKey باید null-safe باشند. تست‌ها فقط
  // وقتی STAGING هست اجرا می‌شوند و این مقدارهای ساختگی هرگز
  // مصرف نمی‌شوند.
  const env = STAGING ?? { cfg: { url: "", serviceKey: "" }, anonKey: "" };
  const cfg = env.cfg;
  let savedDaily: string | null = null;

  beforeAll(async () => {
    savedDaily = await getDailyLimit(cfg);
    await setDailyLimit(cfg, 1_000_000);
  });

  afterAll(async () => {
    if (savedDaily !== null) {
      await setDailyLimit(cfg, Number(savedDaily));
    }
  });

  it.skipIf(only("1"))("S1: full cycle with a real attempt and simulated cost", async () => {
    const { itemId } = await makeTestItem(cfg, "r3b-test-s1", 1_000_000);
    const out = await mockOkCycle(cfg, cycleInput(itemId, "r3b-s1-key", 30), {
      promptTokens: 10,
      completionTokens: 5,
      costPerToken: 2,
    });
    expect(out.gatewayResponse?.outcome).toBe("succeeded");
    expect(out.stepStatus).toBe("succeeded");
    expect(out.operation.state).toBe("settled");
    expect(out.gatewayResponse?.actual_cost).toBe(30);
    expect(out.gatewayResponse?.settled_cost).toBe(30);
    expect(out.gatewayResponse?.actual_cost_basis).toBe("simulated");
    expect(out.gatewayResponse?.cost_unit).toBe("mock-unit");
    expect(out.mockCalls).toBe(1);
    expect(out.providerCalls).toBe(1);
    expect(out.operation.factory_attempt_id).not.toBeNull();
    const rows = await getLedgerRows(cfg, itemId, out.operation.factory_attempt_id as string);
    expect(countKind(rows, "reservation")).toBe(1);
    expect(countKind(rows, "commit")).toBe(1);
    expect(countKind(rows, "release")).toBe(0);
    expect(countKind(rows, "rejected")).toBe(0);
  });

  it.skipIf(only("2"))("S2: two concurrent cycles for one operation", async () => {
    const { itemId } = await makeTestItem(cfg, "r3b-test-s2", 1_000_000);
    const a = mockOkCycle(cfg, cycleInput(itemId, "r3b-s2-key-a", 30), {
      promptTokens: 10,
      completionTokens: 5,
      costPerToken: 2,
    });
    const b = mockOkCycle(cfg, cycleInput(itemId, "r3b-s2-key-b", 30), {
      promptTokens: 10,
      completionTokens: 5,
      costPerToken: 2,
    });
    const settled = await Promise.allSettled([a, b]);
    const won = settled.filter((r) => r.status === "fulfilled");
    const lost = settled.filter((r) => r.status === "rejected");
    expect(won).toHaveLength(1);
    expect(lost).toHaveLength(1);
    const loser = (lost[0] as PromiseRejectedResult).reason as Error & { code?: string };
    expect(loser.code).toBe("operation_blocked");
    const winner = (won[0] as PromiseFulfilledResult<Awaited<typeof a>>).value;
    expect(winner.mockCalls).toBe(1);
    expect(winner.providerCalls).toBe(1);
    const logicalId = computeLogicalOperationId(itemId, GATEWAY_TEST_STEP_KEY, GATEWAY_TEST_OPERATION);
    const op = await getOperationByLogicalId(cfg, logicalId);
    expect(op?.provider_calls).toBe(1);
    const winnerRows = await getLedgerRows(cfg, itemId, winner.operation.factory_attempt_id as string);
    expect(countKind(winnerRows, "reservation")).toBe(1);
    const attemptRows = await getAttemptRows(cfg, itemId);
    expect(attemptRows.length).toBe(1);
  });

  it.skipIf(only("3"))("S3: missing, zero, and sufficient caps", async () => {
    const gateway = new ModelGateway({
      registry: (() => {
        const r = createDefaultRegistry();
        r.register(new MockProvider({}));
        return r;
      })(),
      ledger: ledger(cfg),
      estimateUnitPrice: 1,
    });
    const missing = await gateway.call({
      work_item_id: "99999999-9999-4999-8999-999999999999",
      work_step_id: "88888888-8888-4888-8888-888888888888",
      attempt_id: "77777777-7777-4777-8777-777777777777",
      factory_attempt_id: "66666666-6666-4666-8666-666666666666",
      capability: "test-cap",
      provider: "mock",
      model_id: "mock-1",
      prompt_version: "v1",
      token_limit: 30,
      timeout: 5000,
      idempotency_key: "r3b-s3-missing-key",
      input: { q: "r3b" },
      output_schema: ANSWER_SCHEMA,
    });
    expect(missing.outcome).toBe("failed");
    expect(missing.error?.code).toBe("budget_not_configured");

    const zero = await makeTestItem(cfg, "r3b-test-s3b", 0);
    const zeroOut = await mockOkCycle(cfg, cycleInput(zero.itemId, "r3b-s3b-key", 30), {
      promptTokens: 10,
      completionTokens: 5,
      costPerToken: 2,
    });
    expect(zeroOut.gatewayResponse?.outcome).toBe("failed");
    expect(zeroOut.gatewayResponse?.error?.code).toBe("budget_exceeded");
    expect(zeroOut.mockCalls).toBe(0);
    expect(zeroOut.providerCalls).toBe(0);
    const zeroRows = await getLedgerRows(cfg, zero.itemId, zeroOut.operation.factory_attempt_id as string);
    expect(countKind(zeroRows, "rejected")).toBe(1);
    expect(countKind(zeroRows, "reservation")).toBe(0);

    const ok = await makeTestItem(cfg, "r3b-test-s3c", 1_000_000);
    const okOut = await mockOkCycle(cfg, cycleInput(ok.itemId, "r3b-s3c-key", 100), {});
    expect(okOut.gatewayResponse?.outcome).toBe("succeeded");
    expect(okOut.mockCalls).toBe(1);
  });

  it.skipIf(only("9"))("S9: same-key replay and different-input conflict", async () => {
    const { itemId } = await makeTestItem(cfg, "r3b-test-s9", 1_000_000);
    const first = await mockOkCycle(cfg, cycleInput(itemId, "r3b-s9-key", 30), {
      promptTokens: 10,
      completionTokens: 5,
      costPerToken: 2,
    });
    expect(first.gatewayResponse?.outcome).toBe("succeeded");
    const firstRows = await getLedgerRows(cfg, itemId, first.operation.factory_attempt_id as string);
    const replay = await mockOkCycle(cfg, cycleInput(itemId, "r3b-s9-key", 30), {
      promptTokens: 10,
      completionTokens: 5,
      costPerToken: 2,
    });
    expect(replay.replayed).toBe(true);
    expect(replay.mockCalls).toBe(0);
    const replayRows = await getLedgerRows(cfg, itemId, first.operation.factory_attempt_id as string);
    expect(replayRows.length).toBe(firstRows.length);
    let conflict: (Error & { code?: string }) | null = null;
    try {
      await mockOkCycle(cfg, cycleInput(itemId, "r3b-s9-key", 31), {
        promptTokens: 10,
        completionTokens: 5,
        costPerToken: 2,
      });
    } catch (error) {
      conflict = error as Error & { code?: string };
    }
    expect(conflict?.code).toBe("idempotency_key_conflict");
  });

  it.skipIf(only("10"))("S10: fresh key blocked while open, allowed after resolution", async () => {
    const { itemId, stepId } = await makeTestItem(cfg, "r3b-test-s10", 1_000_000);
    const first = await mockOkCycle(
      cfg,
      cycleInput(itemId, "r3b-s10-key", 30, 500),
      { mode: "hang" },
    );
    expect(first.gatewayResponse?.outcome).toBe("unknown");
    expect(first.stepStatus).toBe("blocked");
    const logicalId = computeLogicalOperationId(itemId, GATEWAY_TEST_STEP_KEY, GATEWAY_TEST_OPERATION);
    const openOp = await getOperationByLogicalId(cfg, logicalId);
    expect(openOp?.state).toBe("unknown");
    let blocked: (Error & { code?: string }) | null = null;
    try {
      await mockOkCycle(cfg, cycleInput(itemId, "r3b-s10-key-fresh", 30), {
        promptTokens: 10,
        completionTokens: 5,
        costPerToken: 2,
      });
    } catch (error) {
      blocked = error as Error & { code?: string };
    }
    expect(blocked?.code).toBe("operation_blocked");
    const gateway = new ModelGateway({
      registry: createDefaultRegistry(),
      ledger: ledger(cfg),
      estimateUnitPrice: 1,
    });
    const retrySameAttempt = await gateway.call({
      work_item_id: itemId,
      work_step_id: stepId,
      attempt_id: openOp?.gateway_attempt_id as string,
      factory_attempt_id: openOp?.factory_attempt_id as string,
      capability: "test-cap",
      provider: "mock",
      model_id: "mock-1",
      prompt_version: "v1",
      token_limit: 30,
      timeout: 5000,
      idempotency_key: "r3b-s10-key-retry",
      input: { q: "r3b" },
      output_schema: ANSWER_SCHEMA,
    });
    expect(retrySameAttempt.outcome).toBe("failed");
    expect(retrySameAttempt.error?.code).toBe("reconciliation_pending");
    const opRow = await getOperationByLogicalId(cfg, logicalId);
    const resolved = await resolveOperationReconciliation(
      cfg,
      gateway,
      opRow as unknown as import("@/lib/factory/gateway/operations").OperationRow,
      "release",
      "test operator attestation: provider never processed (staging test)",
      "r3b-operator",
      "test resolution after timeout",
    );
    expect(resolved.state).toBe("released");
    await resetStepToQueued(cfg, stepId);
    const retry = await mockOkCycle(
      cfg,
      {
        ...cycleInput(itemId, "r3b-s10-key-retry-allowed", 30),
        prior_operation_id: openOp?.id as string,
        retry_reason: "previous attempt resolved by operator release",
      },
      { promptTokens: 10, completionTokens: 5, costPerToken: 2 },
    );
    expect(retry.gatewayResponse?.outcome).toBe("succeeded");
    expect(retry.operation.prior_operation_id).toBe(openOp?.id);
  }, 30000);

  it.skipIf(only("11"))("S11: actual above reservation, open excess, debt guard", async () => {
    const { itemId, stepId } = await makeTestItem(cfg, "r3b-test-s11", 1_000_000);
    const first = await mockOkCycle(cfg, cycleInput(itemId, "r3b-s11-key", 10), {
      promptTokens: 10,
      completionTokens: 5,
      costPerToken: 2,
    });
    expect(first.gatewayResponse?.outcome).toBe("succeeded");
    expect(first.gatewayResponse?.actual_cost).toBe(30);
    expect(first.gatewayResponse?.settled_cost).toBe(10);
    expect(first.gatewayResponse?.reconciliation?.excess_amount).toBe(20);
    expect(first.operation.unresolved_excess).toBe(20);
    const recs = await getReconciliationsForItem(cfg, itemId);
    const excess = recs.find((r) => r["kind"] === "excess");
    expect(excess?.status).toBe("pending_reconciliation");
    expect(Number(excess?.excess_amount)).toBe(20);
    let debt: (Error & { code?: string }) | null = null;
    try {
      await mockOkCycle(cfg, cycleInput(itemId, "r3b-s11-key-debt", 30), {
        promptTokens: 10,
        completionTokens: 5,
        costPerToken: 2,
      });
    } catch (error) {
      debt = error as Error & { code?: string };
    }
    expect(debt?.code).toBe("debt_open");
    const gateway = new ModelGateway({
      registry: createDefaultRegistry(),
      ledger: ledger(cfg),
      estimateUnitPrice: 1,
    });
    const logicalId = computeLogicalOperationId(itemId, GATEWAY_TEST_STEP_KEY, GATEWAY_TEST_OPERATION);
    const opRow = await getOperationByLogicalId(cfg, logicalId);
    const resolved = await resolveOperationReconciliation(
      cfg,
      gateway,
      opRow as unknown as import("@/lib/factory/gateway/operations").OperationRow,
      "commit",
      "test operator evidence: provider reported actual 30",
      "r3b-operator",
      "test excess resolution",
      30,
    );
    expect(resolved.state).toBe("settled");
    expect(resolved.unresolved_excess).toBeNull();
    await resetStepToQueued(cfg, stepId);
    const retry = await mockOkCycle(
      cfg,
      {
        ...cycleInput(itemId, "r3b-s11-key-after-debt", 30),
        prior_operation_id: opRow?.id as string,
        retry_reason: "excess resolved by operator commit",
      },
      { promptTokens: 10, completionTokens: 5, costPerToken: 2 },
    );
    expect(retry.gatewayResponse?.outcome).toBe("succeeded");
  }, 30000);

  it.skipIf(only("12"))("S12: timeout holds the reservation, no blind retry", async () => {
    const { itemId } = await makeTestItem(cfg, "r3b-test-s12", 1_000_000);
    const first = await mockOkCycle(
      cfg,
      cycleInput(itemId, "r3b-s12-key", 30, 500),
      { mode: "hang" },
    );
    expect(first.gatewayResponse?.outcome).toBe("unknown");
    expect(first.providerCalls).toBe(1);
    const rows = await getLedgerRows(cfg, itemId, first.operation.factory_attempt_id as string);
    expect(countKind(rows, "reservation")).toBe(1);
    expect(countKind(rows, "release")).toBe(0);
    expect(countKind(rows, "commit")).toBe(0);
    let blocked: (Error & { code?: string }) | null = null;
    try {
      await mockOkCycle(cfg, cycleInput(itemId, "r3b-s12-key-fresh", 30), {
        promptTokens: 10,
        completionTokens: 5,
        costPerToken: 2,
      });
    } catch (error) {
      blocked = error as Error & { code?: string };
    }
    expect(blocked?.code).toBe("operation_blocked");
  }, 30000);

  it.skipIf(only("13"))("S13: no provider call on budget rejection", async () => {
    const { itemId } = await makeTestItem(cfg, "r3b-test-s13", 0);
    const out = await mockOkCycle(cfg, cycleInput(itemId, "r3b-s13-key", 30), {
      promptTokens: 10,
      completionTokens: 5,
      costPerToken: 2,
    });
    expect(out.gatewayResponse?.outcome).toBe("failed");
    expect(out.gatewayResponse?.error?.code).toBe("budget_exceeded");
    expect(out.mockCalls).toBe(0);
    expect(out.providerCalls).toBe(0);
    const rows = await getLedgerRows(cfg, itemId, out.operation.factory_attempt_id as string);
    expect(countKind(rows, "reservation")).toBe(0);
    expect(countKind(rows, "rejected")).toBe(1);
  });

  it.skipIf(only("14"))("S14: anon cannot read operations, service role can", async () => {
    const { itemId } = await makeTestItem(cfg, "r3b-test-s14b", 1_000_000);
    const first = await mockOkCycle(cfg, cycleInput(itemId, "r3b-s14b-key", 30), {
      promptTokens: 10,
      completionTokens: 5,
      costPerToken: 2,
    });
    expect(first.gatewayResponse?.outcome).toBe("succeeded");
    const logicalId = computeLogicalOperationId(itemId, GATEWAY_TEST_STEP_KEY, GATEWAY_TEST_OPERATION);
    const serviceRow = await getOperationByLogicalId(cfg, logicalId);
    expect(serviceRow).not.toBeNull();
    const anonRes = await fetch(
      `${cfg.url}/rest/v1/factory_gateway_operations?select=id&limit=5`,
      {
        headers: { apikey: env.anonKey, Authorization: `Bearer ${env.anonKey}` },
      },
    );
    // انکار دسترسی anon دو شکل درست دارد: یا 401/403 (وقتی هیچ
    // GRANTای نیست، مثل همین جدول) یا 200 با آرایهٔ تهی (وقتی
    // RLS با صفر policy جلوی سطرها را می‌گیرد). در هر دو شکل،
    // anon هیچ سطری نمی‌بیند.
    if (anonRes.status === 200) {
      const anonRows = (await anonRes.json()) as unknown[];
      expect(Array.isArray(anonRows)).toBe(true);
      expect(anonRows.length).toBe(0);
    } else {
      expect([401, 403]).toContain(anonRes.status);
    }
  });

  it.skipIf(only("4") || crashOff)("S4: crash after reserve, before provider call", async () => {
    const { itemId, stepId } = await makeTestItem(cfg, "r3b-test-s4", 1_000_000);
    let crash: unknown = null;
    try {
      await mockOkCycle(cfg, cycleInput(itemId, "r3b-s4-key", 30), {
        promptTokens: 10,
        completionTokens: 5,
        costPerToken: 2,
      });
    } catch (error) {
      crash = error;
    }
    expect(crash).toBeInstanceOf(SimulatedCrashError);
    const logicalId = computeLogicalOperationId(itemId, GATEWAY_TEST_STEP_KEY, GATEWAY_TEST_OPERATION);
    const op = await getOperationByLogicalId(cfg, logicalId);
    expect(op?.state).toBe("pending");
    expect(op?.provider_calls).toBe(0);
    expect(op?.factory_attempt_id).not.toBeNull();
    const rows = await getLedgerRows(cfg, itemId, op?.factory_attempt_id as string);
    expect(countKind(rows, "reservation")).toBe(1);
    expect(await getSettlementByKey(cfg, "r3b-s4-key")).toBeNull();
    const step = await getStep(cfg, stepId);
    expect(step?.status).toBe("claimed");
  }, 30000);

  it.skipIf(only("4b") || crashOff)("S4b: regression: released operation must not finish the step as succeeded", async () => {
    const { itemId, stepId } = await makeTestItem(cfg, "r3b-test-s4b", 1_000_000);
    let crash: unknown = null;
    try {
      await mockOkCycle(cfg, cycleInput(itemId, "r3b-s4b-key", 30), {
        promptTokens: 10,
        completionTokens: 5,
        costPerToken: 2,
      });
    } catch (error) {
      crash = error;
    }
    expect(crash).toBeInstanceOf(SimulatedCrashError);
    const logicalId = computeLogicalOperationId(itemId, GATEWAY_TEST_STEP_KEY, GATEWAY_TEST_OPERATION);
    const op = await getOperationByLogicalId(cfg, logicalId);
    expect(op?.state).toBe("pending");
    expect(op?.provider_calls).toBe(0);
    const step = await getStep(cfg, stepId);
    expect(step?.status).toBe("claimed");
  }, 30000);

  it.skipIf(only("5") || crashOff)("S5: crash after send, before durable response", async () => {
    const { itemId, stepId } = await makeTestItem(cfg, "r3b-test-s5", 1_000_000);
    let crash: unknown = null;
    try {
      await mockOkCycle(cfg, cycleInput(itemId, "r3b-s5-key", 30), {
        promptTokens: 10,
        completionTokens: 5,
        costPerToken: 2,
      });
    } catch (error) {
      crash = error;
    }
    expect(crash).toBeInstanceOf(SimulatedCrashError);
    const logicalId = computeLogicalOperationId(itemId, GATEWAY_TEST_STEP_KEY, GATEWAY_TEST_OPERATION);
    const op = await getOperationByLogicalId(cfg, logicalId);
    expect(op?.state).toBe("sent");
    expect(op?.provider_calls).toBe(1);
    expect(op?.response_json).toBeNull();
    expect(await getSettlementByKey(cfg, "r3b-s5-key")).toBeNull();
    const step = await getStep(cfg, stepId);
    expect(step?.status).toBe("claimed");
  }, 30000);

  it.skipIf(only("6") || crashOff)("S6: crash after durable response, before settlement", async () => {
    const { itemId, stepId } = await makeTestItem(cfg, "r3b-test-s6", 1_000_000);
    let crash: unknown = null;
    try {
      await mockOkCycle(cfg, cycleInput(itemId, "r3b-s6-key", 30), {
        promptTokens: 10,
        completionTokens: 5,
        costPerToken: 2,
      });
    } catch (error) {
      crash = error;
    }
    expect(crash).toBeInstanceOf(SimulatedCrashError);
    const logicalId = computeLogicalOperationId(itemId, GATEWAY_TEST_STEP_KEY, GATEWAY_TEST_OPERATION);
    const op = await getOperationByLogicalId(cfg, logicalId);
    expect(op?.state).toBe("response_recorded");
    expect(op?.provider_calls).toBe(1);
    expect(op?.response_json).not.toBeNull();
    expect(Number((op?.response_json as Record<string, unknown>)["cost"])).toBe(30);
    expect(await getSettlementByKey(cfg, "r3b-s6-key")).toBeNull();
    const step = await getStep(cfg, stepId);
    expect(step?.status).toBe("claimed");
  }, 30000);

  it.skipIf(only("7a") || crashOff)("S7a: crash after settlement, before step finish", async () => {
    const { itemId, stepId } = await makeTestItem(cfg, "r3b-test-s7a", 1_000_000);
    let crash: unknown = null;
    try {
      await mockOkCycle(cfg, cycleInput(itemId, "r3b-s7a-key", 30), {
        promptTokens: 10,
        completionTokens: 5,
        costPerToken: 2,
      });
    } catch (error) {
      crash = error;
    }
    expect(crash).toBeInstanceOf(SimulatedCrashError);
    const logicalId = computeLogicalOperationId(itemId, GATEWAY_TEST_STEP_KEY, GATEWAY_TEST_OPERATION);
    const op = await getOperationByLogicalId(cfg, logicalId);
    expect(op?.state).toBe("response_recorded");
    const settlement = await getSettlementByKey(cfg, "r3b-s7a-key");
    expect(settlement).not.toBeNull();
    expect(Number(settlement?.committed_amount)).toBe(30);
    const step = await getStep(cfg, stepId);
    expect(step?.status).toBe("claimed");
  }, 30000);

  it.skipIf(only("7b") || crashOff)("S7b: crash after gateway return, before step finish", async () => {
    const { itemId, stepId } = await makeTestItem(cfg, "r3b-test-s7b", 1_000_000);
    let crash: unknown = null;
    try {
      await mockOkCycle(cfg, cycleInput(itemId, "r3b-s7b-key", 30), {
        promptTokens: 10,
        completionTokens: 5,
        costPerToken: 2,
      });
    } catch (error) {
      crash = error;
    }
    expect(crash).toBeInstanceOf(SimulatedCrashError);
    const logicalId = computeLogicalOperationId(itemId, GATEWAY_TEST_STEP_KEY, GATEWAY_TEST_OPERATION);
    const op = await getOperationByLogicalId(cfg, logicalId);
    expect(op?.state).toBe("settled_unreturned");
    const settlement = await getSettlementByKey(cfg, "r3b-s7b-key");
    expect(settlement).not.toBeNull();
    expect(Number(settlement?.committed_amount)).toBe(30);
    const step = await getStep(cfg, stepId);
    expect(step?.status).toBe("claimed");
  }, 30000);
});
