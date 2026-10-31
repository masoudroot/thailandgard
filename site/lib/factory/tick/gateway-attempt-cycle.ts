import "../gateway/server-guard";
import { randomUUID } from "node:crypto";
import {
  throwIfCrashAfter,
  isSimulatedCrash,
} from "../gateway/crash-test";
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
  computeInputFingerprint,
  computeLogicalOperationId,
  countLedgerForAttempt,
  findOpenExcessForWorkItem,
  getLatestOperation,
  getOperationById,
  incrementProviderCalls,
  openOperation,
  patchOperation,
  OperationBlockedError,
  OperationConflictError,
  type OperationRow,
} from "../gateway/operations";
import {
  postgrestGet,
  postgrestRpc,
  postgrestWrite,
  type DbCfg,
} from "./internal-api";

/**
 * چرخهٔ attempt اتصال Gateway به Tick (R3B، قرارداد r3-gateway-4).
 *
 * این ماژول، همان ترتیب مسیر Tick را اجرا می‌کند، بدون این‌که خود
 * مسیر Tick یا قدم‌های راهنما یا قانون Scope دست بخورد:
 * ۱) Claim اتمیک Step با RPC claim_work_step_by_id،
 * ۲) درج سطر واقعی factory_attempts با attempt_no برابر
 *    attempt_count پس از Claim (دقیقاً همان کاری که مسیر Tick
 *    می‌کند؛ Gateway هرگز خودش سطر attempt یا step نمی‌سازد)،
 * ۳) باز کردن عملیات منطقی و بستن آن به همان attempt (با
 *    اعتبارسنجی تعلق attempt به همین Work Item و Step)،
 * ۴) فراخوان Gateway با همان factory_attempt_id،
 * ۵) finish واقعی Step با RPC finish_work_step.
 *
 * آن‌چه وصل نشده است: خود مسیر /api/factory/tick. این چرخه،
 * زنجیرهٔ راهنما را اجرا نمی‌کند و قدم تازه‌ای به آن اضافه
 * نمی‌کند؛ آیتم‌های آزمایشی با workflow_version برابر
 * gateway_test_v1 و step_key برابر gateway_model_call ساخته
 * می‌شوند و مسیر Tick چنین قدمی را با گیت unknown_step_key رد
 * می‌کند و هرگز اجرایش نمی‌کند.
 *
 * بازیابی (recoverGatewayOperation) فقط از روی سطرهای دیتابیس
 * کار می‌کند و Provider را صدا نمی‌زند. پاسخِ در حافظهٔ فرایند
 * مرده، مدرک نیست؛ فقط آن‌چه در سطر عملیات یا ledger یا تسویه
 * نشسته، شاهد است.
 */

export const GATEWAY_TEST_WORKFLOW = "gateway_test_v1";
export const GATEWAY_TEST_STEP_KEY = "gateway_model_call";
export const GATEWAY_TEST_OPERATION = "gateway_model_call";
export const CYCLE_EXECUTOR_KEY = "r3b-gateway-cycle";

export class CycleError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "CycleError";
    this.code = code;
  }
}

export interface GatewayCycleInput {
  work_item_id: string;
  operation_name: string;
  idempotency_key: string;
  capability: string;
  provider: string;
  model_id: string;
  prompt_version: string;
  token_limit: number;
  timeout: number;
  input: unknown;
  output_schema: OutputSchema;
  prior_operation_id?: string | null;
  retry_reason?: string | null;
}

export interface GatewayCycleDeps {
  ledger: BudgetLedger;
  estimateUnitPrice?: number;
  mockConfig?: MockProviderConfig;
  leaseSeconds?: number;
}

export interface CycleOutcome {
  operation: OperationRow;
  gatewayResponse: GatewayResponse | null;
  stepStatus: string | null;
  finishStatus: string | null;
  replayed: boolean;
  providerCalls: number;
  mockCalls: number;
}

interface StepRow {
  id: string;
  work_item_id: string;
  step_key: string;
  status: string;
  attempt_count: number;
  max_attempts: number;
  fencing_token: number;
  lease_owner: string | null;
  lease_until: string | null;
}

