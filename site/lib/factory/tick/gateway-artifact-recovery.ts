import "../gateway/server-guard";
import type { z } from "zod";
import type { BudgetLedger } from "../gateway/ledger";
import {
  computeLogicalOperationId,
  getLatestOperation,
  patchOperation,
  type OperationRow,
} from "../gateway/operations";
import { postgrestWrite, type DbCfg } from "./internal-api";

/**
 * بازیابی Artifact پس از توقف میان Settlement و ثبت خروجی
 * (R3C-RECOVERY).
 *
 * این ماژول، فقط از روی سطرهای دیتابیس کار می‌کند و هرگز Provider
 * را صدا نمی‌زند. ترتیب، آگاهانه با مسیر Tick یکی است:
 * - عملیات بازِ settled_unreturned یا settled یا response_recorded
 *   با پاسخ ذخیره‌شدهٔ معتبر، پاراگراف قطعی را برمی‌گرداند تا
 *   مسیر Tick از همان پاسخ، Artifact را بسازد؛
 * - عملیات pending یا reserved (که Provider هنوز صدا زده نشده
 *   است) آزاد یا رها می‌شود تا فراخوان تازه، همان‌طور که مسیر
 *   عادی می‌کند، جلو برود؛
 * - عملیات sent یا unknown (که سرنوشت فراخوان Provider نامعلوم
 *   است) هرگز دوباره صدا زده نمی‌شود؛ مصالحهٔ unknown باز
 *   می‌شود و قدم، بدون سوزاندن Attempt، در گیت می‌ماند تا شواهد
 *   اپراتور برسد؛
 * - پاسخ ذخیره‌شدهٔ ناقص یا نامعتبر، قدم و آیتم را مسدود می‌کند؛
 *   پاسخ حدس زده نمی‌شود.
 *
 * هم‌زمانی: گذار settled_unreturned به settled با فیلتر حالت در
 * همان PATCH انجام می‌شود؛ پس از دو بازیابی هم‌زمان، فقط یکی
 * سطر را برمی‌گرداند و دیگری، بازندهٔ مسابقه است. Claim اتمیک
 * قدم و fencing در finish_step، لایهٔ دوم همان گارد است. این
 * ماژول، خودش قدم را finish نمی‌کند: قدم فقط پس از ثبت Artifact
 * معتبر، در مسیر Tick موفق می‌شود.
 */

export interface ValidStoredResponse {
  paragraph: string;
  actualCost: number;
  costBasis: "simulated" | "provider_actual" | "estimated";
  costUnit: string;
}

/** اعتبارسنجی خالص پاسخ ذخیره‌شده؛ برای تست واحد، بدون دیتابیس. */
export function parseStoredResponse(
  responseJson: unknown,
  outputSchema: z.ZodType,
): ValidStoredResponse | null {
  if (!responseJson || typeof responseJson !== "object") return null;
  const record = responseJson as Record<string, unknown>;
  const parsed = outputSchema.safeParse(record["output"]);
  if (!parsed.success) return null;
  const output = parsed.data as { draft_paragraph?: unknown };
  if (typeof output.draft_paragraph !== "string" || output.draft_paragraph.length < 1) return null;
  const actual = Number(record["cost"]);
  if (!Number.isFinite(actual) || actual < 0) return null;
  const basis = record["cost_basis"];
  if (basis !== "simulated" && basis !== "provider_actual" && basis !== "estimated") return null;
  return {
    paragraph: output.draft_paragraph,
    actualCost: actual,
    costBasis: basis,
    costUnit: typeof record["cost_unit"] === "string" ? record["cost_unit"] : "",
  };
}

export type ArtifactRecoveryOutcome =
  | { kind: "no_operation" }
  | { kind: "proceed_fresh"; operation: OperationRow | null }
  | {
      kind: "recovered";
      operation: OperationRow;
      paragraph: string;
      settledFromStored: boolean;
      excessAmount: number | null;
    }
  | { kind: "gate_open"; operation: OperationRow; reason: "gateway_response_unknown" | "gateway_unknown_reconciliation" }
  | { kind: "lost_race"; operation: OperationRow }
  | {
      kind: "blocked";
      operation: OperationRow | null;
      reason: "gateway_response_invalid" | "gateway_operation_incomplete";
    };

export interface ArtifactRecoveryInput {
  workItemId: string;
  stepKey: string;
  operationName: string;
  outputSchema: z.ZodType;
}

const TERMINAL_STATES = ["settled", "released", "referred", "failed", "abandoned"];

