/**
 * تست‌های سیم‌کشی Gateway در THG-UNIFY-01 (GATEWAY).
 *
 * این تست‌ها بدون دیتابیس، بدون شبکه و بدون هیچ فراخوان مدل واقعی
 * اجرا می‌شوند: Provider یک بدل درون‌حافظه‌ای است و ledger هم یک
 * بدل درون‌حافظه‌ای. اثبات‌شده‌ها:
 * - گیت سقف مصرف: با سیاست پیش‌فرض رجیستری (سقف صفر، بودجه
 *   تأییدنشده) فراخوان پیش از هر تماس Provider و پیش از هر رزرو
 *   رد می‌شود؛ با بودجهٔ تأییدشده، مسیر ادامه می‌یابد.
 * - حذف reasoning: خروجی Provider، فقط از یک نقطهٔ خفگی (پس از
 *   بازگشت Provider، پیش از اعتبارسنجی و ذخیره) پاک می‌شود و نه
 *   پاسخ برگشتی و نه پاسخ بازپخش‌شده، reasoning_content ندارد.
 * - گیت تولید: قدم‌های Workflow آزمایشی Gateway وقتی
 *   generation_enabled دقیقاً true نباشد مسدودند؛ Workflow رسمی
 *   با این گیت قضاوت نمی‌شود.
 * - سقف Timeout: Timeout بزرگ‌تر از ۳۰ ثانیه به ۳۰ ثانیه بریده
 *   می‌شود؛ نتیجه unknown است و هزینهٔ unknown هرگز صفر نیست.
 * - نبود retry کور پس از unknown: فراخوان تازه برای همان attempt
 *   با کلید دیگر، با reconciliation_pending رد می‌شود و Provider
 *   دوباره صدا زده نمی‌شود.
 */
import { describe, expect, it } from "vitest";
import { ModelGateway } from "@/lib/factory/gateway/gateway";
import type {
  BudgetLedger,
  OpenReconciliationInput,
  ResolveReconciliationInput,
  SettleInput,
} from "@/lib/factory/gateway/ledger";
import { ProviderRegistry } from "@/lib/factory/gateway/provider";
import type {
  ModelProvider,
  ProviderCallInput,
  ProviderCallResult,
} from "@/lib/factory/gateway/provider";
import {
  containsReasoningContent,
  CURRENT_BUDGET_POLICY,
} from "@/lib/factory/gateway/registry";
import type {
  ReconciliationRecord,
  SettlementRecord,
} from "@/lib/factory/gateway/types";
import {
  evaluateKillSwitches,
  GATEWAY_WORKFLOW_VERSION,
  gatewayStepBlocked,
  gatewayStepBlockReason,
  WORKFLOW_VERSION,
} from "@/lib/factory/tick/factory-tick";

class FakeLedger implements BudgetLedger {
  reserveCalls = 0;

  private readonly settlements = new Map<string, SettlementRecord>();

  private readonly reconciliations: ReconciliationRecord[] = [];

  async reserve(
    work_item_id: string,
    attempt_id: string,
    amount: number,
  ): Promise<{ ok: true } | { ok: false; reason: "exceeded" | "not_configured" }> {
    void work_item_id;
    void attempt_id;
    void amount;
    this.reserveCalls += 1;
    return { ok: true };
  }

  async settle(input: SettleInput): Promise<{
    settled: boolean;
    already_settled: boolean;
  }> {
    if (this.settlements.has(input.idempotency_key)) {
      return { settled: false, already_settled: true };
    }
    this.settlements.set(input.idempotency_key, {
      idempotency_key: input.idempotency_key,
      work_item_id: input.work_item_id,
      attempt_id: input.attempt_id,
      factory_attempt_id: input.factory_attempt_id,
      released_amount: input.release_amount,
      committed_amount: input.commit_amount,
      cost_basis: input.cost_basis,
    });
    return { settled: true, already_settled: false };
  }

  async findSettlement(
    idempotency_key: string,
  ): Promise<SettlementRecord | null> {
    return this.settlements.get(idempotency_key) ?? null;
  }

  async findReservation(): Promise<{ amount: number } | null> {
    return null;
  }

  async findOpenReconciliation(
    attempt_id: string,
  ): Promise<ReconciliationRecord | null> {
    const rows = this.reconciliations.filter(
      (row) =>
        row.attempt_id === attempt_id &&
        row.status === "pending_reconciliation",
    );
    return rows.length > 0 ? rows[rows.length - 1] : null;
  }

  async findReconciliation(
    attempt_id: string,
  ): Promise<ReconciliationRecord | null> {
    const rows = this.reconciliations.filter(
      (row) => row.attempt_id === attempt_id,
    );
    return rows.length > 0 ? rows[rows.length - 1] : null;
  }