interface AttemptInsert {
  id: string;
  attempt_no: number;
}

async function getWorkItem(
  cfg: DbCfg,
  work_item_id: string,
): Promise<Record<string, unknown> | null> {
  const rows = (await postgrestGet(
    cfg,
    `factory_work_items?id=eq.${encodeURIComponent(work_item_id)}&select=*`,
  )) as Record<string, unknown>[];
  return rows[0] ?? null;
}

async function getStepByKey(
  cfg: DbCfg,
  work_item_id: string,
  step_key: string,
): Promise<StepRow | null> {
  const steps = (await postgrestGet(
    cfg,
    `factory_work_steps?work_item_id=eq.${encodeURIComponent(work_item_id)}&step_key=eq.${encodeURIComponent(step_key)}&select=*`,
  )) as Record<string, unknown>[];
  const row = steps[0];
  if (!row) {
    return null;
  }
  return {
    id: String(row["id"]),
    work_item_id: String(row["work_item_id"]),
    step_key: String(row["step_key"]),
    status: String(row["status"]),
    attempt_count: Number(row["attempt_count"]),
    max_attempts: Number(row["max_attempts"]),
    fencing_token: Number(row["fencing_token"]),
    lease_owner: row["lease_owner"] === null ? null : String(row["lease_owner"]),
    lease_until: row["lease_until"] === null ? null : String(row["lease_until"]),
  };
}

async function getStepById(cfg: DbCfg, step_id: string): Promise<StepRow | null> {
  const rows = (await postgrestGet(
    cfg,
    `factory_work_steps?id=eq.${encodeURIComponent(step_id)}&select=*`,
  )) as Record<string, unknown>[];
  const row = rows[0];
  if (!row) {
    return null;
  }
  return {
    id: String(row["id"]),
    work_item_id: String(row["work_item_id"]),
    step_key: String(row["step_key"]),
    status: String(row["status"]),
    attempt_count: Number(row["attempt_count"]),
    max_attempts: Number(row["max_attempts"]),
    fencing_token: Number(row["fencing_token"]),
    lease_owner: row["lease_owner"] === null ? null : String(row["lease_owner"]),
    lease_until: row["lease_until"] === null ? null : String(row["lease_until"]),
  };
}

