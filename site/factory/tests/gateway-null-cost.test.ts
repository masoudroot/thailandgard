/**
 * تست هزینهٔ نامعلوم در Gateway (THG-RB-01).
 *
 * وقتی Provider فقط usage می‌دهد و قیمت اعلام نمی‌کند، هزینهٔ واقعی
 * باید null بماند، نه صفرِ گمراه‌کننده: مبنا null، واحد تهی، تسویه
 * فقط آزادسازی برآورد بدون سطر commit. این تست بدون دیتابیس و بدون
 * شبکه اجرا می‌شود؛ Provider و ledger بدل درون‌حافظه‌ای‌اند.
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
import type {
  ReconciliationRecord,
  SettlementRecord,
} from "@/lib/factory/gateway/types";

class FakeLedger implements BudgetLedger {
  reserveCalls = 0;

  private readonly settlements = new Map<string, SettlementRecord>();

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

  async findOpenReconciliation(): Promise<ReconciliationRecord | null> {
    return null;
  }

  async findReconciliation(): Promise<ReconciliationRecord | null> {
    return null;
  }

  async openReconciliation(
    input: OpenReconciliationInput,
  ): Promise<ReconciliationRecord> {
    return {
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
  }

  async resolveReconciliation(
    input: ResolveReconciliationInput,
  ): Promise<ReconciliationRecord | null> {
    void input;
    return null;
  }

  settlement(idempotencyKey: string): SettlementRecord | undefined {
    return this.settlements.get(idempotencyKey);
  }
}

class NullCostProvider implements ModelProvider {
  readonly id = "null-cost-provider";

  readonly status = "available" as const;

  calls = 0;

  async call(input: ProviderCallInput): Promise<ProviderCallResult> {
    void input;
    this.calls += 1;
    return {
      output: { text: "draft" },
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
      cost: null,
    };
  }
}

const passthroughSchema = {
  safeParse: (data: unknown) => ({ success: true as const, data }),
};

describe("unknown cost is null, never a misleading zero", () => {
  it("succeeds with actual_cost null, basis null, and a release-only settlement", async () => {
    const provider = new NullCostProvider();
    const ledger = new FakeLedger();
    const registry = new ProviderRegistry();
    registry.register(provider);
    const gateway = new ModelGateway({
      registry,
      ledger,
      estimateUnitPrice: 1,
      budgetPolicy: { consumptionCap: 1000, budgetApproved: true },
    });
    const response = await gateway.call({
      work_item_id: "11111111-1111-4111-8111-111111111111",
      work_step_id: "22222222-2222-4222-8222-222222222222",
      attempt_id: "33333333-3333-4333-8333-333333333333",
      capability: "generation",
      provider: "null-cost-provider",
      model_id: "qwen3.8-flash",
      prompt_version: "v1",
      token_limit: 100,
      timeout: 5000,
      idempotency_key: "gateway-null-cost-key-1",
      input: { text: "hello" },
      output_schema: passthroughSchema,
    });
    expect(response.outcome).toBe("succeeded");
    expect(response.actual_cost).toBeNull();
    expect(response.actual_cost_basis).toBeNull();
    expect(response.cost_unit).toBe("");
    expect(response.settled_cost).toBeNull();
    expect(response.cost_calculation_basis).toContain("unknown");
    const settlement = ledger.settlement("gateway-null-cost-key-1");
    expect(settlement).toBeDefined();
    expect(settlement?.released_amount).toBe(100);
    expect(settlement?.committed_amount).toBeNull();
    expect(provider.calls).toBe(1);
    expect(ledger.reserveCalls).toBe(1);
  });
});
