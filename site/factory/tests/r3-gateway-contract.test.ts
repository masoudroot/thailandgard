import { describe, expect, it } from "vitest";
import { z } from "zod";
import { InMemoryBudgetLedger } from "@/lib/factory/gateway/budget";
import { ModelGateway } from "@/lib/factory/gateway/gateway";
import {
  LedgerError,
  LocalBudgetLedgerAdapter,
  PostgrestBudgetLedger,
} from "@/lib/factory/gateway/ledger";
import { MockProvider } from "@/lib/factory/gateway/mock-provider";
import { createDefaultRegistry } from "@/lib/factory/gateway/provider";

const ANSWER_SCHEMA = z.object({ answer: z.string() });

const WORK_ITEM_ID = "11111111-1111-4111-8111-111111111111";
const WORK_STEP_ID = "22222222-2222-4222-8222-222222222222";
const ATTEMPT_ID = "33333333-3333-4333-8333-333333333333";
const ATTEMPT_ID_2 = "44444444-4444-4444-8444-444444444444";

function makeGateway(mock: MockProvider, dailyLimit = 1_000_000) {
  const registry = createDefaultRegistry();
  registry.register(mock);
  const ledger = new InMemoryBudgetLedger({ dailyLimit });
  const gateway = new ModelGateway({
    registry,
    ledger: new LocalBudgetLedgerAdapter(ledger),
    estimateUnitPrice: 1,
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

  it("postgrest adapter maps reserve, release and commit to the real calls", async () => {
    const seen: Array<{ url: string; body: unknown; headers: unknown }> = [];
    const fetchImpl = (async (url: string, init?: RequestInit) => {
      seen.push({
        url,
        body: init?.body ? JSON.parse(init.body as string) : undefined,
        headers: init?.headers,
      });
      const isReserve = url.endsWith("/rpc/reserve_budget");
      return {
        ok: true,
        text: async () => (isReserve ? "true" : ""),
      } as Response;
    }) as typeof fetch;
    const adapter = new PostgrestBudgetLedger({
      url: "https://example.invalid",
      serviceKey: "dummy-key",
      fetchImpl,
    });
    expect(
      await adapter.reserve(WORK_ITEM_ID, ATTEMPT_ID, 100),
    ).toBe(true);
    await adapter.release(WORK_ITEM_ID, ATTEMPT_ID, 70);
    await adapter.commit(WORK_ITEM_ID, ATTEMPT_ID, 30);
    expect(seen).toHaveLength(3);
    expect(seen[0].url).toBe(
      "https://example.invalid/rest/v1/rpc/reserve_budget",
    );
    expect(seen[0].body).toEqual({
      p_work_item_id: WORK_ITEM_ID,
      p_attempt_id: null,
      p_amount: 100,
    });
    expect(seen[1].url).toBe(
      "https://example.invalid/rest/v1/rpc/release_budget",
    );
    expect(seen[2].url).toBe(
      "https://example.invalid/rest/v1/factory_cost_ledger",
    );
    expect(seen[2].body).toEqual({
      work_item_id: WORK_ITEM_ID,
      attempt_id: null,
      entry_kind: "commit",
      amount: 30,
    });
    const headers = seen[0].headers as Record<string, string>;
    expect(headers["apikey"]).toBe("dummy-key");
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
      release: async () => {},
      commit: async () => {},
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