/**
 * پوشش ثبت‌کنندهٔ Provider: پیش از فراخوان درونی، سطر عملیات را
 * به حالت sent با شمارندهٔ یک واحد بیشتر می‌برد (بادوام) و پس از
 * بازگشت، پاسخ را با حالت response_recorded در همان سطر ثبت
 * می‌کند. Crash میان این دو به‌روزرسانی، حالت sent بدون پاسخ
 * می‌سازد که بازیابی آن را نامعلوم می‌داند و Provider را دوباره
 * صدا نمی‌زند.
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

export async function runGatewayAttemptCycle(
  cfg: DbCfg,
  deps: GatewayCycleDeps,
  input: GatewayCycleInput,
): Promise<CycleOutcome> {
  const leaseSeconds = deps.leaseSeconds ?? 3600;
  const workItem = await getWorkItem(cfg, input.work_item_id);
  if (!workItem) {
    throw new CycleError("work_item_not_found", "work item row does not exist");
  }
  const step = await getStepByKey(cfg, input.work_item_id, GATEWAY_TEST_STEP_KEY);
  if (!step) {
    throw new CycleError(
      "step_not_found",
      "gateway test step row does not exist; the cycle never invents steps",
    );
  }
  const openExcess = await findOpenExcessForWorkItem(cfg, input.work_item_id);
  if (openExcess) {
    throw new CycleError(
      "debt_open",
      "work item has an open excess reconciliation; new cost-bearing cycles are blocked until it is resolved",
    );
  }
  const operationInput = {
    work_item_id: input.work_item_id,
    work_step_id: step.id,
    operation_name: input.operation_name,
    idempotency_key: input.idempotency_key,
    capability: input.capability,
    provider: input.provider,
    model_id: input.model_id,
    prompt_version: input.prompt_version,
    token_limit: input.token_limit,
    timeout: input.timeout,
    input: input.input,
    prior_operation_id: input.prior_operation_id ?? null,
    retry_reason: input.retry_reason ?? null,
  };
  let opened;
  try {
    opened = await openOperation(cfg, operationInput, GATEWAY_TEST_STEP_KEY);
  } catch (error) {
    if (error instanceof OperationBlockedError) {
      throw new CycleError("operation_blocked", error.message);
    }
    if (error instanceof OperationConflictError) {
      throw new CycleError("idempotency_key_conflict", error.message);
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
      return {
        operation: row,
        gatewayResponse: null,
        stepStatus: null,
        finishStatus: null,
        replayed: true,
        providerCalls: row.provider_calls,
        mockCalls: 0,
      };
    }
    throw new CycleError(
      "operation_open_replay",
      "same key replayed while the operation is still open; run recovery instead of a fresh cycle",
    );
  }
  let operation = opened.row;
  const gatewayAttemptId = randomUUID();

  const claimedRows = (await postgrestRpc(cfg, "claim_work_step_by_id", {
    p_step_id: step.id,
    p_executor: CYCLE_EXECUTOR_KEY,
    p_lease_seconds: leaseSeconds,
  })) as Record<string, unknown>[] | null;
  const claimed = Array.isArray(claimedRows) ? claimedRows[0] : null;
  if (!claimed) {
    throw new CycleError(
      "claim_failed",
      "step claim raced or step not ready",
    );
  }
  const claimedStep: StepRow = {
    id: String(claimed["id"]),
    work_item_id: String(claimed["work_item_id"]),
    step_key: String(claimed["step_key"]),
    status: String(claimed["status"]),
    attempt_count: Number(claimed["attempt_count"]),
    max_attempts: Number(claimed["max_attempts"]),
    fencing_token: Number(claimed["fencing_token"]),
    lease_owner: claimed["lease_owner"] === null ? null : String(claimed["lease_owner"]),
    lease_until: claimed["lease_until"] === null ? null : String(claimed["lease_until"]),
  };

  const attemptRows = (await postgrestWrite(cfg, "POST", "factory_attempts", {
    work_item_id: claimedStep.work_item_id,
    work_step_id: claimedStep.id,
    attempt_no: claimedStep.attempt_count,
    executor_key: CYCLE_EXECUTOR_KEY,
    finish_status: "started",
    reconciliation_status: "not_required",
    estimated_cost: 0,
    actual_cost: 0,
  })) as Record<string, unknown>[];
  const attempt = attemptRows[0] as unknown as AttemptInsert | undefined;
  if (!attempt) {
    throw new CycleError("attempt_insert_failed", "factory attempt insert returned no row");
  }
  const factoryAttemptId = attempt.id;

  operation = await patchOperation(cfg, operation.id, {
    gateway_attempt_id: gatewayAttemptId,
    estimated_cost: input.token_limit * (deps.estimateUnitPrice ?? 1),
  });
  try {
    operation = await bindAttempt(cfg, operation, factoryAttemptId);
  } catch (error) {
    throw new CycleError("operation_bind_error", error instanceof Error ? error.message : "bind failed");
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
    work_step_id: step.id,
    attempt_id: gatewayAttemptId,
    factory_attempt_id: factoryAttemptId,
    capability: input.capability,
    provider: input.provider,
    model_id: input.model_id,
    prompt_version: input.prompt_version,
    token_limit: input.token_limit,
    timeout: input.timeout,
    idempotency_key: input.idempotency_key,
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
    throwIfCrashAfter("return");
    const finished = await finishStep(cfg, claimedStep, "succeeded", "succeeded", excessAmount !== null ? "pending" : "not_required", null);
    operation = await patchOperation(cfg, operation.id, { state: "settled" });
    return {
      operation,
      gatewayResponse: response,
      stepStatus: finished ? "succeeded" : null,
      finishStatus: "succeeded",
      replayed: false,
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
    throwIfCrashAfter("return");
    const finished = await finishStep(cfg, claimedStep, "blocked", "outcome_unknown", "pending", "timeout");
    return {
      operation,
      gatewayResponse: response,
      stepStatus: finished ? "blocked" : null,
      finishStatus: "outcome_unknown",
      replayed: false,
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
  throwIfCrashAfter("return");
  const finished = await finishStep(
    cfg,
    claimedStep,
    "failed",
    "failed",
    "not_required",
    response.error?.code ?? "provider_error",
  );
  return {
    operation,
    gatewayResponse: response,
    stepStatus: finished ? "failed" : null,
    finishStatus: "failed",
    replayed: false,
    providerCalls: operation.provider_calls,
    mockCalls: mock.getCallCount(),
  };
}

async function finishStep(
  cfg: DbCfg,
  claimedStep: StepRow,
  newStatus: string,
  finishStatus: string,
  reconciliation: string,
  errorCode: string | null,
): Promise<boolean> {
  const rows = (await postgrestRpc(cfg, "finish_work_step", {
    p_step_id: claimedStep.id,
    p_fencing_token: claimedStep.fencing_token,
    p_lease_owner: CYCLE_EXECUTOR_KEY,
    p_new_status: newStatus,
    p_finish_status: finishStatus,
    p_reconciliation_status: reconciliation,
    p_error_code: errorCode,
    p_output_artifact_id: null,
    p_scheduled_at: null,
  })) as Record<string, unknown>[] | null;
  return Array.isArray(rows) && rows.length > 0;
}

export interface RecoveryReport {
  logical_operation_id: string;
  operation_id: string | null;
  state_before: string;
  state_after: string;
  action: string;
  evidence: Record<string, unknown>;
  provider_calls: number;
  step_status: string | null;
  ledger: { reservation: number; release: number; commit: number; rejected: number } | null;
}

/**
 * بازیابی فقط از دیتابیس. این تابع هرگز Provider را صدا نمی‌زند و
 * هرگز نتیجهٔ در حافظه را مدرک نمی‌گیرد. برای هر حالت، شواهد از
 * سطر عملیات و ledger و تسویه و مصالحه و سطر Step خوانده می‌شود.
 */
