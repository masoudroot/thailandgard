import "../gateway/server-guard";
import { randomUUID } from "node:crypto";
import { throwIfCrashAfter } from "../gateway/crash-test";
import { ModelGateway } from "../gateway/gateway";
import type { BudgetLedger } from "../gateway/ledger";
import {
  MockProvider,
  type MockProviderConfig,
} from "../gateway/mock-provider";
import {
  createDefaultRegistry,
  type ModelProvider,
  type ProviderCallInput,
  type ProviderCallResult,
} from "../gateway/provider";
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
  mockConfig?: MockProviderConfig;
}

export type GatewayCallOutcome =
  | {
      kind: "succeeded" | "failed" | "unknown";
      operation: OperationRow;
      response: GatewayResponse;
      providerCalls: number;
      mockCalls: number;
    };

/**
 * پوشش ثبت‌کنندهٔ Provider: پیش از فراخوان درونی، سطر عملیات را
 * به حالت sent با شمارندهٔ یک واحد بیشتر می‌برد (بادوام) و پس از
 * بازگشت، پاسخ را با حالت response_recorded در همان سطر ثبت
 * می‌کند. Crash میان این دو به‌روزرسانی، حالت sent بدون پاسخ
 * می‌سازد که بازیابی آن را نامعلوم می‌داند و Provider را دوباره
 * صدا نمی‌زند. (از چرخهٔ R3B به این‌جا منتقل شد، بدون تغییر رفتار.)
 */
class RecordingProvider implements ModelProvider {
  readonly id: string;

  readonly status = "available" as const;

  private readonly inner: ModelProvider;

  private readonly cfg: DbCfg;

  private readonly operationId: string;

  constructor(
    inner: ModelProvider,
    cfg: DbCfg,
    operationId: string,
  ) {
    this.inner = inner;
    this.id = inner.id;
    this.cfg = cfg;
    this.operationId = operationId;
  }

  async call(input: ProviderCallInput): Promise<ProviderCallResult> {
    const current = await getOperationById(this.cfg, this.operationId);
    if (!current) {
      throw new Error("gateway operation row vanished before provider call");
    }
    await incrementProviderCalls(this.cfg, this.operationId, current.provider_calls);
    const result = await this.inner.call(input);
    throwIfCrashAfter("send");
    await patchOperation(this.cfg, this.operationId, {
      state: "response_recorded",
      response_json: {
        output: result.output,
        usage: result.usage,
        cost: result.cost,
        cost_basis: result.cost_basis,
        cost_unit: result.cost_unit,
      },
      actual_cost: result.cost,
      cost_basis: result.cost_basis,
      cost_unit: result.cost_unit,
    });
    return result;
  }
}

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

  const mock = new MockProvider(deps.mockConfig ?? {});
  const recording = new RecordingProvider(mock, cfg, operation.id);
  const registry = createDefaultRegistry();
  registry.register(recording);
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
      mockCalls: mock.getCallCount(),
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
      mockCalls: mock.getCallCount(),
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
    mockCalls: mock.getCallCount(),
  };
}
