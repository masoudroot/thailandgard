import "./server-guard";
import type { BudgetLedger } from "./ledger";
import { LedgerError } from "./ledger";
import type { ProviderRegistry } from "./provider";
import {
  GatewayRequestSchema,
  type AttemptRecord,
  type AttemptStatus,
  type GatewayErrorCode,
  type GatewayRequest,
  type GatewayResponse,
  type OutputSchema,
} from "./types";

/**
 * قرارداد Gateway مدل (R3-A دلتا، نسخهٔ r3-gateway-2).
 *
 * این Gateway هیچ فراخواننده‌ای ندارد و به Tick وصل نمی‌شود؛
 * وصل کردن آن بستهٔ بعدی است. هیچ فراخوان پولی واقعی این‌جا
 * انجام نمی‌شود و هیچ محتوایی تولید یا منتشر نمی‌کند.
 *
 * ترتیب فراخوان:
 * ۱) اعتبارسنجی درخواست،
 * ۲) replay با idempotency_key (فقط نتیجه‌های پایانی فراخوان provider)،
 * ۳) یافتن provider و رد provider مسدود،
 * ۴) رزرو بودجه پیش از هر فراخوان provider، با آداپتور ledger
 *    (حالت محلی یا PostgREST سمت سرور با RPCهای واقعی)،
 * ۵) فراخوان provider با timeout از راه AbortSignal،
 * ۶) اعتبارسنجی خروجی ساخت‌یافته با Zod،
 * ۷) تسویه: release مابه‌التفاوت و commit هزینهٔ واقعی.
 *
 * نکته‌های قراردادی:
 * - timeout یعنی outcome_unknown، نه failed. فراخوان دوباره با همان
 *   کلید، نتیجهٔ ثبت‌شدهٔ unknown را با replayed برمی‌گرداند و
 *   provider را دوباره صدا نمی‌زند. فراخوان تازه فقط با attempt_id
 *   تازه و کلید تازه ممکن است و Retry کورکورانه ممنوع است.
 * - رد شدن اعتبارسنجی درخواست، provider ناشناخته، provider مسدود و
 *   رد بودجه زیر کلید ذخیره نمی‌شوند، چون عملیات انجام‌نشده است
 *   و تلاش دوباره پس از رفع مانع باید ممکن باشد.
 * - در unknown، سطر commit نوشته نمی‌شود (هزینه هنوز معلوم نیست)
 *   و actual_cost پاسخ برابر null است، نه صفر.
 * - پاسخ، هر دو هزینه را دارد: estimated_cost برآورد رزروشده و
 *   actual_cost هزینهٔ واقعی. خرابی ترابری ledger با کد ledger_error
 *   fail-closed گزارش می‌شود: پیش از فراخوان، Provider صدا زده
 *   نمی‌شود و پس از فراخوان موفق هم خروجی، موفقیت ذخیره نمی‌شود.
 */
export const GATEWAY_CONTRACT_VERSION = "r3-gateway-2";

export interface GatewayConfig {
  registry: ProviderRegistry;
  ledger: BudgetLedger;
  /**
   * برآورد هزینه به‌ازای هر توکن برای رزرو پیش از فراخوان.
   * پیش‌فرض ۱ واحد به‌ازای هر توکن است.
   */
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

export class ModelGateway {
  private readonly registry: ProviderRegistry;

  private readonly ledger: BudgetLedger;

  private readonly estimateUnitPrice: number;

  private readonly attempts = new Map<string, AttemptRecord>();

  private readonly idempotent = new Map<string, GatewayResponse>();

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

  private recordAttempt(
    request: {
      attempt_id: string;
      work_item_id: string;
      work_step_id: string;
    },
    status: AttemptStatus,
    error_code: GatewayErrorCode | undefined,
    estimated_cost: number,
    actual_cost: number | null,
  ): void {
    this.attempts.set(request.attempt_id, {
      attempt_id: request.attempt_id,
      work_item_id: request.work_item_id,
      work_step_id: request.work_step_id,
      status,
      error_code,
      estimated_cost,
      actual_cost,
      created_at: new Date().toISOString(),
    });
  }

