import { describe, expect, it } from "vitest";
import { z } from "zod";
import { InMemoryBudgetLedger } from "@/lib/factory/gateway/budget";
import {
  GATEWAY_CONTRACT_VERSION,
  ModelGateway,
} from "@/lib/factory/gateway/gateway";
import {
  LedgerError,
  LocalBudgetLedgerAdapter,
  PostgrestBudgetLedger,
  type SettleInput,
} from "@/lib/factory/gateway/ledger";
import { MockProvider } from "@/lib/factory/gateway/mock-provider";
import { createDefaultRegistry } from "@/lib/factory/gateway/provider";

const ANSWER_SCHEMA = z.object({ answer: z.string() });

const WORK_ITEM_ID = "11111111-1111-4111-8111-111111111111";
const WORK_STEP_ID = "22222222-2222-4222-8222-222222222222";
const ATTEMPT_ID = "33333333-3333-4333-8333-333333333333";
const ATTEMPT_ID_2 = "44444444-4444-4444-8444-444444444444";

function makeGateway(
  mock: MockProvider,
  dailyLimit: number | null = 1_000_000,
  workItemLimits?: ReadonlyMap<string, number | null>,
  estimateUnitPrice = 1,
) {
  const registry = createDefaultRegistry();
  registry.register(mock);
  const ledger = new InMemoryBudgetLedger({
    dailyLimit,
    workItemLimits:
      workItemLimits ?? new Map([[WORK_ITEM_ID, 1_000_000]]),
  });
  const gateway = new ModelGateway({
    registry,
    ledger: new LocalBudgetLedgerAdapter(ledger),
    estimateUnitPrice,
  });
  return { gateway, ledger };
}

function baseRequest(overrides: Record<string, unknown> = {}) {
  return {
    work_item_id: WORK_ITEM_ID,
    work_step_id: WORK_STEP_ID,
    attempt_id: ATTEMPT_ID,
    capability: "test.echo",
    provider: "mock",
    model_id: "mock-1",
    prompt_version: "test@1",
    token_limit: 100,
    timeout: 5000,
    idempotency_key: "key-1",
    input: { text: "hello" },
    output_schema: ANSWER_SCHEMA,
    ...overrides,
  };
}

