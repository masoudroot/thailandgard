import "./server-guard";
import { createHash } from "node:crypto";
import {
  postgrestGet,
  postgrestWrite,
  type DbCfg,
} from "../tick/internal-api";

/**
 * لایهٔ عملیات منطقی Gateway (R3B، قرارداد r3-gateway-4).
 *
 * هر عملیات منطقی، یک شناسهٔ پایدار دارد که از Work Item و Step و
 * نام عملیات ساخته می‌شود و به کلید idempotency یا شناسهٔ attempt
 * وابسته نیست. سطر عملیات در دیتابیس، وضعیت بادوام هر تلاش را نگه
 * می‌دارد تا بازیابی پس از راه‌اندازی تازه، فقط از روی دیتابیس
 * ممکن باشد؛ ژورنال حافظه در این لایه هیچ نقشی ندارد.
 *
 * حالت‌های باز (که ایندکس یکتای جزئی دیتابیس، تک‌بودنشان را برای
 * هر عملیات منطقی تضمین می‌کند): pending و reserved و sent و
 * unknown و response_recorded و settled_unreturned. حالت‌های
 * پایانی: settled و released و referred و failed و abandoned.
 */

export const OPERATION_VERSION = "gwop1";

export const OPEN_OPERATION_STATES = [
  "pending",
  "reserved",
  "sent",
  "unknown",
  "response_recorded",
  "settled_unreturned",
] as const;

export type OperationState =
  | "pending"
  | "reserved"
  | "sent"
  | "unknown"
  | "response_recorded"
  | "settled_unreturned"
  | "settled"
  | "released"
  | "referred"
  | "failed"
  | "abandoned";

