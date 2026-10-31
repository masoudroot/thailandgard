import "./server-guard";
import type { BudgetLedger } from "./ledger";
import { LedgerError } from "./ledger";
import type { ProviderRegistry } from "./provider";
import {
  GatewayRequestSchema,
  type AttemptRecord,
  type AttemptStatus,
  type CostBasis,
  type GatewayErrorCode,
  type GatewayRequest,
  type GatewayResponse,
  type OutputSchema,
  type ReconcileInput,
  type ReconcileResult,
  type ReconciliationRecord,
} from "./types";

/**
 * قرارداد Gateway مدل (R3A-SAFE، نسخهٔ r3-gateway-3).
 *
 * این Gateway هیچ فراخواننده‌ای ندارد و به Tick وصل نمی‌شود؛
 * وصل کردن آن بستهٔ بعدی است. هیچ فراخوان پولی واقعی این‌جا
 * انجام نمی‌شود و هیچ محتوایی تولید یا منتشر نمی‌کند.
 *
 * ترتیب فراخوان:
 * ۱) اعتبارسنجی درخواست،
 * ۲) replay با idempotency_key (فقط نتیجه‌های پایانی و unknownهای
 *    ثبت‌شده) و رد همان کلید با محتوای متفاوت،
 * ۳) ادامهٔ تسویهٔ ناتمام از ژورنال درون‌فرایندی (پس از خرابی تسویه)،
 * ۴) رد فراخوان تازه برای attemptای که مصالحهٔ باز دارد، با هر کلیدی،
 * ۵) یافتن provider و رد provider مسدود،
 * ۶) رزرو بودجه پیش از هر فراخوان provider، با آداپتور ledger
 *    (حالت محلی یا PostgREST سمت سرور با RPCهای واقعی) و سقف
 *    Fail-closed،
 * ۷) فراخوان provider با timeout از راه AbortSignal،
 * ۸) تسویهٔ idempotent از راه RPC تسویه (یا بدل محلی آن).
 *
 * سیاست مصالحه (بدون آزادسازی خودکار):
 * - timeout یعنی outcome_unknown، نه failed. در unknown، رزرو فوراً
 *   آزاد نمی‌شود؛ یک سطر مصالحه با وضعیت pending می‌ماند.
 * - آزادسازی فقط با شواهد عدم پردازش یا تصدیق اپراتور (actor و دلیل
 *   ثبت می‌شود)؛ تسویه فقط با شواهد مصرف (رسید usage یا هزینهٔ
 *   قطعی)؛ ارجاع به انسان وقتی نه شواهد پردازش هست و نه شواهد عدم
 *   پردازش. هیچ بازهٔ زمانی آزادسازی خودکار وجود ندارد.
 * - فراخوان تازه برای همان attempt، با هر کلیدی، تا وقتی مصالحه باز
 *   است با کد reconciliation_pending رد می‌شود. فراخوان تازه فقط با
 *   attempt_id تازه ممکن است و unknown قبلی همچنان در مصالحه می‌ماند.
 * - هزینهٔ واقعی بیشتر از رزرو، بی‌صدا جذب نمی‌شود: تا سقف رزرو
 *   تسویه می‌شود و اضافه‌اش به مصالحه می‌رود.
 *
 * مرز اتمیک بودن:
 * - تک‌فراخوان RPC اتمیک است؛ زنجیرهٔ چندفراخوانی اتمیک نیست و
 *   جبرانش، تسویهٔ idempotent با کلید یکتا و ژورنال درون‌فرایندی
 *   است. پس از راه‌اندازی تازه، کشف رزرو فقط با factory_attempt_id
 *   ممکن است؛ بدون آن، رزروی که پیش از Crash نشسته باشد، برای
 *   نمونهٔ تازه قابل انتساب نیست و این محدودیت صریح در سند می‌ماند.
 */
export const GATEWAY_CONTRACT_VERSION = "r3-gateway-3";