describe("r3 model gateway contract", () => {
  it("mock provider round trip records reservation and real cost", async () => {
    const mock = new MockProvider();
    const { gateway, ledger } = makeGateway(mock);
    const response = await gateway.call(baseRequest());
    expect(response.outcome).toBe("succeeded");
    expect(response.output).toEqual({ answer: "mock-ok" });
    expect(response.usage.totalTokens).toBe(15);
    expect(response.estimated_cost).toBe(100);
    expect(response.actual_cost).toBe(0);
    expect(response.replayed).toBe(false);
    expect(mock.getCallCount()).toBe(1);
    const kinds = ledger.entries().map((entry) => entry.entry_kind);
    expect(kinds).toContain("reservation");
    expect(kinds).toContain("commit");
    expect(
      ledger.entries().find((entry) => entry.entry_kind === "commit")
        ?.amount,
    ).toBe(0);
    expect(gateway.getAttempt(ATTEMPT_ID)?.status).toBe("succeeded");
    expect(gateway.getAttempt(ATTEMPT_ID)?.estimated_cost).toBe(100);
    expect(gateway.getAttempt(ATTEMPT_ID)?.actual_cost).toBe(0);
  });

  it("estimated and actual costs are split and settled in the ledger", async () => {
    const mock = new MockProvider({ costPerToken: 2 });
    const { gateway, ledger } = makeGateway(mock);
    const response = await gateway.call(baseRequest());
    expect(response.outcome).toBe("succeeded");
    expect(response.estimated_cost).toBe(100);
    expect(response.actual_cost).toBe(30);
    const amounts = new Map(
      ledger.entries().map((entry) => [entry.entry_kind, entry.amount]),
    );
    expect(amounts.get("reservation")).toBe(100);
    expect(amounts.get("release")).toBe(70);
    expect(amounts.get("commit")).toBe(30);
    expect(ledger.dailySpent()).toBe(30);
    expect(gateway.getAttempt(ATTEMPT_ID)?.estimated_cost).toBe(100);
    expect(gateway.getAttempt(ATTEMPT_ID)?.actual_cost).toBe(30);
  });

  it("invalid structured output is rejected and the attempt fails", async () => {
    const mock = new MockProvider({ mode: "invalid" });
    const { gateway } = makeGateway(mock);
    const response = await gateway.call(baseRequest());
    expect(response.outcome).toBe("failed");
    expect(response.error?.code).toBe("invalid_output");
    expect(response.output).toBeUndefined();
    expect(response.estimated_cost).toBe(100);
    expect(response.actual_cost).toBe(0);
    expect(gateway.getAttempt(ATTEMPT_ID)?.status).toBe("failed");
    expect(mock.getCallCount()).toBe(1);
  });

  it("idempotency replays the stored response without a second call", async () => {
    const mock = new MockProvider();
    const { gateway, ledger } = makeGateway(mock);
    const first = await gateway.call(baseRequest());
    const second = await gateway.call(baseRequest());
    expect(first.outcome).toBe("succeeded");
    expect(second.replayed).toBe(true);
    expect(second.output).toEqual(first.output);
    expect(mock.getCallCount()).toBe(1);
    expect(
      ledger.entries().filter(
        (entry) => entry.entry_kind === "reservation",
      ),
    ).toHaveLength(1);
  });

  it("budget is enforced before the provider call", async () => {
    const mock = new MockProvider();
    const { gateway, ledger } = makeGateway(mock, 5);
    const response = await gateway.call(baseRequest());
    expect(response.outcome).toBe("failed");
    expect(response.error?.code).toBe("budget_exceeded");
    expect(response.estimated_cost).toBe(100);
    expect(response.actual_cost).toBe(0);
    expect(mock.getCallCount()).toBe(0);
    expect(
      ledger.entries().filter((entry) => entry.entry_kind === "rejected"),
    ).toHaveLength(1);
    expect(
      ledger.entries().filter(
        (entry) => entry.entry_kind === "reservation",
      ),
    ).toHaveLength(0);
  });

  it("timeout becomes unknown and replay does not re-call the provider", async () => {
    const mock = new MockProvider({ mode: "hang" });
    const { gateway } = makeGateway(mock);
    const first = await gateway.call(
      baseRequest({ timeout: 50, idempotency_key: "key-timeout" }),
    );
    expect(first.outcome).toBe("unknown");
    expect(first.error?.code).toBe("timeout");
    expect(first.estimated_cost).toBe(100);
    expect(first.actual_cost).toBeNull();
    expect(gateway.getAttempt(ATTEMPT_ID)?.status).toBe("unknown");
    expect(gateway.getAttempt(ATTEMPT_ID)?.actual_cost).toBeNull();
    const replay = await gateway.call(
      baseRequest({ timeout: 50, idempotency_key: "key-timeout" }),
    );
    expect(replay.replayed).toBe(true);
    expect(replay.outcome).toBe("unknown");
    expect(mock.getCallCount()).toBe(1);
    const fresh = await gateway.call(
      baseRequest({
        timeout: 50,
        attempt_id: ATTEMPT_ID_2,
        idempotency_key: "key-timeout-2",
      }),
    );
    expect(fresh.outcome).toBe("unknown");
    expect(fresh.replayed).toBe(false);
    expect(mock.getCallCount()).toBe(2);
  });

  it("muse-spark is blocked and its real call is rejected", async () => {
    const mock = new MockProvider();
    const { gateway, ledger } = makeGateway(mock);
    const registry = createDefaultRegistry();
    const entry = registry
      .list()
      .find((provider) => provider.id === "muse-spark");
    expect(entry?.status).toBe("blocked");
    expect(entry?.blockedReason).toContain("blocked_missing_provider_access");
    const response = await gateway.call(
      baseRequest({ provider: "muse-spark", model_id: "muse-spark" }),
    );
    expect(response.outcome).toBe("failed");
    expect(response.error?.code).toBe("provider_blocked");
    expect(response.estimated_cost).toBe(0);
    expect(response.actual_cost).toBe(0);
    expect(ledger.entries()).toHaveLength(0);
    expect(gateway.getAttempt(ATTEMPT_ID)?.status).toBe("failed");
  });

  it("postgrest adapter maps reserve and settle to the real calls", async () => {
    const seen: Array<{
      url: string;
      method: string;
      body: unknown;
      headers: unknown;
    }> = [];
    const fetchImpl = (async (url: string, init?: RequestInit) => {
      const body = init?.body ? JSON.parse(init.body as string) : undefined;
      seen.push({
        url,
        method: init?.method ?? "GET",
        body,
        headers: init?.headers,
      });
      if (url.includes("factory_work_items")) {
        return {
          ok: true,
          text: async () => JSON.stringify([{ budget_limit: 1000000 }]),
        } as Response;
      }
      if (url.endsWith("/rpc/reserve_budget")) {
        return { ok: true, text: async () => "true" } as Response;
      }
      if (url.endsWith("/rpc/settle_gateway_attempt")) {
        return {
          ok: true,
          text: async () =>
            JSON.stringify([{ settled: true, already_settled: false }]),
        } as Response;
      }
      return { ok: true, text: async () => "[]" } as Response;
    }) as typeof fetch;
    const adapter = new PostgrestBudgetLedger({
      url: "https://example.invalid",
      serviceKey: "dummy-key",
      fetchImpl,
    });
    const reserved = await adapter.reserve(WORK_ITEM_ID, ATTEMPT_ID, 100);
    expect(reserved).toEqual({ ok: true });
    const settled = await adapter.settle({
      work_item_id: WORK_ITEM_ID,
      attempt_id: ATTEMPT_ID,
      factory_attempt_id: null,
      idempotency_key: "key-1",
      release_amount: 70,
      commit_amount: 30,
      cost_basis: "simulated",
    });
    expect(settled).toEqual({ settled: true, already_settled: false });
    const preQuery = seen.find((call) =>
      call.url.includes("factory_work_items"),
    );
    expect(preQuery?.method).toBe("GET");
    const reserveCall = seen.find((call) =>
      call.url.endsWith("/rpc/reserve_budget"),
    );
    expect(reserveCall?.body).toEqual({
      p_work_item_id: WORK_ITEM_ID,
      p_attempt_id: null,
      p_amount: 100,
    });
    const settleCall = seen.find((call) =>
      call.url.endsWith("/rpc/settle_gateway_attempt"),
    );
    expect(settleCall?.body).toEqual({
      p_work_item_id: WORK_ITEM_ID,
      p_factory_attempt_id: null,
      p_gateway_attempt_id: ATTEMPT_ID,
      p_idempotency_key: "key-1",
      p_release_amount: 70,
      p_commit_amount: 30,
      p_cost_basis: "simulated",
    });
    const headers = seen[0].headers as Record<string, string>;
    expect(headers["apikey"]).toBe("dummy-key");
  });

  it("postgrest adapter passes factory attempt id to the rpcs", async () => {
    const bodies: unknown[] = [];
    const fetchImpl = (async (url: string, init?: RequestInit) => {
      if (init?.body) {
        bodies.push(JSON.parse(init.body as string));
      }
      if (url.includes("factory_work_items")) {
        return {
          ok: true,
          text: async () => JSON.stringify([{ budget_limit: 1000000 }]),
        } as Response;
      }
      return { ok: true, text: async () => "true" } as Response;
    }) as typeof fetch;
    const adapter = new PostgrestBudgetLedger({
      url: "https://example.invalid",
      serviceKey: "dummy-key",
      fetchImpl,
    });
    const factoryAttemptId = "55555555-5555-4555-8555-555555555555";
    await adapter.reserve(
      WORK_ITEM_ID,
      ATTEMPT_ID,
      100,
      factoryAttemptId,
    );
    expect(bodies).toContainEqual({
      p_work_item_id: WORK_ITEM_ID,
      p_attempt_id: factoryAttemptId,
      p_amount: 100,
    });
  });

  it("postgrest adapter reports a missing work item as not configured", async () => {
    const rpcCalls: string[] = [];
    const fetchImpl = (async (url: string, init?: RequestInit) => {
      if (url.includes("/rpc/")) {
        rpcCalls.push(url);
      }
      return { ok: true, text: async () => "[]" } as Response;
    }) as typeof fetch;
    const adapter = new PostgrestBudgetLedger({
      url: "https://example.invalid",
      serviceKey: "dummy-key",
      fetchImpl,
    });
    const result = await adapter.reserve(WORK_ITEM_ID, ATTEMPT_ID, 100);
    expect(result).toEqual({ ok: false, reason: "not_configured" });
    expect(rpcCalls).toHaveLength(0);
  });

  it("postgrest adapter failure is a ledger error, not a reservation", async () => {
    const fetchImpl = (async () => ({
      ok: false,
      status: 401,
      text: async () => "unauthorized",
    }) as Response) as typeof fetch;
    const adapter = new PostgrestBudgetLedger({
      url: "https://example.invalid",
      serviceKey: "dummy-key",
      fetchImpl,
    });
    await expect(
      adapter.reserve(WORK_ITEM_ID, ATTEMPT_ID, 100),
    ).rejects.toBeInstanceOf(LedgerError);
  });

  it("ledger transport failure is fail-closed before the provider call", async () => {
    const mock = new MockProvider();
    const registry = createDefaultRegistry();
    registry.register(mock);
    const failingLedger = {
      reserve: async () => {
        throw new LedgerError("rpc reserve_budget failed with 401");
      },
      settle: async () => ({ settled: false, already_settled: false }),
      findSettlement: async () => null,
      findReservation: async () => null,
      findOpenReconciliation: async () => null,
      findReconciliation: async () => null,
      openReconciliation: async () => {
        throw new LedgerError("reconciliation insert failed");
      },
      resolveReconciliation: async () => null,
    };
    const gateway = new ModelGateway({
      registry,
      ledger: failingLedger,
      estimateUnitPrice: 1,
    });
    const response = await gateway.call(baseRequest());
    expect(response.outcome).toBe("failed");
    expect(response.error?.code).toBe("ledger_error");
    expect(response.estimated_cost).toBe(100);
    expect(response.actual_cost).toBe(0);
    expect(mock.getCallCount()).toBe(0);
  });

  it("invalid request is rejected with a validation error", async () => {
    const mock = new MockProvider();
    const { gateway } = makeGateway(mock);
    const response = await gateway.call(
      baseRequest({ attempt_id: "not-a-uuid" }),
    );
    expect(response.outcome).toBe("failed");
    expect(response.error?.code).toBe("validation_error");
    expect(mock.getCallCount()).toBe(0);
  });

  it("unknown provider is rejected without a provider call", async () => {
    const mock = new MockProvider();
    const { gateway } = makeGateway(mock);
    const response = await gateway.call(baseRequest({ provider: "nope" }));
    expect(response.outcome).toBe("failed");
    expect(response.error?.code).toBe("provider_not_found");
    expect(mock.getCallCount()).toBe(0);
  });
});