async function releaseReservation(
  cfg: DbCfg,
  ledger: BudgetLedger,
  operation: OperationRow,
  amount: number,
): Promise<OperationRow> {
  if (!operation.gateway_attempt_id) {
    throw new Error("operation without a gateway attempt id cannot be released");
  }
  await ledger.settle({
    work_item_id: operation.work_item_id,
    attempt_id: operation.gateway_attempt_id,
    factory_attempt_id: operation.factory_attempt_id,
    idempotency_key: operation.idempotency_key,
    release_amount: amount,
    commit_amount: null,
    cost_basis: "estimated",
  });
  return patchOperation(cfg, operation.id, {
    state: "released",
    reserved_amount: amount,
    settled_amount: 0,
  });
}

async function settleFromStored(
  cfg: DbCfg,
  ledger: BudgetLedger,
  operation: OperationRow,
  stored: ValidStoredResponse,
): Promise<{ operation: OperationRow; excessAmount: number | null }> {
  if (!operation.gateway_attempt_id) {
    throw new Error("operation without a gateway attempt id cannot be settled");
  }
  const reserved = operation.reserved_amount || operation.estimated_cost;
  if (stored.actualCost > reserved) {
    const excess = stored.actualCost - reserved;
    await ledger.settle({
      work_item_id: operation.work_item_id,
      attempt_id: operation.gateway_attempt_id,
      factory_attempt_id: operation.factory_attempt_id,
      idempotency_key: operation.idempotency_key,
      release_amount: 0,
      commit_amount: reserved,
      cost_basis: stored.costBasis,
    });
    const open = await ledger.findOpenReconciliation(operation.gateway_attempt_id);
    if (!open) {
      await ledger.openReconciliation({
        idempotency_key: `${operation.idempotency_key}:excess`,
        work_item_id: operation.work_item_id,
        attempt_id: operation.gateway_attempt_id,
        factory_attempt_id: operation.factory_attempt_id,
        kind: "excess",
        estimated_cost: reserved,
        excess_amount: excess,
        reason: "actual_exceeds_reservation",
        evidence: `recovery settled up to reservation ${reserved}; excess ${excess} stays open`,
      });
    }
    const updated = await patchOperation(cfg, operation.id, {
      state: "settled_unreturned",
      reserved_amount: reserved,
      settled_amount: reserved,
      actual_cost: stored.actualCost,
      cost_basis: stored.costBasis,
      cost_unit: stored.costUnit,
      unresolved_excess: excess,
    });
    return { operation: updated, excessAmount: excess };
  }
  await ledger.settle({
    work_item_id: operation.work_item_id,
    attempt_id: operation.gateway_attempt_id,
    factory_attempt_id: operation.factory_attempt_id,
    idempotency_key: operation.idempotency_key,
    release_amount: reserved - stored.actualCost,
    commit_amount: stored.actualCost,
    cost_basis: stored.costBasis,
  });
  const updated = await patchOperation(cfg, operation.id, {
    state: "settled_unreturned",
    reserved_amount: reserved,
    settled_amount: stored.actualCost,
    actual_cost: stored.actualCost,
    cost_basis: stored.costBasis,
    cost_unit: stored.costUnit,
  });
  return { operation: updated, excessAmount: null };
}

/**
 * گذار نگهبانی‌شدهٔ settled_unreturned به settled: فقط وقتی سطر،
 * هنوز در همان حالت است، یک سطر برمی‌گردد. بازندهٔ مسابقه، سطر
 * خالی می‌گیرد و هیچ Artifactی نمی‌سازد.
 */
async function claimSettledTransition(
  cfg: DbCfg,
  operation: OperationRow,
): Promise<OperationRow | null> {
  const rows = (await postgrestWrite(
    cfg,
    "PATCH",
    `factory_gateway_operations?id=eq.${encodeURIComponent(operation.id)}&state=eq.settled_unreturned`,
    { state: "settled", updated_at: new Date().toISOString() },
  )) as Record<string, unknown>[];
  if (rows.length === 0) return null;
  return {
    ...operation,
    state: "settled",
    updated_at: String(rows[0]["updated_at"] ?? operation.updated_at),
  };
}