export interface GatewayConfig {
  registry: ProviderRegistry;
  ledger: BudgetLedger;
  estimateUnitPrice?: number;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function isAbortError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "AbortError" || error.name === "TimeoutError")
  );
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    const text = JSON.stringify(value);
    return text === undefined ? "undefined" : text;
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(",")}}`;
}

function requestFingerprint(request: {
  work_item_id: string;
  work_step_id: string;
  attempt_id: string;
  capability: string;
  provider: string;
  model_id: string;
  prompt_version: string;
  token_limit: number;
  timeout: number;
  input: unknown;
}): string {
  return stableStringify([
    request.work_item_id,
    request.work_step_id,
    request.attempt_id,
    request.capability,
    request.provider,
    request.model_id,
    request.prompt_version,
    request.token_limit,
    request.timeout,
    request.input,
  ]);
}

interface JournalEntry {
  kind: "success" | "invalid_output" | "provider_error";
  fingerprint: string;
  estimate: number;
  output: unknown;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number };
  actual: number;
  costBasis: CostBasis;
  costUnit: string;
  costCalculationBasis: string;
  errorMessage?: string;
}

interface StoredResponse {
  response: GatewayResponse;
  fingerprint: string;
}

export class ModelGateway {
  private readonly registry: ProviderRegistry;

  private readonly ledger: BudgetLedger;

  private readonly estimateUnitPrice: number;

  private readonly attempts = new Map<string, AttemptRecord>();

  private readonly idempotent = new Map<string, StoredResponse>();

  private readonly journal = new Map<string, JournalEntry>();

  private readonly unrecordedUnknowns = new Set<string>();

  constructor(config: GatewayConfig) {
    this.registry = config.registry;
    this.ledger = config.ledger;
    this.estimateUnitPrice = config.estimateUnitPrice ?? 1;
  }

  getAttempt(attempt_id: string): AttemptRecord | undefined {
    return this.attempts.get(attempt_id);
  }

  getAttempts(): AttemptRecord[] {
    return [...this.attempts.values()];
  }

  async getReconciliation(
    attempt_id: string,
  ): Promise<ReconciliationRecord | null> {
    return this.ledger.findReconciliation(attempt_id);
  }

  private recordAttempt(
    request: {
      attempt_id: string;
      work_item_id: string;
      work_step_id: string;
      factory_attempt_id?: string | null;
    },
    status: AttemptStatus,
    error_code: GatewayErrorCode | undefined,
    estimated_cost: number,
    actual_cost: number | null,
    actual_cost_basis: CostBasis | null,
    settled_cost: number | null,
    reconciliation_status?: string,
  ): void {
    this.attempts.set(request.attempt_id, {
      attempt_id: request.attempt_id,
      work_item_id: request.work_item_id,
      work_step_id: request.work_step_id,
      factory_attempt_id: request.factory_attempt_id ?? null,
      status,
      error_code,
      estimated_cost,
      actual_cost,
      actual_cost_basis,
      settled_cost,
      reconciliation_status,
      created_at: new Date().toISOString(),
    });
  }

  private failedResponse(
    request: {
      attempt_id: string;
      work_item_id: string;
      work_step_id: string;
      factory_attempt_id?: string | null;
      idempotency_key: string;
    },
    code: GatewayErrorCode,
    message: string,
    estimated_cost = 0,
    actual_cost: number | null = 0,
    settled_cost: number | null = null,
  ): GatewayResponse {
    this.recordAttempt(
      request,
      "failed",
      code,
      estimated_cost,
      actual_cost,
      null,
      settled_cost,
    );
    return {
      outcome: "failed",
      output: undefined,
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      estimated_cost,
      estimated_cost_basis: "estimated",
      actual_cost,
      actual_cost_basis: null,
      cost_unit: "",
      cost_calculation_basis: "",
      settled_cost,
      replayed: false,
      attempt_id: request.attempt_id,
      idempotency_key: request.idempotency_key,
      error: { code, message },
    };
  }

  /**
   * تسویهٔ idempotent: فراخوان تسویه اگر با خطا برگردد، سطر تسویه
   * خوانده می‌شود؛ اگر تسویه نشسته بود، همان نتیجه گرفته می‌شود و
   * اگر ننشسته بود، خطا بالا می‌آید تا تلاش دوباره با همان کلید،
   * تسویه را یک بار بنشاند.
   */
  private async settleOrRecover(input: {
    work_item_id: string;
    attempt_id: string;
    factory_attempt_id: string | null;
    idempotency_key: string;
    release_amount: number;
    commit_amount: number | null;
    cost_basis: CostBasis;
  }): Promise<{ committed: number | null }> {
    try {
      await this.ledger.settle(input);
      return { committed: input.commit_amount };
    } catch (error) {
      if (!(error instanceof LedgerError)) {
        throw error;
      }
      const found = await this.ledger.findSettlement(
        input.idempotency_key,
      );
      if (found) {
        return { committed: found.committed_amount };
      }
      throw error;
    }
  }

  /**
   * مصالحهٔ یک unknown باز: آزادسازی، تسویه یا ارجاع، با actor و
   * دلیل و شواهد ثبت‌شده. مصالحهٔ حل‌شده، با فراخوان دوباره همان
   * نتیجهٔ ذخیره‌شده را برمی‌گرداند و اثر ledgeri تازه ندارد.
   * تسویهٔ مصالحه هم با کلید یکتای خودش idempotent است.
   */
  async reconcile(input: ReconcileInput): Promise<ReconcileResult> {
    const existing = await this.ledger.findReconciliation(input.attempt_id);
    if (!existing) {
      return {
        ok: false,
        code: "reconciliation_not_found",
        message: `no reconciliation record for attempt ${input.attempt_id}`,
      };
    }
    if (existing.status !== "pending_reconciliation") {
      return { ok: true, record: existing };
    }
    if (existing.kind === "excess" && input.decision === "release") {
      return {
        ok: false,
        code: "validation_error",
        message: "excess reconciliation cannot release; it can commit or refer",
      };
    }
    if (input.decision === "refer") {
      const resolved = await this.ledger.resolveReconciliation({
        attempt_id: input.attempt_id,
        status: "referred_to_human",
        evidence: input.evidence,
        actor: input.actor,
        reason: input.reason,
      });
      if (!resolved) {
        const reread = await this.ledger.findReconciliation(
          input.attempt_id,
        );
        return reread
          ? { ok: true, record: reread }
          : {
              ok: false,
              code: "reconciliation_not_found",
              message: "reconciliation resolved concurrently",
            };
      }
      return { ok: true, record: resolved };
    }
    if (input.decision === "release") {
      try {
        await this.settleOrRecover({
          work_item_id: existing.work_item_id,
          attempt_id: existing.attempt_id,
          factory_attempt_id: existing.factory_attempt_id,
          idempotency_key: `reconcile:${existing.attempt_id}:release`,
          release_amount: existing.estimated_cost,
          commit_amount: null,
          cost_basis: "estimated",
        });
      } catch (error) {
        if (error instanceof LedgerError) {
          return { ok: false, code: "ledger_error", message: error.message };
        }
        throw error;
      }
      const resolved = await this.ledger.resolveReconciliation({
        attempt_id: input.attempt_id,
        status: "resolved_released",
        evidence: input.evidence,
        actor: input.actor,
        reason: input.reason,
      });
      if (!resolved) {
        const reread = await this.ledger.findReconciliation(
          input.attempt_id,
        );
        return reread
          ? { ok: true, record: reread }
          : {
              ok: false,
              code: "reconciliation_not_found",
              message: "reconciliation resolved concurrently",
            };
      }
      return { ok: true, record: resolved };
    }
    const actual =
      input.actual_cost ??
      (existing.kind === "excess" ? existing.excess_amount : null);
    if (actual === null || actual === undefined) {
      return {
        ok: false,
        code: "validation_error",
        message: "commit decision requires actual_cost",
      };
    }
    try {
      if (existing.kind === "excess") {
        await this.settleOrRecover({
          work_item_id: existing.work_item_id,
          attempt_id: existing.attempt_id,
          factory_attempt_id: existing.factory_attempt_id,
          idempotency_key: `reconcile:${existing.attempt_id}:commit`,
          release_amount: 0,
          commit_amount: existing.excess_amount,
          cost_basis: "estimated",
        });
      } else if (actual <= existing.estimated_cost) {
        await this.settleOrRecover({
          work_item_id: existing.work_item_id,
          attempt_id: existing.attempt_id,
          factory_attempt_id: existing.factory_attempt_id,
          idempotency_key: `reconcile:${existing.attempt_id}:commit`,
          release_amount: existing.estimated_cost - actual,
          commit_amount: actual,
          cost_basis: "estimated",
        });
      } else {
        await this.settleOrRecover({
          work_item_id: existing.work_item_id,
          attempt_id: existing.attempt_id,
          factory_attempt_id: existing.factory_attempt_id,
          idempotency_key: `reconcile:${existing.attempt_id}:commit`,
          release_amount: 0,
          commit_amount: existing.estimated_cost,
          cost_basis: "estimated",
        });
        await this.ledger.openReconciliation({
          idempotency_key: `reconcile:${existing.attempt_id}:excess`,
          work_item_id: existing.work_item_id,
          attempt_id: existing.attempt_id,
          factory_attempt_id: existing.factory_attempt_id,
          kind: "excess",
          estimated_cost: existing.estimated_cost,
          excess_amount: actual - existing.estimated_cost,
          reason: "actual_exceeds_reservation",
          evidence: input.evidence,
        });
      }
    } catch (error) {
      if (error instanceof LedgerError) {
        return { ok: false, code: "ledger_error", message: error.message };
      }
      throw error;
    }
    const resolved = await this.ledger.resolveReconciliation({
      attempt_id: input.attempt_id,
      status: "resolved_committed",
      evidence: input.evidence,
      actor: input.actor,
      reason: input.reason,
    });
    if (!resolved) {
      const reread = await this.ledger.findReconciliation(input.attempt_id);
      return reread
        ? { ok: true, record: reread }
        : {
            ok: false,
            code: "reconciliation_not_found",
            message: "reconciliation resolved concurrently",
          };
    }
    return { ok: true, record: resolved };
  }

  async call(raw: unknown): Promise<GatewayResponse> {
    const rawObject =
      raw !== null && typeof raw === "object"
        ? (raw as Record<string, unknown>)
        : {};
    const parsed = GatewayRequestSchema.safeParse(raw);
    const outputSchema = rawObject["output_schema"] as
      | OutputSchema
      | undefined;
    const outputSchemaOk =
      outputSchema !== undefined &&
      typeof outputSchema.safeParse === "function";
    if (!parsed.success || !outputSchemaOk) {
      const attemptId = rawObject["attempt_id"];
      const idempotencyKey =
        typeof rawObject["idempotency_key"] === "string"
          ? rawObject["idempotency_key"]
          : "";
      const response: GatewayResponse = {
        outcome: "failed",
        output: undefined,
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        estimated_cost: 0,
        estimated_cost_basis: "estimated",
        actual_cost: 0,
        actual_cost_basis: null,
        cost_unit: "",
        cost_calculation_basis: "",
        settled_cost: null,
        replayed: false,
        attempt_id: typeof attemptId === "string" ? attemptId : "",
        idempotency_key: idempotencyKey,
        error: {
          code: "validation_error",
          message: "gateway request failed validation",
        },
      };
      if (
        isUuid(attemptId) &&
        isUuid(rawObject["work_item_id"]) &&
        isUuid(rawObject["work_step_id"])
      ) {
        this.recordAttempt(
          {
            attempt_id: attemptId,
            work_item_id: rawObject["work_item_id"] as string,
            work_step_id: rawObject["work_step_id"] as string,
            factory_attempt_id:
              typeof rawObject["factory_attempt_id"] === "string"
                ? (rawObject["factory_attempt_id"] as string)
                : null,
          },
          "failed",
          "validation_error",
          0,
          0,
          null,
          null,
        );
      }
      return response;
    }
    const request: GatewayRequest = {
      ...parsed.data,
      output_schema: outputSchema,
    };
    const fingerprint = requestFingerprint(request);

    const stored = this.idempotent.get(request.idempotency_key);
    if (stored) {
      if (stored.fingerprint !== fingerprint) {
        return this.failedResponse(
          request,
          "idempotency_key_conflict",
          "idempotency key was already used with different request content",
          0,
          0,
        );
      }
      return { ...stored.response, replayed: true };
    }

    const journalEntry = this.journal.get(request.idempotency_key);
    if (journalEntry) {
      if (journalEntry.fingerprint !== fingerprint) {
        return this.failedResponse(
          request,
          "idempotency_key_conflict",
          "idempotency key was already used with different request content",
          0,
          0,
        );
      }
      return this.finishJournal(request, journalEntry);
    }

    let open: Awaited<
      ReturnType<BudgetLedger["findOpenReconciliation"]>
    >;
    try {
      open = await this.ledger.findOpenReconciliation(request.attempt_id);
    } catch (error) {
      if (error instanceof LedgerError) {
        return this.failedResponse(
          request,
          "ledger_error",
          error.message,
          0,
          0,
        );
      }
      throw error;
    }
    if (open || this.unrecordedUnknowns.has(request.attempt_id)) {
      return this.failedResponse(
        request,
        "reconciliation_pending",
        "attempt has an open reconciliation; resolve it before a fresh call",
        0,
        0,
      );
    }

    const provider = this.registry.get(request.provider);
    if (!provider) {
      return this.failedResponse(
        request,
        "provider_not_found",
        `provider ${request.provider} is not registered`,
      );
    }
    if (provider.status === "blocked") {
      return this.failedResponse(
        request,
        "provider_blocked",
        provider.blockedReason ?? `provider ${provider.id} is blocked`,
      );
    }

    const estimate = request.token_limit * this.estimateUnitPrice;
    const factoryAttemptId = request.factory_attempt_id ?? null;
    try {
      if (factoryAttemptId) {
        const existing = await this.ledger.findReservation(
          request.work_item_id,
          request.attempt_id,
          factoryAttemptId,
        );
        if (existing) {
          if (existing.amount !== estimate) {
            return this.failedResponse(
              request,
              "idempotency_key_conflict",
              "an existing reservation for this factory attempt has a different amount",
              estimate,
              0,
            );
          }
        } else {
          const reserved = await this.ledger.reserve(
            request.work_item_id,
            request.attempt_id,
            estimate,
            factoryAttemptId,
          );
          if (!reserved.ok) {
            return this.failedResponse(
              request,
              reserved.reason === "not_configured"
                ? "budget_not_configured"
                : "budget_exceeded",
              reserved.reason === "not_configured"
                ? "no valid budget cap is configured for this work item"
                : "budget reservation rejected before provider call",
              estimate,
              0,
            );
          }
        }
      } else {
        const reserved = await this.ledger.reserve(
          request.work_item_id,
          request.attempt_id,
          estimate,
          null,
        );
        if (!reserved.ok) {
          return this.failedResponse(
            request,
            reserved.reason === "not_configured"
              ? "budget_not_configured"
              : "budget_exceeded",
            reserved.reason === "not_configured"
              ? "no valid budget cap is configured for this work item"
              : "budget reservation rejected before provider call",
            estimate,
            0,
          );
        }
      }
    } catch (error) {
      if (error instanceof LedgerError) {
        return this.failedResponse(
          request,
          "ledger_error",
          error.message,
          estimate,
          0,
        );
      }
      throw error;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), request.timeout);
    try {
      const result = await provider.call({
        request,
        signal: controller.signal,
      });
      clearTimeout(timer);
      const checked = request.output_schema.safeParse(result.output);
      const actual = result.cost;
      const costBasis: CostBasis = result.cost_basis ?? "estimated";
      const costUnit = result.cost_unit ?? "";
      const costCalculationBasis =
        costBasis === "simulated"
          ? "totalTokens × costPerToken (simulated mock cost in mock-unit; not a provider charge)"
          : costBasis === "provider_actual"
            ? "provider-reported definitive cost"
            : "provider-reported cost without a definitive basis (estimated)";
      const journalEntry: JournalEntry = {
        kind: checked.success ? "success" : "invalid_output",
        fingerprint,
        estimate,
        output: checked.success ? checked.data : undefined,
        usage: result.usage,
        actual,
        costBasis,
        costUnit,
        costCalculationBasis,
      };
      this.journal.set(request.idempotency_key, journalEntry);
      return this.finishJournal(request, journalEntry);
    } catch (error) {
      clearTimeout(timer);
      if (error instanceof LedgerError) {
        return this.failedResponse(
          request,
          "ledger_error",
          error.message,
          estimate,
          0,
        );
      }
      if (controller.signal.aborted || isAbortError(error)) {
        let recorded = true;
        try {
          await this.ledger.openReconciliation({
            idempotency_key: request.idempotency_key,
            work_item_id: request.work_item_id,
            attempt_id: request.attempt_id,
            factory_attempt_id: factoryAttemptId,
            kind: "unknown",
            estimated_cost: estimate,
            excess_amount: null,
            reason: "provider_timeout_outcome_unknown",
            evidence: `provider call timed out after ${request.timeout}ms; no usage receipt`,
          });
        } catch (recordError) {
          if (recordError instanceof LedgerError) {
            recorded = false;
            this.unrecordedUnknowns.add(request.attempt_id);
          } else {
            throw recordError;
          }
        }
        const response: GatewayResponse = {
          outcome: "unknown",
          output: undefined,
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
          estimated_cost: estimate,
          estimated_cost_basis: "estimated",
          actual_cost: null,
          actual_cost_basis: null,
          cost_unit: "",
          cost_calculation_basis: "",
          settled_cost: null,
          replayed: false,
          attempt_id: request.attempt_id,
          idempotency_key: request.idempotency_key,
          error: recorded
            ? {
                code: "timeout",
                message:
                  "provider call timed out; outcome unknown; reservation held for reconciliation",
              }
            : {
                code: "ledger_error",
                message:
                  "provider call timed out and reconciliation recording failed; reservation held",
              },
        };
        this.recordAttempt(
          request,
          "unknown",
          recorded ? "timeout" : "ledger_error",
          estimate,
          null,
          null,
          null,
          "pending_reconciliation",
        );
        this.idempotent.set(request.idempotency_key, {
          response,
          fingerprint,
        });
        return response;
      }
      const journalEntry: JournalEntry = {
        kind: "provider_error",
        fingerprint,
        estimate,
        output: undefined,
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        actual: 0,
        costBasis: "estimated",
        costUnit: "",
        costCalculationBasis: "",
        errorMessage:
          error instanceof Error ? error.message : "provider call failed",
      };
      this.journal.set(request.idempotency_key, journalEntry);
      return this.finishJournal(request, journalEntry);
    }
  }

  /**
   * ادامهٔ تسویه از ژورنال، پس از موفقیت Provider یا خرابی مشخص آن:
   * اگر تسویه با خطا برگردد و سطر تسویه نشسته باشد، همان نتیجه
   * گرفته می‌شود؛ اگر ننشسته باشد، خطای ledger برمی‌گردد و ژورنال
   * می‌ماند تا تلاش دوباره با همان کلید، تسویه را یک بار بنشاند و
   * Provider را دوباره صدا نزند.
   */
  private async finishJournal(
    request: GatewayRequest,
    entry: JournalEntry,
  ): Promise<GatewayResponse> {
    const factoryAttemptId = request.factory_attempt_id ?? null;
    if (entry.kind === "invalid_output") {
      try {
        await this.settleOrRecover({
          work_item_id: request.work_item_id,
          attempt_id: request.attempt_id,
          factory_attempt_id: factoryAttemptId,
          idempotency_key: request.idempotency_key,
          release_amount: entry.estimate,
          commit_amount: entry.actual,
          cost_basis: entry.costBasis,
        });
      } catch (error) {
        if (error instanceof LedgerError) {
          return this.failedResponse(
            request,
            "ledger_error",
            error.message,
            entry.estimate,
            0,
          );
        }
        throw error;
      }
      this.journal.delete(request.idempotency_key);
      return this.failedResponse(
        request,
        "invalid_output",
        "provider output failed structured-output validation",
        entry.estimate,
        entry.actual,
        entry.actual,
      );
    }
    if (entry.kind === "provider_error") {
      try {
        await this.settleOrRecover({
          work_item_id: request.work_item_id,
          attempt_id: request.attempt_id,
          factory_attempt_id: factoryAttemptId,
          idempotency_key: request.idempotency_key,
          release_amount: entry.estimate,
          commit_amount: 0,
          cost_basis: "estimated",
        });
      } catch (error) {
        if (error instanceof LedgerError) {
          return this.failedResponse(
            request,
            "ledger_error",
            error.message,
            entry.estimate,
            0,
          );
        }
        throw error;
      }
      this.journal.delete(request.idempotency_key);
      return this.failedResponse(
        request,
        "provider_error",
        entry.errorMessage ?? "provider call failed",
        entry.estimate,
        0,
        0,
      );
    }
    const { estimate, actual, costBasis, costUnit, costCalculationBasis } =
      entry;
    if (actual > estimate) {
      try {
        await this.settleOrRecover({
          work_item_id: request.work_item_id,
          attempt_id: request.attempt_id,
          factory_attempt_id: factoryAttemptId,
          idempotency_key: request.idempotency_key,
          release_amount: 0,
          commit_amount: estimate,
          cost_basis: costBasis,
        });
      } catch (error) {
        if (error instanceof LedgerError) {
          return this.failedResponse(
            request,
            "ledger_error",
            error.message,
            estimate,
            0,
          );
        }
        throw error;
      }
      try {
        await this.ledger.openReconciliation({
          idempotency_key: `${request.idempotency_key}:excess`,
          work_item_id: request.work_item_id,
          attempt_id: request.attempt_id,
          factory_attempt_id: factoryAttemptId,
          kind: "excess",
          estimated_cost: estimate,
          excess_amount: actual - estimate,
          reason: "actual_exceeds_reservation",
          evidence: `provider reported actual ${actual} above reservation ${estimate}; settled up to reservation only`,
        });
      } catch (error) {
        if (error instanceof LedgerError) {
          return this.failedResponse(
            request,
            "ledger_error",
            error.message,
            estimate,
            actual,
          );
        }
        throw error;
      }
      this.journal.delete(request.idempotency_key);
      const response: GatewayResponse = {
        outcome: "succeeded",
        output: entry.output,
        usage: entry.usage,
        estimated_cost: estimate,
        estimated_cost_basis: "estimated",
        actual_cost: actual,
        actual_cost_basis: costBasis,
        cost_unit: costUnit,
        cost_calculation_basis: costCalculationBasis,
        settled_cost: estimate,
        reconciliation: {
          status: "pending_reconciliation",
          reason: "actual_exceeds_reservation",
          excess_amount: actual - estimate,
        },
        replayed: false,
        attempt_id: request.attempt_id,
        idempotency_key: request.idempotency_key,
      };
      this.recordAttempt(
        request,
        "succeeded",
        undefined,
        estimate,
        actual,
        costBasis,
        estimate,
        "pending_reconciliation",
      );
      this.idempotent.set(request.idempotency_key, {
        response,
        fingerprint: entry.fingerprint,
      });
      return response;
    }
    try {
      await this.settleOrRecover({
        work_item_id: request.work_item_id,
        attempt_id: request.attempt_id,
        factory_attempt_id: factoryAttemptId,
        idempotency_key: request.idempotency_key,
        release_amount: estimate - actual,
        commit_amount: actual,
        cost_basis: costBasis,
      });
    } catch (error) {
      if (error instanceof LedgerError) {
        return this.failedResponse(
          request,
          "ledger_error",
          error.message,
          estimate,
          0,
        );
      }
      throw error;
    }
    this.journal.delete(request.idempotency_key);
    const response: GatewayResponse = {
      outcome: "succeeded",
      output: entry.output,
      usage: entry.usage,
      estimated_cost: estimate,
      estimated_cost_basis: "estimated",
      actual_cost: actual,
      actual_cost_basis: costBasis,
      cost_unit: costUnit,
      cost_calculation_basis: costCalculationBasis,
      settled_cost: actual,
      replayed: false,
      attempt_id: request.attempt_id,
      idempotency_key: request.idempotency_key,
    };
    this.recordAttempt(
      request,
      "succeeded",
      undefined,
      estimate,
      actual,
      costBasis,
      actual,
    );
    this.idempotent.set(request.idempotency_key, {
      response,
      fingerprint: entry.fingerprint,
    });
    return response;
  }
}
