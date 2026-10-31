import "../gateway/server-guard";
import { randomUUID } from "node:crypto";
import { throwIfCrashAfter } from "../gateway/crash-test";
import { ModelGateway } from "../gateway/gateway";
import type { BudgetLedger } from "../gateway/ledger";
import { createDefaultRegistry } from "../gateway/provider";
import type {
  GatewayResponse,
  OutputSchema,
} from "../gateway/types";
import {
  bindAttempt,
  computeLogicalOperationId,
  findOpenExcessForWorkItem,
  getOperationById,
  incrementProviderCalls,
  openOperation,
  OperationBlockedError,
  OperationConflictError,
  patchOperation,
  type OperationRow,
} from "../gateway/operations";
import type { DbCfg } from "./internal-api";

/**
 * هستهٔ مشترک اجرای عملیات Gateway برای قدمِ دارای attempt واقعی
 * (R3C).
 *
 * این ماژول، همان ترتیب چرخهٔ R3B را در دو تابع نگه می‌دارد، بی‌آن‌که
 * Claim یا درج attempt یا finish قدم را خودش انجام بدهد:
 * - openGatewayOperation: بررسی بدهی باز، باز کردن عملیات منطقی و
 *   طبقه‌بندی replay (پایانی یا باز) و مسدود؛
 * - runGatewayCallForOperation: بستن عملیات به attempt واقعی،
 *   فراخوان Gateway با همان factory_attempt_id و پیش‌برد وضعیت
 *   عملیات تا settled_unreturned یا unknown یا failed.
 * فراخواننده (چرخهٔ R3B یا مسیر Tick) قدم را Claim کرده و سطر
 * attempt واقعی را ساخته است؛ finish قدم و patch نهایی به settled،
 * با فراخواننده است تا هر مسیر، fencing و executor خودش را نگه
 * دارد. ترتیب در چرخهٔ R3B دقیقاً حفظ شده است (باز کردن عملیات،
 * پیش از Claim) تا آزمون هم‌زمانی S2 همان رفتار را بدهد.
 *
 * چرا مشترک: پیش از این، همین ترتیب فقط در چرخهٔ R3B بود و مسیر
 * Tick اگر آن را کپی می‌کرد، منطق موازی می‌شد. حالا هستهٔ مالی
 * (رزرو، فراخوان، تسویه، مصالحه) یکی است و فقط نگاشت خروجیِ
 * باز/مسدود با فراخواننده فرق می‌کند (چرخه throw می‌کند، مسیر
 * Tick گیت برمی‌گرداند تا قدم claimed بماند و Attempt نسوزد).
 * بازیابی (recoverGatewayOperation در چرخهٔ R3B) دست نخورده است و
 * فقط از روی سطرهای دیتابیس کار می‌کند.
 */

export class GatewayOperationError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "GatewayOperationError";
    this.code = code;
  }
}

export interface GatewayOperationOpenInput {
  work_item_id: string;
  work_step_id: string;
  operation_name: string;
  idempotency_key: string;
  capability: string;
  provider: string;
  model_id: string;
  prompt_version: string;
  token_limit: number;
  timeout: number;
  input: unknown;
  prior_operation_id?: string | null;
  retry_reason?: string | null;
}

export type GatewayOperationOpenOutcome =
  | { kind: "created"; operation: OperationRow }
  | { kind: "replayed"; operation: OperationRow }
  | { kind: "open"; operation: OperationRow }
  | { kind: "blocked"; operation: null; reason: "debt_open" | "operation_blocked" };

export interface GatewayCallInput {
  operation: OperationRow;
  work_item_id: string;
  work_step_id: string;
  capability: string;
  provider: string;
  model_id: string;
  prompt_version: string;
  token_limit: number;
  timeout: number;
  input: unknown;
  output_schema: OutputSchema;
  factory_attempt_id: string;
}

export interface GatewayCallDeps {
  ledger: BudgetLedger;
  estimateUnitPrice?: number;
}

export type GatewayCallOutcome =
  | {
      kind: "succeeded" | "failed" | "unknown";
      operation: OperationRow;
      response: GatewayResponse;
      providerCalls: number;
      mockCalls: number;
    };

export function gatewayLogicalOperationId(
  work_item_id: string,
  step_key: string,
  operation_name: string,
): string {
  return computeLogicalOperationId(work_item_id, step_key, operation_name);
}

