import "./server-guard";
import { InMemoryBudgetLedger, type ReserveResult } from "./budget";
import type {
  CostBasis,
  ReconciliationKind,
  ReconciliationRecord,
  ReconciliationStatus,
  SettlementRecord,
} from "./types";

/**
 * آداپتور دفتر بودجهٔ Gateway (R3A-SAFE، نسخهٔ r3-gateway-3).
 *
 * دو حالت دارد:
 * - حالت محلی: دور InMemoryBudgetLedger، برای تست‌های واحد، با
 *   نگاشت‌های حافظه‌ای تسویه و مصالحه که همان معنای حالت PostgREST
 *   را دارند.
 * - حالت PostgREST سمت سرور: reserve با RPC واقعی reserve_budget،
 *   تسویه با RPC تازهٔ `settle_gateway_attempt` (در یک تراکنش:
 *   سطر تسویه با کلید یکتا، بعد سطر release و سطر commit)، و
 *   مصالحه با جدول `factory_gateway_reconciliations`.
 *
 * مرز اتمیک بودن (صریح):
 * - تک‌فراخوان RPC اتمیک است: reserve یک فراخوان، تسویه یک فراخوان.
 * - زنجیرهٔ چندفراخوانی (مثل رزرو و بعد فراخوان Provider) اتمیک
 *   نیست؛ سازوکار جبرانش، مصالحه و تسویهٔ idempotent با کلید یکتاست.
 * - سطرهای ledger با `attempt_id` به سطر factory_attempts می‌چسبند
 *   (کلید خارجی)؛ پس وقتی `factory_attempt_id` داده نشده باشد،
 *   سطرها attempt تهی می‌گیرند و کشف رزرو میان‌نسخه‌ای ممکن نیست.
 */
export interface SettleInput {
  work_item_id: string;
  attempt_id: string;
  factory_attempt_id: string | null;
  idempotency_key: string;
  release_amount: number;
  commit_amount: number | null;
  cost_basis: CostBasis;
}

export interface OpenReconciliationInput {
  idempotency_key: string;
  work_item_id: string;
  attempt_id: string;
  factory_attempt_id: string | null;
  kind: ReconciliationKind;
  estimated_cost: number;
  excess_amount: number | null;
  reason: string;
  evidence: string | null;
}

export interface ResolveReconciliationInput {
  attempt_id: string;
  status:
    | "resolved_released"
    | "resolved_committed"
    | "referred_to_human";
  evidence: string;
  actor: string;
  reason: string;
}

export interface BudgetLedger {
  reserve(
    work_item_id: string,
    attempt_id: string,
    amount: number,
    factory_attempt_id?: string | null,
  ): Promise<ReserveResult>;
  settle(input: SettleInput): Promise<{
    settled: boolean;
    already_settled: boolean;
  }>;
  findSettlement(
    idempotency_key: string,
  ): Promise<SettlementRecord | null>;
  findReservation(
    work_item_id: string,
    attempt_id: string,
    factory_attempt_id?: string | null,
  ): Promise<{ amount: number } | null>;
  findOpenReconciliation(
    attempt_id: string,
  ): Promise<ReconciliationRecord | null>;
  findReconciliation(
    attempt_id: string,
  ): Promise<ReconciliationRecord | null>;
  openReconciliation(
    input: OpenReconciliationInput,
  ): Promise<ReconciliationRecord>;
  resolveReconciliation(
    input: ResolveReconciliationInput,
  ): Promise<ReconciliationRecord | null>;
}

export class LedgerError extends Error {
  readonly code = "ledger_error" as const;

  constructor(message: string) {
    super(message);
    this.name = "LedgerError";
  }
}

/**
 * حالت محلی: دور دفتر حافظه‌ای، بدون هیچ فراخوان شبکه.
 * سطرهای محلی با attempt_id خود Gateway کلید می‌خورند، نه با
 * factory_attempt_id؛ پس کشف رزرو محلی با attempt_id خود Gateway
 * انجام می‌شود. این تفاوت آگاهانهٔ بدل تست است و در PostgREST،
 * کشف با factory_attempt_id انجام می‌شود.
 */
export class LocalBudgetLedgerAdapter implements BudgetLedger {
  private readonly settlements = new Map<string, SettlementRecord>();

  private readonly reconciliations: ReconciliationRecord[] = [];

  constructor(private readonly inner: InMemoryBudgetLedger) {}

  async reserve(
    work_item_id: string,
    attempt_id: string,
    amount: number,
  ): Promise<ReserveResult> {
    return this.inner.reserve(work_item_id, attempt_id, amount);
  }