export async function recoverGatewayOperation(
  cfg: DbCfg,
  ledger: BudgetLedger,
  logical_operation_id: string,
): Promise<RecoveryReport> {
  const operation = await getLatestOperation(cfg, logical_operation_id);
  if (!operation) {
    throw new CycleError("operation_not_found", "no operation row for this logical operation");
  }
  const stateBefore = operation.state;
  const step = await getStepById(cfg, operation.work_step_id);
  const settlement = await ledger.findSettlement(operation.idempotency_key);
  const openUnknown = operation.factory_attempt_id
    ? await findOpenUnknownForAttempt(cfg, operation)
    : null;
  const ledgerCounts = operation.factory_attempt_id
    ? await countLedgerForAttempt(cfg, operation.work_item_id, operation.factory_attempt_id)
    : null;
  const evidence: Record<string, unknown> = {
    operation_state: stateBefore,
    provider_calls: operation.provider_calls,
    has_response: operation.response_json !== null,
    has_settlement: settlement !== null,
    settlement_committed: settlement?.committed_amount ?? null,
    settlement_released: settlement?.released_amount ?? null,
    step_status: step?.status ?? null,
    open_unknown_reconciliation: openUnknown !== null,
    ledger: ledgerCounts,
  };

  const finishStoredOutcome = async (): Promise<boolean> => {
    if (!step || step.status !== "claimed") {
      return false;
    }
    const freshStep = await getStepById(cfg, operation.work_step_id);
    if (!freshStep || freshStep.status !== "claimed") {
      return false;
    }
    const freshOp = await getOperationById(cfg, operation.id);
    const freshState = freshOp?.state ?? operation.state;
    const freshExcess = freshOp?.unresolved_excess ?? operation.unresolved_excess;
    // ترتیب شاخه‌ها مهم است: تسویهٔ صرفاً آزادسازی (commit تهی)
    // یعنی آزادشده، نه موفق. پس حالت‌های پایانیِ آزادشده و
    // ارجاع‌شده و ناموفق، پیش از شاخهٔ تسویه بررسی می‌شوند و
    // شاخهٔ موفقیت، فقط تسویه با commit غیرتهی را موفق می‌داند.
    // (رفع باگ R3B: پیش از این، هر سطر تسویه، حتی آزادسازی تنها،
    // Step را موفق finish می‌کرد و Step عملیات آزادشدهٔ S4 به
    // اشتباه succeeded شد.)
    if (freshState === "failed") {
      return finishStep(cfg, freshStep, "failed", "failed", "not_required", "provider_error");
    }
    if (freshState === "released") {
      return finishStep(cfg, freshStep, "blocked", "outcome_unknown", "resolved", "timeout");
    }
    if (freshState === "referred") {
      return finishStep(cfg, freshStep, "blocked", "outcome_unknown", "needs_intervention", "timeout");
    }
    if (
      freshState === "settled" ||
      freshState === "settled_unreturned" ||
      (settlement !== null && settlement.committed_amount !== null)
    ) {
      return finishStep(cfg, freshStep, "succeeded", "succeeded", freshExcess !== null ? "pending" : "not_required", null);
    }
    return false;
  };

  if (stateBefore === "pending") {
    const reservation = operation.factory_attempt_id
      ? await ledger.findReservation(operation.work_item_id, "", operation.factory_attempt_id)
      : null;
    if (!reservation) {
      const updated = await patchOperation(cfg, operation.id, { state: "abandoned" });
      return {
        logical_operation_id,
        operation_id: operation.id,
        state_before: stateBefore,
        state_after: updated.state,
        action: "abandoned: no ledger reservation exists, so nothing was held; a fresh attempt may now open",
        evidence: { ...evidence, reservation_amount: null },
        provider_calls: updated.provider_calls,
        step_status: step?.status ?? null,
        ledger: ledgerCounts,
      };
    }
    const updated = await patchOperation(cfg, operation.id, {
      state: "reserved",
      reserved_amount: reservation.amount,
      estimated_cost: reservation.amount,
    });
    return {
      logical_operation_id,
      operation_id: operation.id,
      state_before: stateBefore,
      state_after: updated.state,
      action: "promoted to reserved from the ledger reservation row",
      evidence: { ...evidence, reservation_amount: reservation.amount },
      provider_calls: updated.provider_calls,
      step_status: step?.status ?? null,
      ledger: ledgerCounts,
    };
  }

  if (stateBefore === "reserved") {
    if (!operation.gateway_attempt_id) {
      throw new CycleError("recovery_error", "reserved operation without a gateway attempt id");
    }
    const reservation = operation.factory_attempt_id
      ? await ledger.findReservation(operation.work_item_id, "", operation.factory_attempt_id)
      : null;
    const releaseAmount = reservation?.amount ?? operation.reserved_amount ?? operation.estimated_cost;
    try {
      await ledger.settle({
        work_item_id: operation.work_item_id,
        attempt_id: operation.gateway_attempt_id,
        factory_attempt_id: operation.factory_attempt_id,
        idempotency_key: operation.idempotency_key,
        release_amount: releaseAmount,
        commit_amount: null,
        cost_basis: "estimated",
      });
    } catch (error) {
      if (isSimulatedCrash(error)) {
        throw error;
      }
      throw new CycleError("ledger_error", error instanceof Error ? error.message : "settle failed");
    }
    const updated = await patchOperation(cfg, operation.id, {
      state: "released",
      reserved_amount: releaseAmount,
      settled_amount: 0,
    });
    return {
      logical_operation_id,
      operation_id: operation.id,
      state_before: stateBefore,
      state_after: updated.state,
      action: "released: provider was never called, so the held reservation is returned in full",
      evidence: { ...evidence, released_amount: releaseAmount },
      provider_calls: updated.provider_calls,
      step_status: step?.status ?? null,
      ledger: ledgerCounts,
    };
  }

  if (stateBefore === "sent") {
    if (!operation.gateway_attempt_id) {
      throw new CycleError("recovery_error", "sent operation without a gateway attempt id");
    }
    if (!openUnknown) {
      const reservation = operation.factory_attempt_id
        ? await ledger.findReservation(operation.work_item_id, "", operation.factory_attempt_id)
        : null;
      await ledger.openReconciliation({
        idempotency_key: `${operation.idempotency_key}:unknown`,
        work_item_id: operation.work_item_id,
        attempt_id: operation.gateway_attempt_id,
        factory_attempt_id: operation.factory_attempt_id,
        kind: "unknown",
        estimated_cost: reservation?.amount ?? operation.estimated_cost,
        excess_amount: null,
        reason: "provider_send_outcome_unknown",
        evidence: `operation reached sent with ${operation.provider_calls} recorded send attempts and no durable response; outcome cannot be determined from the database`,
      });
    }
    const updated = await patchOperation(cfg, operation.id, { state: "unknown" });
    return {
      logical_operation_id,
      operation_id: operation.id,
      state_before: stateBefore,
      state_after: updated.state,
      action: "kept unknown: no blind retry, no provider re-call; operator evidence required",
      evidence,
      provider_calls: updated.provider_calls,
      step_status: step?.status ?? null,
      ledger: ledgerCounts,
    };
  }

  if (stateBefore === "unknown") {
    return {
      logical_operation_id,
      operation_id: operation.id,
      state_before: stateBefore,
      state_after: stateBefore,
      action: "no action: reconciliation is open and only operator evidence can resolve it",
      evidence,
      provider_calls: operation.provider_calls,
      step_status: step?.status ?? null,
      ledger: ledgerCounts,
    };
  }

  if (stateBefore === "response_recorded") {
    if (!operation.gateway_attempt_id) {
      throw new CycleError("recovery_error", "response_recorded operation without a gateway attempt id");
    }
    const gatewayAttemptId = operation.gateway_attempt_id;
    if (settlement) {
      const finished = await finishStoredOutcome();
      const updated = await patchOperation(cfg, operation.id, { state: "settled" });
      return {
        logical_operation_id,
        operation_id: operation.id,
        state_before: stateBefore,
        state_after: updated.state,
        action: "settlement already existed; finished the step from the stored outcome",
        evidence,
        provider_calls: updated.provider_calls,
        step_status: finished ? "succeeded" : (step?.status ?? null),
        ledger: ledgerCounts,
      };
    }
    const stored = operation.response_json;
    if (!stored) {
      throw new CycleError("recovery_error", "response_recorded without a stored response");
    }
    const actual = Number(stored["cost"] ?? 0);
    const reserved = operation.reserved_amount || operation.estimated_cost;
    const costBasis = (stored["cost_basis"] as "simulated" | "provider_actual" | "estimated") ?? "estimated";
    if (actual > reserved) {
      await ledger.settle({
        work_item_id: operation.work_item_id,
        attempt_id: gatewayAttemptId,
        factory_attempt_id: operation.factory_attempt_id,
        idempotency_key: operation.idempotency_key,
        release_amount: 0,
        commit_amount: reserved,
        cost_basis: costBasis,
      });
      await ledger.openReconciliation({
        idempotency_key: `${operation.idempotency_key}:excess`,
        work_item_id: operation.work_item_id,
        attempt_id: gatewayAttemptId,
        factory_attempt_id: operation.factory_attempt_id,
        kind: "excess",
        estimated_cost: reserved,
        excess_amount: actual - reserved,
        reason: "actual_exceeds_reservation",
        evidence: `recovery settled up to reservation ${reserved}; excess ${actual - reserved} stays open`,
      });
      await patchOperation(cfg, operation.id, {
        state: "settled_unreturned",
        settled_amount: reserved,
        actual_cost: actual,
        unresolved_excess: actual - reserved,
      });
      const finished = await finishStoredOutcome();
      const final = await patchOperation(cfg, operation.id, { state: "settled" });
      return {
        logical_operation_id,
        operation_id: operation.id,
        state_before: stateBefore,
        state_after: final.state,
        action: "settled from the stored response up to the reservation; excess kept as open reconciliation",
        evidence: { ...evidence, settled_from_stored_response: true },
        provider_calls: final.provider_calls,
        step_status: finished ? "succeeded" : (step?.status ?? null),
        ledger: ledgerCounts,
      };
    }
    await ledger.settle({
      work_item_id: operation.work_item_id,
      attempt_id: gatewayAttemptId,
      factory_attempt_id: operation.factory_attempt_id,
      idempotency_key: operation.idempotency_key,
      release_amount: reserved - actual,
      commit_amount: actual,
      cost_basis: costBasis,
    });
    await patchOperation(cfg, operation.id, {
      state: "settled_unreturned",
      settled_amount: actual,
      actual_cost: actual,
    });
    const finished = await finishStoredOutcome();
    const final = await patchOperation(cfg, operation.id, { state: "settled" });
    return {
      logical_operation_id,
      operation_id: operation.id,
      state_before: stateBefore,
      state_after: final.state,
      action: "settled from the stored response without calling the provider again",
      evidence: { ...evidence, settled_from_stored_response: true },
      provider_calls: final.provider_calls,
      step_status: finished ? "succeeded" : (step?.status ?? null),
      ledger: ledgerCounts,
    };
  }

  if (stateBefore === "settled_unreturned") {
    const finished = await finishStoredOutcome();
    const updated = await patchOperation(cfg, operation.id, { state: "settled" });
    return {
      logical_operation_id,
      operation_id: operation.id,
      state_before: stateBefore,
      state_after: updated.state,
      action: "settlement existed; finished the step from the stored outcome",
      evidence,
      provider_calls: updated.provider_calls,
      step_status: finished ? "succeeded" : (step?.status ?? null),
      ledger: ledgerCounts,
    };
  }

  const finished = await finishStoredOutcome();
  return {
    logical_operation_id,
    operation_id: operation.id,
    state_before: stateBefore,
    state_after: stateBefore,
    action: finished
      ? "terminal operation with an unfinished step; finished the step from the stored outcome"
      : "terminal operation; nothing to recover",
    evidence,
    provider_calls: operation.provider_calls,
    step_status: finished ? "succeeded" : (step?.status ?? null),
    ledger: ledgerCounts,
  };
}