  async openReconciliation(
    input: OpenReconciliationInput,
  ): Promise<ReconciliationRecord> {
    const existing = this.reconciliations.find(
      (row) => row.idempotency_key === input.idempotency_key,
    );
    if (existing) {
      return existing;
    }
    const record: ReconciliationRecord = {
      idempotency_key: input.idempotency_key,
      work_item_id: input.work_item_id,
      attempt_id: input.attempt_id,
      factory_attempt_id: input.factory_attempt_id,
      kind: input.kind,
      estimated_cost: input.estimated_cost,
      excess_amount: input.excess_amount,
      status: "pending_reconciliation",
      reason: input.reason,
      evidence: input.evidence,
      actor: null,
      resolved_at: null,
      created_at: new Date().toISOString(),
    };
    this.reconciliations.push(record);
    return record;
  }

  async resolveReconciliation(
    input: ResolveReconciliationInput,
  ): Promise<ReconciliationRecord | null> {
    void input;
    return null;
  }
}

class FakeProvider implements ModelProvider {
  readonly id = "fake-test-provider";

  readonly status = "available" as const;

  calls = 0;

  constructor(
    private readonly output: unknown,
    private readonly hangUntilAbort: boolean = false,
  ) {}

  async call(input: ProviderCallInput): Promise<ProviderCallResult> {
    this.calls += 1;
    if (this.hangUntilAbort) {
      await new Promise<void>((_resolve, reject) => {
        const onAbort = (): void => {
          const error = new Error("aborted");
          error.name = "AbortError";
          reject(error);
        };
        if (input.signal.aborted) {
          onAbort();
          return;
        }
        input.signal.addEventListener("abort", onAbort, { once: true });
      });
    }
    return {
      output: this.output,
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
      cost: 5,
      cost_basis: "estimated",
      cost_unit: "",
    };
  }
}

const passthroughSchema = {
  safeParse: (data: unknown) => ({ success: true as const, data }),
};

function makeRequest(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    work_item_id: "11111111-1111-4111-8111-111111111111",
    work_step_id: "22222222-2222-4222-8222-222222222222",
    attempt_id: "33333333-3333-4333-8333-333333333333",
    capability: "generation",
    provider: "fake-test-provider",
    model_id: "qwen3.8-flash",
    prompt_version: "v1",
    token_limit: 100,
    timeout: 5000,
    idempotency_key: "gateway-wiring-key-1",
    input: { text: "hello" },
    output_schema: passthroughSchema,
    ...overrides,
  };
}

function makeGateway(provider: ModelProvider, ledger: FakeLedger, budgetPolicy?: { consumptionCap: number; budgetApproved: boolean }): ModelGateway {
  const registry = new ProviderRegistry();
  registry.register(provider);
  return new ModelGateway({
    registry,
    ledger,
    estimateUnitPrice: 1,
    ...(budgetPolicy ? { budgetPolicy } : {}),
  });
}

describe("cap gate (pre-call, from registry policy v1)", () => {
  it("blocks with the default policy (cap zero) before any provider call or reservation", async () => {
    expect(CURRENT_BUDGET_POLICY.consumptionCap).toBe(0);
    expect(CURRENT_BUDGET_POLICY.budgetApproved).toBe(false);
    const provider = new FakeProvider({ text: "draft" });
    const ledger = new FakeLedger();
    const gateway = makeGateway(provider, ledger);
    const response = await gateway.call(makeRequest());
    expect(response.outcome).toBe("failed");
    expect(response.error?.code).toBe("budget_exceeded");
    expect(response.output).toBeUndefined();
    expect(provider.calls).toBe(0);
    expect(ledger.reserveCalls).toBe(0);
  });

  it("blocks when the cap is positive but the budget is not approved", async () => {
    const provider = new FakeProvider({ text: "draft" });
    const ledger = new FakeLedger();
    const gateway = makeGateway(provider, ledger, {
      consumptionCap: 1000,
      budgetApproved: false,
    });
    const response = await gateway.call(makeRequest());
    expect(response.outcome).toBe("failed");
    expect(response.error?.code).toBe("budget_exceeded");
    expect(provider.calls).toBe(0);
    expect(ledger.reserveCalls).toBe(0);
  });

  it("lets an approved budget through to the provider", async () => {
    const provider = new FakeProvider({ text: "draft" });
    const ledger = new FakeLedger();
    const gateway = makeGateway(provider, ledger, {
      consumptionCap: 1000,
      budgetApproved: true,
    });
    const response = await gateway.call(makeRequest());
    expect(response.outcome).toBe("succeeded");
    expect(provider.calls).toBe(1);
    expect(ledger.reserveCalls).toBe(1);
  });
});

describe("reasoning strip at the single output choke point", () => {
  it("removes reasoning_content from the returned output and from the replayed output", async () => {
    const raw = {
      title: "kept",
      reasoning_content: "must never be stored",
      nested: {
        reasoning_content: "deep secret",
        list: [{ reasoning_content: "in a list", keep: 1 }],
      },
    };
    const provider = new FakeProvider(raw);
    const ledger = new FakeLedger();
    const gateway = makeGateway(provider, ledger, {
      consumptionCap: 1000,
      budgetApproved: true,
    });
    const request = makeRequest();
    const response = await gateway.call(request);
    expect(response.outcome).toBe("succeeded");
    expect(containsReasoningContent(response.output)).toBe(false);
    expect(response.output).toEqual({
      title: "kept",
      nested: { list: [{ keep: 1 }] },
    });
    const replayed = await gateway.call(request);
    expect(replayed.replayed).toBe(true);
    expect(replayed.outcome).toBe("succeeded");
    expect(containsReasoningContent(replayed.output)).toBe(false);
    expect(provider.calls).toBe(1);
  });
});