/**
 * بدل آزمایشیِ مشخص و علامت‌دار برای تزریق Crash در تسویه.
 * فقط در تست به کار می‌رود و هرگز در مسیر محصولی نیست.
 * - failBeforeOnce: تسویه بدون هیچ اثری با خطا برمی‌گردد (Crash
 *   پیش از ثبت Settlement).
 * - throwAfterOnce: تسویه می‌نشیند و بعد با خطا برمی‌گردد (Crash
 *   پس از ثبت Settlement، وقتی پاسخ گم شده است).
 */
class CrashSettleLedger extends LocalBudgetLedgerAdapter {
  failBeforeOnce = false;

  throwAfterOnce = false;

  override async settle(input: SettleInput): Promise<{
    settled: boolean;
    already_settled: boolean;
  }> {
    if (this.failBeforeOnce) {
      this.failBeforeOnce = false;
      throw new LedgerError("simulated crash before settlement");
    }
    const result = await super.settle(input);
    if (this.throwAfterOnce) {
      this.throwAfterOnce = false;
      throw new LedgerError("simulated crash after settlement");
    }
    return result;
  }
}

function makeCrashGateway(mock: MockProvider) {
  const registry = createDefaultRegistry();
  registry.register(mock);
  const inner = new InMemoryBudgetLedger({
    dailyLimit: 1_000_000,
    workItemLimits: new Map([[WORK_ITEM_ID, 1_000_000]]),
  });
  const ledger = new CrashSettleLedger(inner);
  const gateway = new ModelGateway({
    registry,
    ledger,
    estimateUnitPrice: 1,
  });
  return { gateway, inner, ledger };
}