export async function openGatewayOperation(
  cfg: DbCfg,
  input: GatewayOperationOpenInput,
  step_key: string,
): Promise<GatewayOperationOpenOutcome> {
  const openExcess = await findOpenExcessForWorkItem(cfg, input.work_item_id);
  if (openExcess) {
    return { kind: "blocked", operation: null, reason: "debt_open" };
  }
  let opened;
  try {
    opened = await openOperation(cfg, { ...input }, step_key);
  } catch (error) {
    if (error instanceof OperationBlockedError) {
      return { kind: "blocked", operation: null, reason: "operation_blocked" };
    }
    if (error instanceof OperationConflictError) {
      throw new GatewayOperationError(
        "idempotency_key_conflict",
        error.message,
      );
    }
    throw error;
  }
  if (opened.status === "replay") {
    const row = opened.row;
    if (
      row.state === "settled" ||
      row.state === "released" ||
      row.state === "referred" ||
      row.state === "failed" ||
      row.state === "abandoned"
    ) {
      return { kind: "replayed", operation: row };
    }
    return { kind: "open", operation: row };
  }
  return { kind: "created", operation: opened.row };
}

export async function runGatewayCallForOperation(
  cfg: DbCfg,
  deps: GatewayCallDeps,
  input: GatewayCallInput,
): Promise<GatewayCallOutcome> {
  const gatewayAttemptId = randomUUID();
  let operation = await patchOperation(cfg, input.operation.id, {
    gateway_attempt_id: gatewayAttemptId,
    estimated_cost: input.token_limit * (deps.estimateUnitPrice ?? 1),
  });
  try {
    operation = await bindAttempt(cfg, operation, input.factory_attempt_id);
  } catch (error) {
    throw new GatewayOperationError(
      "operation_bind_error",
      error instanceof Error ? error.message : "bind failed",
    );
  }

  // RC (PRODUCTION-FINALIZE-01): no mock provider in the release. The
  // gateway is built from the default registry only (blocked muse-spark),
  // so any gateway call fails closed with provider_not_found /
  // provider_blocked and no provider is ever invoked.
  const registry = createDefaultRegistry();
  const gateway = new ModelGateway({
    registry,
    ledger: deps.ledger,
    estimateUnitPrice: deps.estimateUnitPrice ?? 1,
  });

  const response = await gateway.call({
    work_item_id: input.work_item_id,
    work_step_id: input.work_step_id,
    attempt_id: gatewayAttemptId,
    factory_attempt_id: input.factory_attempt_id,
    capability: input.capability,
    provider: input.provider,
    model_id: input.model_id,
    prompt_version: input.prompt_version,
    token_limit: input.token_limit,
    timeout: input.timeout,
    idempotency_key: input.operation.idempotency_key,
    input: input.input,
    output_schema: input.output_schema,
  });

  const settledAmount = response.settled_cost;
  const excessAmount = response.reconciliation?.excess_amount ?? null;
  if (response.outcome === "succeeded") {
    operation = await patchOperation(cfg, operation.id, {
      state: "settled_unreturned",
      reserved_amount: response.estimated_cost,
      settled_amount: settledAmount,
      actual_cost: response.actual_cost,
      estimated_cost: response.estimated_cost,
      unresolved_excess: excessAmount,
      cost_basis: response.actual_cost_basis,
      cost_unit: response.cost_unit,
    });
    return {
      kind: "succeeded",
      operation,
      response,
      providerCalls: operation.provider_calls,
      mockCalls: 0,
    };
  }
  if (response.outcome === "unknown") {
    operation = await patchOperation(cfg, operation.id, {
      state: "unknown",
      reserved_amount: response.estimated_cost,
      estimated_cost: response.estimated_cost,
    });
    return {
      kind: "unknown",
      operation,
      response,
      providerCalls: operation.provider_calls,
      mockCalls: 0,
    };
  }
  operation = await patchOperation(cfg, operation.id, {
    state: "failed",
    reserved_amount: response.estimated_cost,
    settled_amount: settledAmount,
    actual_cost: response.actual_cost,
    estimated_cost: response.estimated_cost,
    cost_basis: response.actual_cost_basis,
    cost_unit: response.cost_unit,
  });
  return {
    kind: "failed",
    operation,
    response,
    providerCalls: operation.provider_calls,
    mockCalls: 0,
  };
}
