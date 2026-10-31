import "./server-guard";
import { z } from "zod";

/**
 * قرارداد درخواست Gateway مدل (R3A-SAFE، نسخهٔ r3-gateway-3).
 *
 * تغییرهای نسخهٔ ۳ نسبت به نسخهٔ ۲:
 * - میدان اختیاری `factory_attempt_id`: شناسهٔ سطر واقعی factory_attempts
 *   که فراخواننده (بعداً Tick) در زمان فراخوان می‌دهد. اعتبارسنجی حضور
 *   و شکل UUID آن این‌جا پیاده است، ولی الزام‌آور بودنش تا اتصال Tick
 *   به تعویق افتاده است؛ چون تا آن زمان، فراخواننده‌های آزمایشی و Mock
 *   بدون سطر attempt کارخانه کار می‌کنند. بدون آن، انتساب ledger به
 *   سطر attempt و کشف رزرو میان‌نسخه‌ای ممکن نیست و این محدودیت صریح
 *   در سند می‌ماند.
 * - هر مقدار هزینه، `cost_basis` دارد: `simulated` برای Mock،
 *   `provider_actual` برای Provider واقعی (هنوز نیست)، `estimated`
 *   وقتی هزینهٔ قطعی Provider نیست. واحد Mock، `mock-unit` است تا
 *   شبیه واحد پول واقعی نباشد.
 * - مبلغ ۳۰ در آزمون Mock دور پیش، هزینهٔ شبیه‌سازی‌شده با واحد
 *   mock-unit است، نه هزینهٔ واقعی ارائه‌دهنده.
 */
export const GatewayRequestSchema = z.object({
  work_item_id: z.string().uuid(),
  work_step_id: z.string().uuid(),
  attempt_id: z.string().uuid(),
  /**
   * شناسهٔ سطر واقعی factory_attempts؛ اختیاری تا اتصال Tick.
   * وقتی داده شود، آداپتور PostgREST آن را به RPCها می‌رساند و
   * سطرهای ledger به همان سطر می‌چسبند.
   */
  factory_attempt_id: z.string().uuid().optional(),
  capability: z.string().min(1),
  provider: z.string().min(1),
  model_id: z.string().min(1),
  prompt_version: z.string().min(1),
  input_schema: z.record(z.string(), z.unknown()).optional(),
  token_limit: z.number().int().positive(),
  timeout: z.number().int().positive(),
  idempotency_key: z.string().min(1),
  input: z.unknown(),
});

export type GatewayRequestInput = z.infer<typeof GatewayRequestSchema>;

/**
 * اسکیمای خروجی ساخت‌یافته: هر چیزی که `safeParse` داشته باشد.
 */
export interface OutputSchema {
  safeParse: (data: unknown) => {
    success: boolean;
    data?: unknown;
    error?: unknown;
  };
}

export interface GatewayRequest extends GatewayRequestInput {
  output_schema: OutputSchema;
}

export interface GatewayUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * مبنای هر مقدار هزینه. `simulated` یعنی عدد از Mock آمده و هزینهٔ
 * واقعی ارائه‌دهنده نیست؛ `provider_actual` یعنی عدد قطعی خود Provider
 * است؛ `estimated` یعنی برآورد است، نه هزینهٔ قطعی.
 */
export type CostBasis = "simulated" | "provider_actual" | "estimated";

export type GatewayOutcome = "succeeded" | "failed" | "unknown";

export type GatewayErrorCode =
  | "validation_error"
  | "provider_not_found"
  | "provider_blocked"
  | "budget_exceeded"
  | "budget_not_configured"
  | "ledger_error"
  | "timeout"
  | "invalid_output"
  | "provider_error"
  | "reconciliation_pending"
  | "reconciliation_not_found"
  | "idempotency_key_conflict";

export interface GatewayErrorInfo {
  code: GatewayErrorCode;
  message: string;
}

export interface GatewayReconciliationInfo {
  status: "pending_reconciliation";
  reason: string;
  excess_amount?: number;
}

export interface GatewayResponse {
  outcome: GatewayOutcome;
  output: unknown;
  usage: GatewayUsage;
  estimated_cost: number;
  /**
   * مبنای برآورد همیشه `estimated` است؛ برآورد از token_limit به دست
   * می‌آید و هزینهٔ قطعی نیست.
   */
  estimated_cost_basis: "estimated";
  actual_cost: number | null;
  /**
   * مبنای هزینهٔ واقعی؛ وقتی actual برابر null است، این میدان هم null
   * است و هرگز صفرِ گمراه‌کننده ثبت نمی‌شود.
   */
  actual_cost_basis: CostBasis | null;
  /**
   * واحد هزینهٔ واقعی؛ برای Mock برابر `mock-unit` است تا شبیه واحد
   * پول واقعی نباشد. وقتی هزینه‌ای نیست، رشتهٔ تهی است.
   */
  cost_unit: string;
  /**
   * مبنای محاسبه به زبان ساده؛ برای Mock صریح می‌گوید شبیه‌سازی است.
   */
  cost_calculation_basis: string;
  /**
   * مبلغ تسویه‌شده در ledger؛ در unknown و در ردهای پیش از تسویه برابر
   * null است. در حالت هزینهٔ فراتر از رزرو، برابر سقف رزرو است و
   * اضافه‌اش در `reconciliation` می‌آید، نه این‌که بی‌صدا جذب شود.
   */
  settled_cost: number | null;
  reconciliation?: GatewayReconciliationInfo;
  replayed: boolean;
  attempt_id: string;
  idempotency_key: string;
  error?: GatewayErrorInfo;
}

export type AttemptStatus = "succeeded" | "failed" | "unknown";

export interface AttemptRecord {
  attempt_id: string;
  work_item_id: string;
  work_step_id: string;
  factory_attempt_id: string | null;
  status: AttemptStatus;
  error_code?: GatewayErrorCode;
  estimated_cost: number;
  actual_cost: number | null;
  actual_cost_basis: CostBasis | null;
  settled_cost: number | null;
  reconciliation_status?: string;
  created_at: string;
}

export type ReconciliationKind = "unknown" | "excess";

export type ReconciliationStatus =
  | "pending_reconciliation"
  | "resolved_released"
  | "resolved_committed"
  | "referred_to_human";

export interface ReconciliationRecord {
  idempotency_key: string;
  work_item_id: string;
  attempt_id: string;
  factory_attempt_id: string | null;
  kind: ReconciliationKind;
  estimated_cost: number;
  excess_amount: number | null;
  status: ReconciliationStatus;
  reason: string;
  evidence: string | null;
  actor: string | null;
  resolved_at: string | null;
  created_at: string;
}

export type ReconciliationDecision = "release" | "commit" | "refer";

export interface ReconcileInput {
  attempt_id: string;
  decision: ReconciliationDecision;
  evidence: string;
  actor: string;
  reason: string;
  actual_cost?: number;
}

export interface ReconcileResult {
  ok: boolean;
  record?: ReconciliationRecord;
  code?: GatewayErrorCode;
  message?: string;
}

export interface SettlementRecord {
  idempotency_key: string;
  work_item_id: string;
  attempt_id: string;
  factory_attempt_id: string | null;
  released_amount: number;
  committed_amount: number | null;
  cost_basis: CostBasis;
}