  async settle(input: SettleInput): Promise<{
    settled: boolean;
    already_settled: boolean;
  }> {
    if (this.settlements.has(input.idempotency_key)) {
      return { settled: false, already_settled: true };
    }
    if (input.release_amount > 0) {
      this.inner.release(
        input.work_item_id,
        input.attempt_id,
        input.release_amount,
      );
    }
    if (input.commit_amount !== null) {
      this.inner.commit(
        input.work_item_id,
        input.attempt_id,
        input.commit_amount,
      );
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

  async findReservation(
    work_item_id: string,
    attempt_id: string,
  ): Promise<{ amount: number } | null> {
    const row = this.inner
      .entries()
      .find(
        (entry) =>
          entry.work_item_id === work_item_id &&
          entry.attempt_id === attempt_id &&
          entry.entry_kind === "reservation",
      );
    return row ? { amount: row.amount } : null;
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
    const record = await this.findOpenReconciliation(input.attempt_id);
    if (!record) {
      return null;
    }
    record.status = input.status;
    record.evidence = input.evidence;
    record.actor = input.actor;
    record.reason = input.reason;
    record.resolved_at = new Date().toISOString();
    return record;
  }
}

export interface PostgrestLedgerConfig {
  url: string;
  serviceKey: string;
  fetchImpl?: typeof fetch;
}

/**
 * حالت PostgREST سمت سرور: رزرو و تسویه و مصالحه روی دیتابیس واقعی.
 * سقف‌ها در دیتابیس enforce می‌شوند، نه فقط در کد. سربرگ‌ها آینهٔ
 * الگوی internal-api.ts است: apikey و Bearer با کلید service_role که
 * فقط سمت سرور می‌ماند و هرگز به مرورگر نمی‌رسد.
 */
export class PostgrestBudgetLedger implements BudgetLedger {
  private readonly url: string;

  private readonly serviceKey: string;

  private readonly fetchImpl: typeof fetch;

  constructor(config: PostgrestLedgerConfig) {
    this.url = config.url.replace(/\/$/, "");
    this.serviceKey = config.serviceKey;
    this.fetchImpl = config.fetchImpl ?? fetch;
  }

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    return {
      apikey: this.serviceKey,
      Authorization: `Bearer ${this.serviceKey}`,
      "Content-Type": "application/json",
      ...extra,
    };
  }

  private async rpc(
    fn: string,
    body: Record<string, unknown>,
  ): Promise<unknown> {
    const res = await this.fetchImpl(`${this.url}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) {
      throw new LedgerError(`rpc ${fn} failed with ${res.status}`);
    }
    return text ? (JSON.parse(text) as unknown) : null;
  }

  private async query<T>(path: string): Promise<T[]> {
    const res = await this.fetchImpl(`${this.url}/rest/v1/${path}`, {
      method: "GET",
      headers: this.headers(),
    });
    const text = await res.text();
    if (!res.ok) {
      throw new LedgerError(`postgrest query failed with ${res.status}`);
    }
    return text ? (JSON.parse(text) as T[]) : [];
  }

  async reserve(
    work_item_id: string,
    _attempt_id: string,
    amount: number,
    factory_attempt_id?: string | null,
  ): Promise<ReserveResult> {
    const rows = await this.query<{ budget_limit: number | null }>(
      `factory_work_items?id=eq.${encodeURIComponent(work_item_id)}&select=budget_limit`,
    );
    if (rows.length === 0 || rows[0].budget_limit === null) {
      return { ok: false, reason: "not_configured" };
    }
    const result = await this.rpc("reserve_budget", {
      p_work_item_id: work_item_id,
      p_attempt_id: factory_attempt_id ?? null,
      p_amount: amount,
    });
    return result === true
      ? { ok: true }
      : { ok: false, reason: "exceeded" };
  }

  async settle(input: SettleInput): Promise<{
    settled: boolean;
    already_settled: boolean;
  }> {
    const result = (await this.rpc("settle_gateway_attempt", {
      p_work_item_id: input.work_item_id,
      p_factory_attempt_id: input.factory_attempt_id,
      p_gateway_attempt_id: input.attempt_id,
      p_idempotency_key: input.idempotency_key,
      p_release_amount: input.release_amount,
      p_commit_amount: input.commit_amount,
      p_cost_basis: input.cost_basis,
    })) as Array<{ settled: boolean; already_settled: boolean }>;
    const row = result[0];
    if (!row) {
      throw new LedgerError("settle_gateway_attempt returned no row");
    }
    return { settled: row.settled, already_settled: row.already_settled };
  }

  async findSettlement(
    idempotency_key: string,
  ): Promise<SettlementRecord | null> {
    const rows = await this.query<Record<string, unknown>>(
      `factory_gateway_settlements?idempotency_key=eq.${encodeURIComponent(idempotency_key)}&select=*`,
    );
    const row = rows[0];
    if (!row) {
      return null;
    }
    return {
      idempotency_key: String(row["idempotency_key"]),
      work_item_id: String(row["work_item_id"]),
      attempt_id: String(row["attempt_id"]),
      factory_attempt_id:
        row["factory_attempt_id"] === null
          ? null
          : String(row["factory_attempt_id"]),
      released_amount: Number(row["released_amount"]),
      committed_amount:
        row["committed_amount"] === null
          ? null
          : Number(row["committed_amount"]),
      cost_basis: row["cost_basis"] as CostBasis,
    };
  }

  async findReservation(
    work_item_id: string,
    _attempt_id: string,
    factory_attempt_id?: string | null,
  ): Promise<{ amount: number } | null> {
    if (!factory_attempt_id) {
      return null;
    }
    const rows = await this.query<{ amount: number | string }>(
      `factory_cost_ledger?work_item_id=eq.${encodeURIComponent(work_item_id)}&attempt_id=eq.${encodeURIComponent(factory_attempt_id)}&entry_kind=eq.reservation&select=amount`,
    );
    const row = rows[0];
    return row ? { amount: Number(row.amount) } : null;
  }

  private mapReconciliation(
    row: Record<string, unknown>,
  ): ReconciliationRecord {
    return {
      idempotency_key: String(row["idempotency_key"]),
      work_item_id: String(row["work_item_id"]),
      attempt_id: String(row["attempt_id"]),
      factory_attempt_id:
        row["factory_attempt_id"] === null
          ? null
          : String(row["factory_attempt_id"]),
      kind: row["kind"] as ReconciliationKind,
      estimated_cost: Number(row["estimated_cost"]),
      excess_amount:
        row["excess_amount"] === null
          ? null
          : Number(row["excess_amount"]),
      status: row["status"] as ReconciliationStatus,
      reason: String(row["reason"]),
      evidence:
        row["evidence"] === null ? null : String(row["evidence"]),
      actor: row["actor"] === null ? null : String(row["actor"]),
      resolved_at:
        row["resolved_at"] === null ? null : String(row["resolved_at"]),
      created_at: String(row["created_at"]),
    };
  }

  async findOpenReconciliation(
    attempt_id: string,
  ): Promise<ReconciliationRecord | null> {
    const rows = await this.query<Record<string, unknown>>(
      `factory_gateway_reconciliations?attempt_id=eq.${encodeURIComponent(attempt_id)}&status=eq.pending_reconciliation&select=*&order=created_at.desc&limit=1`,
    );
    const row = rows[0];
    return row ? this.mapReconciliation(row) : null;
  }

  async findReconciliation(
    attempt_id: string,
  ): Promise<ReconciliationRecord | null> {
    const rows = await this.query<Record<string, unknown>>(
      `factory_gateway_reconciliations?attempt_id=eq.${encodeURIComponent(attempt_id)}&select=*&order=created_at.desc&limit=1`,
    );
    const row = rows[0];
    return row ? this.mapReconciliation(row) : null;
  }

  async openReconciliation(
    input: OpenReconciliationInput,
  ): Promise<ReconciliationRecord> {
    const res = await this.fetchImpl(
      `${this.url}/rest/v1/factory_gateway_reconciliations`,
      {
        method: "POST",
        headers: this.headers({ Prefer: "return=representation" }),
        body: JSON.stringify({
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
        }),
      },
    );
    if (res.status === 409) {
      const rows = await this.query<Record<string, unknown>>(
        `factory_gateway_reconciliations?idempotency_key=eq.${encodeURIComponent(input.idempotency_key)}&select=*`,
      );
      const row = rows[0];
      if (!row) {
        throw new LedgerError("reconciliation conflict without a row");
      }
      return this.mapReconciliation(row);
    }
    const text = await res.text();
    if (!res.ok) {
      throw new LedgerError(
        `reconciliation insert failed with ${res.status}`,
      );
    }
    const created = (JSON.parse(text) as Array<Record<string, unknown>>)[0];
    if (!created) {
      throw new LedgerError("reconciliation insert returned no row");
    }
    return this.mapReconciliation(created);
  }

  async resolveReconciliation(
    input: ResolveReconciliationInput,
  ): Promise<ReconciliationRecord | null> {
    const res = await this.fetchImpl(
      `${this.url}/rest/v1/factory_gateway_reconciliations?attempt_id=eq.${encodeURIComponent(input.attempt_id)}&status=eq.pending_reconciliation`,
      {
        method: "PATCH",
        headers: this.headers({ Prefer: "return=representation" }),
        body: JSON.stringify({
          status: input.status,
          evidence: input.evidence,
          actor: input.actor,
          reason: input.reason,
          resolved_at: new Date().toISOString(),
        }),
      },
    );
    const text = await res.text();
    if (!res.ok) {
      throw new LedgerError(
        `reconciliation resolve failed with ${res.status}`,
      );
    }
    const updated = (JSON.parse(text) as Array<Record<string, unknown>>)[0];
    return updated ? this.mapReconciliation(updated) : null;
  }
}