describe("generation gate for gateway workflow steps", () => {
  it("blocks a gateway step when generation_enabled is not exactly true", () => {
    for (const value of [undefined, "false", "True", "1", "yes"]) {
      const switches = evaluateKillSwitches({
        factory_paused: "false",
        ...(value === undefined ? {} : { generation_enabled: value }),
      });
      expect(
        gatewayStepBlocked(switches, GATEWAY_WORKFLOW_VERSION, "generate_draft_mock"),
      ).toBe(true);
      expect(
        gatewayStepBlockReason(switches, GATEWAY_WORKFLOW_VERSION, "generate_draft_mock"),
      ).toBe("generation_disabled");
    }
  });

  it("allows a gateway step when generation is exactly true and the factory is not paused", () => {
    const switches = evaluateKillSwitches({
      factory_paused: "false",
      generation_enabled: "true",
    });
    expect(
      gatewayStepBlocked(switches, GATEWAY_WORKFLOW_VERSION, "generate_draft_mock"),
    ).toBe(false);
    expect(
      gatewayStepBlockReason(switches, GATEWAY_WORKFLOW_VERSION, "generate_draft_mock"),
    ).toBeNull();
  });

  it("blocks on factory_paused even when generation is enabled", () => {
    const switches = evaluateKillSwitches({
      factory_paused: "true",
      generation_enabled: "true",
    });
    expect(
      gatewayStepBlocked(switches, GATEWAY_WORKFLOW_VERSION, "generate_draft_mock"),
    ).toBe(true);
    expect(
      gatewayStepBlockReason(switches, GATEWAY_WORKFLOW_VERSION, "generate_draft_mock"),
    ).toBe("factory_paused");
  });

  it("does not judge regular workflow steps with this gate", () => {
    const switches = evaluateKillSwitches({
      factory_paused: "false",
      generation_enabled: "false",
    });
    expect(
      gatewayStepBlocked(switches, WORKFLOW_VERSION, "publish_version"),
    ).toBe(false);
    expect(
      gatewayStepBlockReason(switches, WORKFLOW_VERSION, "publish_version"),
    ).toBeNull();
  });
});

describe("per-attempt timeout cap of 30s", () => {
  it("aborts a hanging provider quickly for a small configured timeout", async () => {
    const provider = new FakeProvider({ text: "never" }, true);
    const ledger = new FakeLedger();
    const gateway = makeGateway(provider, ledger, {
      consumptionCap: 1000,
      budgetApproved: true,
    });
    const started = Date.now();
    const response = await gateway.call(makeRequest({ timeout: 500 }));
    const elapsed = Date.now() - started;
    expect(response.outcome).toBe("unknown");
    expect(response.error?.code).toBe("timeout");
    expect(response.actual_cost).toBeNull();
    expect(response.actual_cost_basis).toBeNull();
    expect(elapsed).toBeLessThan(10_000);
  });

  it(
    "clamps a 180s configured timeout down to about 30s and keeps unknown cost null, not zero",
    async () => {
      const provider = new FakeProvider({ text: "never" }, true);
      const ledger = new FakeLedger();
      const gateway = makeGateway(provider, ledger, {
        consumptionCap: 1000,
        budgetApproved: true,
      });
      const started = Date.now();
      const response = await gateway.call(makeRequest({ timeout: 180_000 }));
      const elapsed = Date.now() - started;
      expect(response.outcome).toBe("unknown");
      expect(response.error?.code).toBe("timeout");
      expect(response.actual_cost).toBeNull();
      expect(response.actual_cost_basis).toBeNull();
      expect(elapsed).toBeGreaterThanOrEqual(29_000);
      expect(elapsed).toBeLessThan(40_000);
    },
    45_000,
  );
});

describe("no blind retry after an unknown outcome", () => {
  it("rejects a fresh call for the same attempt with reconciliation_pending and does not call the provider again", async () => {
    const provider = new FakeProvider({ text: "never" }, true);
    const ledger = new FakeLedger();
    const gateway = makeGateway(provider, ledger, {
      consumptionCap: 1000,
      budgetApproved: true,
    });
    const first = await gateway.call(
      makeRequest({ timeout: 500, idempotency_key: "gateway-wiring-unknown-1" }),
    );
    expect(first.outcome).toBe("unknown");
    expect(provider.calls).toBe(1);
    const retry = await gateway.call(
      makeRequest({
        timeout: 500,
        idempotency_key: "gateway-wiring-unknown-2",
      }),
    );
    expect(retry.outcome).toBe("failed");
    expect(retry.error?.code).toBe("reconciliation_pending");
    expect(provider.calls).toBe(1);
  });
});