  private failedResponse(
    request: {
      attempt_id: string;
      work_item_id: string;
      work_step_id: string;
      idempotency_key: string;
    },
    code: GatewayErrorCode,
    message: string,
    estimated_cost = 0,
    actual_cost: number | null = 0,
  ): GatewayResponse {
    this.recordAttempt(
      request,
      "failed",
      code,
      estimated_cost,
      actual_cost,
    );
    return {
      outcome: "failed",
      output: undefined,
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      estimated_cost,
      actual_cost,
      replayed: false,
      attempt_id: request.attempt_id,
      idempotency_key: request.idempotency_key,
      error: { code, message },
    };
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
        actual_cost: 0,
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
          },
          "failed",
          "validation_error",
          0,
          0,
        );
      }
      return response;
    }
    const request: GatewayRequest = {
      ...parsed.data,
      output_schema: outputSchema,
    };

    const stored = this.idempotent.get(request.idempotency_key);
    if (stored) {
      return { ...stored, replayed: true };
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
    let reserved: boolean;
    try {
      reserved = await this.ledger.reserve(
        request.work_item_id,
        request.attempt_id,
        estimate,
      );
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
    if (!reserved) {
      return this.failedResponse(
        request,
        "budget_exceeded",
        "budget reservation rejected before provider call",
        estimate,
        0,
      );
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
      if (!checked.success) {
        await this.ledger.release(
          request.work_item_id,
          request.attempt_id,
          estimate,
        );
        await this.ledger.commit(
          request.work_item_id,
          request.attempt_id,
          result.cost,
        );
        return this.failedResponse(
          request,
          "invalid_output",
          "provider output failed structured-output validation",
          estimate,
          result.cost,
        );
      }
      const actual = result.cost;
      if (estimate > actual) {
        await this.ledger.release(
          request.work_item_id,
          request.attempt_id,
          estimate - actual,
        );
      }
      await this.ledger.commit(
        request.work_item_id,
        request.attempt_id,
        actual,
      );
      const response: GatewayResponse = {
        outcome: "succeeded",
        output: checked.data,
        usage: result.usage,
        estimated_cost: estimate,
        actual_cost: actual,
        replayed: false,
        attempt_id: request.attempt_id,
        idempotency_key: request.idempotency_key,
      };
      this.recordAttempt(request, "succeeded", undefined, estimate, actual);
      this.idempotent.set(request.idempotency_key, response);
      return response;
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
        try {
          await this.ledger.release(
            request.work_item_id,
            request.attempt_id,
            estimate,
          );
        } catch (releaseError) {
          if (releaseError instanceof LedgerError) {
            return this.failedResponse(
              request,
              "ledger_error",
              releaseError.message,
              estimate,
              0,
            );
          }
          throw releaseError;
        }
        const response: GatewayResponse = {
          outcome: "unknown",
          output: undefined,
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
          estimated_cost: estimate,
          actual_cost: null,
          replayed: false,
          attempt_id: request.attempt_id,
          idempotency_key: request.idempotency_key,
          error: {
            code: "timeout",
            message: "provider call timed out; outcome unknown",
          },
        };
        this.recordAttempt(request, "unknown", "timeout", estimate, null);
        this.idempotent.set(request.idempotency_key, response);
        return response;
      }
      try {
        await this.ledger.release(
          request.work_item_id,
          request.attempt_id,
          estimate,
        );
        await this.ledger.commit(request.work_item_id, request.attempt_id, 0);
      } catch (settleError) {
        if (settleError instanceof LedgerError) {
          return this.failedResponse(
            request,
            "ledger_error",
            settleError.message,
            estimate,
            0,
          );
        }
        throw settleError;
      }
      return this.failedResponse(
        request,
        "provider_error",
        error instanceof Error ? error.message : "provider call failed",
        estimate,
        0,
      );
    }
  }
}