export async function recoverGatewayArtifact(
  cfg: DbCfg,
  ledger: BudgetLedger,
  input: ArtifactRecoveryInput,
): Promise<ArtifactRecoveryOutcome> {
  const logicalId = computeLogicalOperationId(input.workItemId, input.stepKey, input.operationName);
  const operation = await getLatestOperation(cfg, logicalId);
  if (!operation) return { kind: "no_operation" };
  if (TERMINAL_STATES.includes(operation.state)) {
    return { kind: "proceed_fresh", operation };
  }

  if (operation.state === "pending") {
    const reservation = operation.factory_attempt_id
      ? await ledger.findReservation(operation.work_item_id, "", operation.factory_attempt_id)
      : null;
    if (!reservation || !operation.gateway_attempt_id) {
      const updated = await patchOperation(cfg, operation.id, { state: "abandoned" });
      return { kind: "proceed_fresh", operation: updated };
    }
    const updated = await releaseReservation(cfg, ledger, operation, reservation.amount);
    return { kind: "proceed_fresh", operation: updated };
  }

  if (operation.state === "reserved") {
    if (!operation.gateway_attempt_id) {
      return { kind: "blocked", operation, reason: "gateway_operation_incomplete" };
    }
    const reservation = operation.factory_attempt_id
      ? await ledger.findReservation(operation.work_item_id, "", operation.factory_attempt_id)
      : null;
    const amount = reservation?.amount ?? operation.reserved_amount ?? operation.estimated_cost;
    const updated = await releaseReservation(cfg, ledger, operation, amount);
    return { kind: "proceed_fresh", operation: updated };
  }

  if (operation.state === "sent") {
    if (!operation.gateway_attempt_id) {
      return { kind: "blocked", operation, reason: "gateway_operation_incomplete" };
    }
    const open = await ledger.findOpenReconciliation(operation.gateway_attempt_id);
    if (!open) {
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
    return { kind: "gate_open", operation: updated, reason: "gateway_response_unknown" };
  }

  if (operation.state === "unknown") {
    return { kind: "gate_open", operation, reason: "gateway_unknown_reconciliation" };
  }

  if (operation.state === "response_recorded") {
    if (!operation.gateway_attempt_id) {
      return { kind: "blocked", operation, reason: "gateway_operation_incomplete" };
    }
    const stored = parseStoredResponse(operation.response_json, input.outputSchema);
    if (!stored) {
      return { kind: "blocked", operation, reason: "gateway_response_invalid" };
    }
    const settlement = await ledger.findSettlement(operation.idempotency_key);
    let current = operation;
    let settledFromStored = false;
    let excessAmount: number | null = null;
    if (!settlement) {
      const settled = await settleFromStored(cfg, ledger, operation, stored);
      current = settled.operation;
      settledFromStored = true;
      excessAmount = settled.excessAmount;
    } else if (settlement.committed_amount === null) {
      // تسویهٔ صرفاً آزادسازی زیر پاسخ ثبت‌شده، ترکیب نامنتظری
      // است (تسویهٔ موفق همیشه commit دارد)؛ با حدس، settled
      // اعلام نمی‌شود.
      return { kind: "blocked", operation, reason: "gateway_operation_incomplete" };
    } else {
      current = await patchOperation(cfg, operation.id, {
        state: "settled_unreturned",
        reserved_amount: operation.reserved_amount || operation.estimated_cost,
        settled_amount: settlement.committed_amount,
        actual_cost: stored.actualCost,
        cost_basis: stored.costBasis,
        cost_unit: stored.costUnit,
      });
    }
    const transitioned = await claimSettledTransition(cfg, current);
    if (!transitioned) {
      return { kind: "lost_race", operation: current };
    }
    return {
      kind: "recovered",
      operation: transitioned,
      paragraph: stored.paragraph,
      settledFromStored,
      excessAmount: current.unresolved_excess ?? excessAmount,
    };
  }

  if (operation.state === "settled_unreturned") {
    const stored = parseStoredResponse(operation.response_json, input.outputSchema);
    if (!stored) {
      return { kind: "blocked", operation, reason: "gateway_response_invalid" };
    }
    const transitioned = await claimSettledTransition(cfg, operation);
    if (!transitioned) {
      return { kind: "lost_race", operation };
    }
    return {
      kind: "recovered",
      operation: transitioned,
      paragraph: stored.paragraph,
      settledFromStored: false,
      excessAmount: operation.unresolved_excess,
    };
  }

  if (operation.state === "settled") {
    const stored = parseStoredResponse(operation.response_json, input.outputSchema);
    if (!stored) {
      return { kind: "blocked", operation, reason: "gateway_response_invalid" };
    }
    return {
      kind: "recovered",
      operation,
      paragraph: stored.paragraph,
      settledFromStored: false,
      excessAmount: operation.unresolved_excess,
    };
  }

  return { kind: "proceed_fresh", operation };
}