describe("r3a-safe fail-closed caps and reconciliation", () => {
  it("contract version is r3-gateway-4", () => {
    expect(GATEWAY_CONTRACT_VERSION).toBe("r3-gateway-4");
  });

  it("missing work cap is fail-closed, not unlimited", async () => {
    const mock = new MockProvider();
    const { gateway, ledger } = makeGateway(
      mock,
      1_000_000,
      new Map(),
    );
    const response = await gateway.call(baseRequest());
    expect(response.outcome).toBe("failed");
    expect(response.error?.code).toBe("budget_not_configured");
    expect(response.estimated_cost).toBe(100);
    expect(mock.getCallCount()).toBe(0);
    expect(ledger.entries()).toHaveLength(0);
  });

  it("null daily cap behaves like zero: positive rejected, zero allowed", async () => {
    const mock = new MockProvider();
    const rejected = await makeGateway(mock, null).gateway.call(
      baseRequest(),
    );
    expect(rejected.outcome).toBe("failed");
    expect(rejected.error?.code).toBe("budget_exceeded");
    expect(mock.getCallCount()).toBe(0);

    const zeroMock = new MockProvider();
    const { gateway: zeroGateway } = makeGateway(
      zeroMock,
      null,
      undefined,
      0,
    );
    const allowed = await zeroGateway.call(baseRequest());
    expect(allowed.outcome).toBe("succeeded");
    expect(allowed.estimated_cost).toBe(0);
    expect(zeroMock.getCallCount()).toBe(1);
  });

  it("zero work cap rejects positive estimates and allows zero estimates", async () => {
    const mock = new MockProvider();
    const { gateway, ledger } = makeGateway(
      mock,
      1_000_000,
      new Map([[WORK_ITEM_ID, 0]]),
    );
    const rejected = await gateway.call(baseRequest());
    expect(rejected.outcome).toBe("failed");
    expect(rejected.error?.code).toBe("budget_exceeded");
    expect(
      ledger.entries().filter(
        (entry) => entry.entry_kind === "rejected",
      ),
    ).toHaveLength(1);
    expect(mock.getCallCount()).toBe(0);

    const zeroMock = new MockProvider();
    const { gateway: zeroGateway } = makeGateway(
      zeroMock,
      1_000_000,
      new Map([[WORK_ITEM_ID, 0]]),
      0,
    );
    const allowed = await zeroGateway.call(baseRequest());
    expect(allowed.outcome).toBe("succeeded");
    expect(zeroMock.getCallCount()).toBe(1);
  });

  it("work cap binds even when the daily cap is sufficient", async () => {
    const mock = new MockProvider();
    const { gateway } = makeGateway(
      mock,
      1_000_000,
      new Map([[WORK_ITEM_ID, 50]]),
    );
    const response = await gateway.call(baseRequest());
    expect(response.outcome).toBe("failed");
    expect(response.error?.code).toBe("budget_exceeded");
    expect(mock.getCallCount()).toBe(0);
  });

  it("two concurrent reservations near the cap never exceed it", async () => {
    const ledger = new InMemoryBudgetLedger({
      dailyLimit: 1000,
      workItemLimits: new Map([[WORK_ITEM_ID, 1000]]),
    });
    const [first, second] = await Promise.all([
      Promise.resolve().then(() =>
        ledger.reserve(WORK_ITEM_ID, ATTEMPT_ID, 600),
      ),
      Promise.resolve().then(() =>
        ledger.reserve(WORK_ITEM_ID, ATTEMPT_ID_2, 600),
      ),
    ]);
    const wins = [first, second].filter((result) => result.ok);
    expect(wins).toHaveLength(1);
    expect(ledger.workItemSpentAmount(WORK_ITEM_ID)).toBe(600);
    expect(ledger.dailySpent()).toBe(600);
    expect(
      ledger.entries().filter(
        (entry) => entry.entry_kind === "reservation",
      ),
    ).toHaveLength(1);
    expect(
      ledger.entries().filter(
        (entry) => entry.entry_kind === "rejected",
      ),
    ).toHaveLength(1);
  });

  it("timeout holds the reservation and opens reconciliation", async () => {
    const mock = new MockProvider({ mode: "hang" });
    const { gateway, ledger } = makeGateway(mock);
    const first = await gateway.call(
      baseRequest({ timeout: 50, idempotency_key: "key-safe-timeout" }),
    );
    expect(first.outcome).toBe("unknown");
    expect(first.error?.code).toBe("timeout");
    expect(first.actual_cost).toBeNull();
    expect(first.settled_cost).toBeNull();
    const kinds = ledger.entries().map((entry) => entry.entry_kind);
    expect(kinds).toContain("reservation");
    expect(kinds).not.toContain("release");
    expect(kinds).not.toContain("commit");
    const record = await gateway.getReconciliation(ATTEMPT_ID);
    expect(record?.status).toBe("pending_reconciliation");
    expect(record?.kind).toBe("unknown");
    expect(record?.reason).toBe("provider_timeout_outcome_unknown");
    const replay = await gateway.call(
      baseRequest({ timeout: 50, idempotency_key: "key-safe-timeout" }),
    );
    expect(replay.replayed).toBe(true);
    expect(replay.outcome).toBe("unknown");
    expect(ledger.entries()).toHaveLength(1);
    const freshSameAttempt = await gateway.call(
      baseRequest({ timeout: 50, idempotency_key: "key-safe-timeout-2" }),
    );
    expect(freshSameAttempt.outcome).toBe("failed");
    expect(freshSameAttempt.error?.code).toBe("reconciliation_pending");
    expect(mock.getCallCount()).toBe(1);
    expect(ledger.entries()).toHaveLength(1);
  });

  it("crash before settlement leaves one settlement on retry", async () => {
    const mock = new MockProvider();
    const { gateway, inner, ledger } = makeCrashGateway(mock);
    ledger.failBeforeOnce = true;
    const failed = await gateway.call(baseRequest());
    expect(failed.outcome).toBe("failed");
    expect(failed.error?.code).toBe("ledger_error");
    expect(mock.getCallCount()).toBe(1);
    expect(
      inner.entries().filter(
        (entry) => entry.entry_kind === "reservation",
      ),
    ).toHaveLength(1);
    expect(
      inner.entries().filter(
        (entry) => entry.entry_kind === "commit",
      ),
    ).toHaveLength(0);
    const retried = await gateway.call(baseRequest());
    expect(retried.outcome).toBe("succeeded");
    expect(mock.getCallCount()).toBe(1);
    expect(
      inner.entries().filter(
        (entry) => entry.entry_kind === "release",
      ),
    ).toHaveLength(1);
    expect(
      inner.entries().filter(
        (entry) => entry.entry_kind === "commit",
      ),
    ).toHaveLength(1);
  });

  it("crash after settlement recovers without a double effect", async () => {
    const mock = new MockProvider();
    const { gateway, inner, ledger } = makeCrashGateway(mock);
    ledger.throwAfterOnce = true;
    const response = await gateway.call(baseRequest());
    expect(response.outcome).toBe("succeeded");
    expect(mock.getCallCount()).toBe(1);
    expect(
      inner.entries().filter(
        (entry) => entry.entry_kind === "release",
      ),
    ).toHaveLength(1);
    expect(
      inner.entries().filter(
        (entry) => entry.entry_kind === "commit",
      ),
    ).toHaveLength(1);
    const replay = await gateway.call(baseRequest());
    expect(replay.replayed).toBe(true);
    expect(
      inner.entries().filter(
        (entry) => entry.entry_kind === "release",
      ),
    ).toHaveLength(1);
  });

  it("replay after success adds no new ledger rows", async () => {
    const mock = new MockProvider({ costPerToken: 2 });
    const { gateway, ledger } = makeGateway(mock);
    const first = await gateway.call(baseRequest());
    expect(first.outcome).toBe("succeeded");
    const before = ledger.entries().length;
    const second = await gateway.call(baseRequest());
    expect(second.replayed).toBe(true);
    expect(ledger.entries().length).toBe(before);
    expect(mock.getCallCount()).toBe(1);
  });

  it("same key with different content is rejected without a new effect", async () => {
    const mock = new MockProvider();
    const { gateway, ledger } = makeGateway(mock);
    const first = await gateway.call(
      baseRequest({ idempotency_key: "key-conflict" }),
    );
    expect(first.outcome).toBe("succeeded");
    const before = ledger.entries().length;
    const changed = await gateway.call(
      baseRequest({
        idempotency_key: "key-conflict",
        input: { text: "different" },
      }),
    );
    expect(changed.outcome).toBe("failed");
    expect(changed.error?.code).toBe("idempotency_key_conflict");
    expect(ledger.entries().length).toBe(before);
    expect(mock.getCallCount()).toBe(1);
    const changedLimit = await gateway.call(
      baseRequest({
        idempotency_key: "key-conflict",
        token_limit: 200,
      }),
    );
    expect(changedLimit.error?.code).toBe("idempotency_key_conflict");
    expect(mock.getCallCount()).toBe(1);
  });

  it("actual cost above reservation settles up to reservation only", async () => {
    const mock = new MockProvider({ costPerToken: 20 });
    const { gateway, ledger } = makeGateway(mock);
    const response = await gateway.call(
      baseRequest({ token_limit: 10 }),
    );
    expect(response.outcome).toBe("succeeded");
    expect(response.estimated_cost).toBe(10);
    expect(response.actual_cost).toBe(300);
    expect(response.settled_cost).toBe(10);
    expect(response.reconciliation?.reason).toBe(
      "actual_exceeds_reservation",
    );
    expect(response.reconciliation?.excess_amount).toBe(290);
    const amounts = new Map(
      ledger.entries().map((entry) => [entry.entry_kind, entry.amount]),
    );
    expect(amounts.get("reservation")).toBe(10);
    expect(amounts.get("commit")).toBe(10);
    expect(amounts.has("release")).toBe(false);
    const record = await gateway.getReconciliation(ATTEMPT_ID);
    expect(record?.status).toBe("pending_reconciliation");
    expect(record?.kind).toBe("excess");
    expect(record?.excess_amount).toBe(290);
  });

  it("reconciliation release is authorized, recorded, and idempotent", async () => {
    const mock = new MockProvider({ mode: "hang" });
    const { gateway, ledger } = makeGateway(mock);
    await gateway.call(
      baseRequest({ timeout: 50, idempotency_key: "key-safe-rel" }),
    );
    const resolved = await gateway.reconcile({
      attempt_id: ATTEMPT_ID,
      decision: "release",
      evidence: "provider confirmed the request was not processed",
      actor: "r3a-safe-test",
      reason: "operator verified no processing",
    });
    expect(resolved.ok).toBe(true);
    expect(resolved.record?.status).toBe("resolved_released");
    expect(resolved.record?.actor).toBe("r3a-safe-test");
    expect(resolved.record?.reason).toBe("operator verified no processing");
    expect(
      ledger.entries().filter(
        (entry) => entry.entry_kind === "release",
      ),
    ).toHaveLength(1);
    const again = await gateway.reconcile({
      attempt_id: ATTEMPT_ID,
      decision: "release",
      evidence: "provider confirmed the request was not processed",
      actor: "r3a-safe-test",
      reason: "operator verified no processing",
    });
    expect(again.ok).toBe(true);
    expect(again.record?.status).toBe("resolved_released");
    expect(
      ledger.entries().filter(
        (entry) => entry.entry_kind === "release",
      ),
    ).toHaveLength(1);
  });

  it("reconciliation commit settles with usage evidence", async () => {
    const mock = new MockProvider({ mode: "hang" });
    const { gateway, ledger } = makeGateway(mock);
    await gateway.call(
      baseRequest({ timeout: 50, idempotency_key: "key-safe-commit" }),
    );
    const resolved = await gateway.reconcile({
      attempt_id: ATTEMPT_ID,
      decision: "commit",
      evidence: "usage receipt from provider",
      actor: "r3a-safe-test",
      reason: "provider receipt shows consumption",
      actual_cost: 40,
    });
    expect(resolved.ok).toBe(true);
    expect(resolved.record?.status).toBe("resolved_committed");
    const amounts = new Map(
      ledger.entries().map((entry) => [entry.entry_kind, entry.amount]),
    );
    expect(amounts.get("reservation")).toBe(100);
    expect(amounts.get("release")).toBe(60);
    expect(amounts.get("commit")).toBe(40);
  });

  it("reconciliation refer moves no money", async () => {
    const mock = new MockProvider({ mode: "hang" });
    const { gateway, ledger } = makeGateway(mock);
    await gateway.call(
      baseRequest({ timeout: 50, idempotency_key: "key-safe-refer" }),
    );
    const resolved = await gateway.reconcile({
      attempt_id: ATTEMPT_ID,
      decision: "refer",
      evidence: "no processing evidence and no non-processing evidence",
      actor: "r3a-safe-test",
      reason: "needs a human decision",
    });
    expect(resolved.ok).toBe(true);
    expect(resolved.record?.status).toBe("referred_to_human");
    expect(
      ledger.entries().filter(
        (entry) => entry.entry_kind !== "reservation",
      ),
    ).toHaveLength(0);
  });

  it("reconciling a missing record fails without an effect", async () => {
    const mock = new MockProvider();
    const { gateway } = makeGateway(mock);
    const result = await gateway.reconcile({
      attempt_id: ATTEMPT_ID,
      decision: "release",
      evidence: "none",
      actor: "r3a-safe-test",
      reason: "nothing to resolve",
    });
    expect(result.ok).toBe(false);
    expect(result.code).toBe("reconciliation_not_found");
  });

  it("excess reconciliation cannot release", async () => {
    const mock = new MockProvider({ costPerToken: 20 });
    const { gateway, ledger } = makeGateway(mock);
    await gateway.call(baseRequest({ token_limit: 10 }));
    const before = ledger.entries().length;
    const result = await gateway.reconcile({
      attempt_id: ATTEMPT_ID,
      decision: "release",
      evidence: "not applicable",
      actor: "r3a-safe-test",
      reason: "wrong decision for excess",
    });
    expect(result.ok).toBe(false);
    expect(result.code).toBe("validation_error");
    expect(ledger.entries().length).toBe(before);
  });

  it("mock cost is marked simulated, never a provider charge", async () => {
    const mock = new MockProvider({ costPerToken: 2 });
    const { gateway } = makeGateway(mock);
    const response = await gateway.call(baseRequest());
    expect(response.outcome).toBe("succeeded");
    expect(response.actual_cost).toBe(30);
    expect(response.actual_cost_basis).toBe("simulated");
    expect(response.cost_unit).toBe("mock-unit");
    expect(response.estimated_cost_basis).toBe("estimated");
    expect(response.cost_calculation_basis).toContain("simulated");
    expect(response.cost_calculation_basis).toContain(
      "not a provider charge",
    );
  });

  it("factory attempt id is accepted and recorded on the attempt", async () => {
    const mock = new MockProvider();
    const { gateway } = makeGateway(mock);
    const factoryAttemptId = "55555555-5555-4555-8555-555555555555";
    const response = await gateway.call(
      baseRequest({ factory_attempt_id: factoryAttemptId }),
    );
    expect(response.outcome).toBe("succeeded");
    expect(gateway.getAttempt(ATTEMPT_ID)?.factory_attempt_id).toBe(
      factoryAttemptId,
    );
  });
});