export interface OperationRow {
  id: string;
  logical_operation_id: string;
  work_item_id: string;
  work_step_id: string;
  factory_attempt_id: string | null;
  gateway_attempt_id: string | null;
  attempt_no: number | null;
  operation_name: string;
  idempotency_key: string;
  input_fingerprint: string;
  state: OperationState;
  reserved_amount: number;
  settled_amount: number | null;
  actual_cost: number | null;
  estimated_cost: number;
  unresolved_excess: number | null;
  cost_basis: string | null;
  cost_unit: string;
  provider_calls: number;
  response_json: Record<string, unknown> | null;
  prior_operation_id: string | null;
  retry_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface OperationInput {
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

export class OperationBlockedError extends Error {
  readonly code = "operation_blocked" as const;

  constructor(message: string) {
    super(message);
    this.name = "OperationBlockedError";
  }
}

export class OperationConflictError extends Error {
  readonly code = "idempotency_key_conflict" as const;

  constructor(message: string) {
    super(message);
    this.name = "OperationConflictError";
  }
}

export class OperationBindError extends Error {
  readonly code = "operation_bind_error" as const;

  constructor(message: string) {
    super(message);
    this.name = "OperationBindError";
  }
}

export function computeLogicalOperationId(
  work_item_id: string,
  step_key: string,
  operation_name: string,
): string {
  const hash = createHash("sha256")
    .update(`${work_item_id}|${step_key}|${operation_name}`, "utf8")
    .digest("hex");
  return `${OPERATION_VERSION}:${hash}`;
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

export function computeInputFingerprint(input: OperationInput): string {
  return createHash("sha256")
    .update(
      stableStringify([
        input.work_item_id,
        input.work_step_id,
        input.operation_name,
        input.capability,
        input.provider,
        input.model_id,
        input.prompt_version,
        input.token_limit,
        input.timeout,
        input.input,
      ]),
      "utf8",
    )
    .digest("hex");
}

function toRow(raw: Record<string, unknown>): OperationRow {
  return {
    id: String(raw["id"]),
    logical_operation_id: String(raw["logical_operation_id"]),
    work_item_id: String(raw["work_item_id"]),
    work_step_id: String(raw["work_step_id"]),
    factory_attempt_id:
      raw["factory_attempt_id"] === null
        ? null
        : String(raw["factory_attempt_id"]),
    gateway_attempt_id:
      raw["gateway_attempt_id"] === null
        ? null
        : String(raw["gateway_attempt_id"]),
    attempt_no: raw["attempt_no"] === null ? null : Number(raw["attempt_no"]),
    operation_name: String(raw["operation_name"]),
    idempotency_key: String(raw["idempotency_key"]),
    input_fingerprint: String(raw["input_fingerprint"]),
    state: raw["state"] as OperationState,
    reserved_amount: Number(raw["reserved_amount"]),
    settled_amount:
      raw["settled_amount"] === null ? null : Number(raw["settled_amount"]),
    actual_cost: raw["actual_cost"] === null ? null : Number(raw["actual_cost"]),
    estimated_cost: Number(raw["estimated_cost"]),
    unresolved_excess:
      raw["unresolved_excess"] === null
        ? null
        : Number(raw["unresolved_excess"]),
    cost_basis: raw["cost_basis"] === null ? null : String(raw["cost_basis"]),
    cost_unit: String(raw["cost_unit"]),
    provider_calls: Number(raw["provider_calls"]),
    response_json:
      raw["response_json"] === null
        ? null
        : (raw["response_json"] as Record<string, unknown>),
    prior_operation_id:
      raw["prior_operation_id"] === null
        ? null
        : String(raw["prior_operation_id"]),
    retry_reason:
      raw["retry_reason"] === null ? null : String(raw["retry_reason"]),
    created_at: String(raw["created_at"]),
    updated_at: String(raw["updated_at"]),
  };
}

const OPEN_IN = `in.(${OPEN_OPERATION_STATES.join(",")})`;

export type OpenOperationResult =
  | { status: "created"; row: OperationRow }
  | { status: "replay"; row: OperationRow };

export async function openOperation(
  cfg: DbCfg,
  input: OperationInput,
  step_key: string,
): Promise<OpenOperationResult> {
  const logical_operation_id = computeLogicalOperationId(
    input.work_item_id,
    step_key,
    input.operation_name,
  );
  const input_fingerprint = computeInputFingerprint(input);
  const body = {
    logical_operation_id,
    work_item_id: input.work_item_id,
    work_step_id: input.work_step_id,
    factory_attempt_id: null,
    attempt_no: null,
    operation_name: input.operation_name,
    idempotency_key: input.idempotency_key,
    input_fingerprint,
    state: "pending",
    reserved_amount: 0,
    settled_amount: null,
    actual_cost: null,
    estimated_cost: 0,
    unresolved_excess: null,
    cost_basis: null,
    cost_unit: "",
    provider_calls: 0,
    response_json: null,
    prior_operation_id: input.prior_operation_id ?? null,
    retry_reason: input.retry_reason ?? null,
  };
  try {
    const rows = (await postgrestWrite(
      cfg,
      "POST",
      "factory_gateway_operations",
      body,
    )) as Record<string, unknown>[];
    const row = rows[0];
    if (!row) {
      throw new Error("operation insert returned no row");
    }
    return { status: "created", row: toRow(row) };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (!message.includes("failed with 409")) {
      throw error;
    }
    // رقیب هم‌زمان ممکن است درجش را هنوز commit نکرده باشد؛
    // چند بار با فاصلهٔ کوتاه دوباره بخوان تا طبقه‌بندی، پایدار
    // باشد و خطای خام 409 به‌جای blocked/conflict برنگردد.
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const byKey = (await postgrestGet(
        cfg,
        `factory_gateway_operations?idempotency_key=eq.${encodeURIComponent(input.idempotency_key)}&select=*`,
      )) as Record<string, unknown>[];
      const keyRow = byKey[0];
      if (keyRow) {
        const existing = toRow(keyRow);
        if (existing.input_fingerprint !== input_fingerprint) {
          throw new OperationConflictError(
            "idempotency key was already used with different request content",
          );
        }
        if (existing.logical_operation_id !== logical_operation_id) {
          throw new OperationConflictError(
            "idempotency key belongs to a different logical operation",
          );
        }
        return { status: "replay", row: existing };
      }
      const open = (await postgrestGet(
        cfg,
        `factory_gateway_operations?logical_operation_id=eq.${encodeURIComponent(logical_operation_id)}&state=${OPEN_IN}&order=created_at.desc&limit=1&select=*`,
      )) as Record<string, unknown>[];
      if (open[0]) {
        throw new OperationBlockedError(
          "logical operation already has an open attempt; resolve it before a fresh attempt",
        );
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw error;
  }
}

export async function getLatestOperation(
  cfg: DbCfg,
  logical_operation_id: string,
): Promise<OperationRow | null> {
  const rows = (await postgrestGet(
    cfg,
    `factory_gateway_operations?logical_operation_id=eq.${encodeURIComponent(logical_operation_id)}&order=created_at.desc&limit=1&select=*`,
  )) as Record<string, unknown>[];
  return rows[0] ? toRow(rows[0]) : null;
}

export async function getOperationById(
  cfg: DbCfg,
  id: string,
): Promise<OperationRow | null> {
  const rows = (await postgrestGet(
    cfg,
    `factory_gateway_operations?id=eq.${encodeURIComponent(id)}&select=*`,
  )) as Record<string, unknown>[];
  return rows[0] ? toRow(rows[0]) : null;
}

export interface OperationPatch {
  state?: OperationState;
  factory_attempt_id?: string | null;
  gateway_attempt_id?: string | null;
  attempt_no?: number | null;
  reserved_amount?: number;
  settled_amount?: number | null;
  actual_cost?: number | null;
  estimated_cost?: number;
  unresolved_excess?: number | null;
  cost_basis?: string | null;
  cost_unit?: string;
  provider_calls?: number;
  response_json?: Record<string, unknown> | null;
}

export async function patchOperation(
  cfg: DbCfg,
  id: string,
  patch: OperationPatch,
): Promise<OperationRow> {
  const rows = (await postgrestWrite(
    cfg,
    "PATCH",
    `factory_gateway_operations?id=eq.${encodeURIComponent(id)}`,
    { ...patch, updated_at: new Date().toISOString() },
  )) as Record<string, unknown>[];
  const row = rows[0];
  if (!row) {
    throw new Error("operation update returned no row");
  }
  return toRow(row);
}

export async function incrementProviderCalls(
  cfg: DbCfg,
  id: string,
  currentCalls: number,
): Promise<OperationRow> {
  return patchOperation(cfg, id, {
    state: "sent",
    provider_calls: currentCalls + 1,
  });
}

export interface AttemptRowRef {
  id: string;
  work_item_id: string;
  work_step_id: string;
  attempt_no: number;
  finish_status: string;
  reconciliation_status: string;
}

export async function bindAttempt(
  cfg: DbCfg,
  operation: OperationRow,
  attemptId: string,
): Promise<OperationRow> {
  const attempts = (await postgrestGet(
    cfg,
    `factory_attempts?id=eq.${encodeURIComponent(attemptId)}&select=*`,
  )) as Record<string, unknown>[];
  const attempt = attempts[0];
  if (!attempt) {
    throw new OperationBindError("factory attempt row does not exist");
  }
  if (String(attempt["work_item_id"]) !== operation.work_item_id) {
    throw new OperationBindError(
      "factory attempt belongs to a different work item",
    );
  }
  if (String(attempt["work_step_id"]) !== operation.work_step_id) {
    throw new OperationBindError(
      "factory attempt belongs to a different work step",
    );
  }
  if (
    operation.factory_attempt_id !== null &&
    operation.factory_attempt_id !== attemptId
  ) {
    throw new OperationBindError("operation already bound to another attempt");
  }
  const others = (await postgrestGet(
    cfg,
    `factory_gateway_operations?factory_attempt_id=eq.${encodeURIComponent(attemptId)}&state=${OPEN_IN}&select=id`,
  )) as Record<string, unknown>[];
  if (others.some((row) => String(row["id"]) !== operation.id)) {
    throw new OperationBindError(
      "factory attempt already bound to another open operation",
    );
  }
  return patchOperation(cfg, operation.id, {
    factory_attempt_id: attemptId,
    attempt_no: Number(attempt["attempt_no"]),
  });
}

export async function findOpenExcessForWorkItem(
  cfg: DbCfg,
  work_item_id: string,
): Promise<Record<string, unknown> | null> {
  const rows = (await postgrestGet(
    cfg,
    `factory_gateway_reconciliations?work_item_id=eq.${encodeURIComponent(work_item_id)}&kind=eq.excess&status=eq.pending_reconciliation&order=created_at.desc&limit=1&select=*`,
  )) as Record<string, unknown>[];
  return rows[0] ?? null;
}

export interface LedgerCount {
  reservation: number;
  release: number;
  commit: number;
  rejected: number;
}

export async function countLedgerForAttempt(
  cfg: DbCfg,
  work_item_id: string,
  factory_attempt_id: string,
): Promise<LedgerCount> {
  const rows = (await postgrestGet(
    cfg,
    `factory_cost_ledger?work_item_id=eq.${encodeURIComponent(work_item_id)}&attempt_id=eq.${encodeURIComponent(factory_attempt_id)}&select=entry_kind,amount`,
  )) as Record<string, unknown>[];
  const count: LedgerCount = {
    reservation: 0,
    release: 0,
    commit: 0,
    rejected: 0,
  };
  for (const row of rows) {
    const kind = String(row["entry_kind"]);
    if (kind in count) {
      count[kind as keyof LedgerCount] += 1;
    }
  }
  return count;
}