async function findOpenUnknownForAttempt(
  cfg: DbCfg,
  operation: OperationRow,
): Promise<Record<string, unknown> | null> {
  if (!operation.gateway_attempt_id) {
    return null;
  }
  const rows = (await postgrestGet(
    cfg,
    `factory_gateway_reconciliations?attempt_id=eq.${encodeURIComponent(operation.gateway_attempt_id)}&kind=eq.unknown&status=eq.pending_reconciliation&order=created_at.desc&limit=1&select=*`,
  )) as Record<string, unknown>[];
  return rows[0] ?? null;
}

/**
 * حل مصالحهٔ یک عملیات پس از تصمیم اپراتور. خود reconcile را
 * Gateway انجام می‌دهد؛ این تابع فقط سطر عملیات را با نتیجه
 * همگام می‌کند. برای excess، تسویهٔ اضافه با همان reconcile
 * انجام می‌شود و پس از آن، نگهبان بدهی باز برای همین Work Item
 * دیگر جلوی چرخهٔ تازه را نمی‌گیرد.
 */
export async function resolveOperationReconciliation(
  cfg: DbCfg,
  gateway: ModelGateway,
  operation: OperationRow,
  decision: "release" | "commit" | "refer",
  evidence: string,
  actor: string,
  reason: string,
  actual_cost?: number,
): Promise<OperationRow> {
  if (!operation.gateway_attempt_id) {
    throw new CycleError("recovery_error", "operation has no gateway attempt id");
  }
  const result = await gateway.reconcile({
    attempt_id: operation.gateway_attempt_id,
    decision,
    evidence,
    actor,
    reason,
    actual_cost,
  });
  if (!result.ok || !result.record) {
    throw new CycleError(
      result.code ?? "reconciliation_failed",
      result.message ?? "reconciliation failed",
    );
  }
  const nextState =
    result.record.status === "resolved_released"
      ? "released"
      : result.record.status === "resolved_committed"
        ? "settled"
        : "referred";
  return patchOperation(cfg, operation.id, {
    state: nextState,
    unresolved_excess: nextState === "settled" ? null : operation.unresolved_excess,
  });
}

export { computeInputFingerprint, computeLogicalOperationId };
