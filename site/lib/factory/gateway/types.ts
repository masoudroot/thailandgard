import "./server-guard";
import { z } from "zod";

/**
 * قرارداد درخواست Gateway مدل (R3-A).
 *
 * میدان‌ها دقیقاً همان فهرست شرح مسیر است. `output_schema` یک اسکیمای Zod
 * سمت سرور است، نه JSON؛ چون Gateway فقط سمت سرور صدا زده می‌شود،
 * خروجی ساخت‌یافته را با همان اسکیما اعتبارسنجی می‌کند.
 * `input_schema` توصیف اختیاری ورودی است و اعتبارسنجی ورودی،
 * بر عهدهٔ فراخوانندهٔ سمت سرور است.
 */
export const GatewayRequestSchema = z.object({
  work_item_id: z.string().uuid(),
  work_step_id: z.string().uuid(),
  attempt_id: z.string().uuid(),
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
 * اسکیماهای Zod این ساختار را دارند و همین برای اعتبارسنجی کافی است.
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

export type GatewayOutcome = "succeeded" | "failed" | "unknown";

export type GatewayErrorCode =
  | "validation_error"
  | "provider_not_found"
  | "provider_blocked"
  | "budget_exceeded"
  | "timeout"
  | "invalid_output"
  | "provider_error";

export interface GatewayErrorInfo {
  code: GatewayErrorCode;
  message: string;
}

export interface GatewayResponse {
  outcome: GatewayOutcome;
  /**
   * خروجی ساخت‌یافتهٔ اعتبارسنجی‌شده؛ فقط در موفقیت پر است.
   */
  output: unknown;
  usage: GatewayUsage;
  /**
   * هزینهٔ واقعی. در unknown برابر null است، چون هزینه هنوز معلوم نیست
   * و هرگز به‌جای آن صفر ثبت نمی‌شود.
   * در unknown، usage هم گزارش‌نشده است و صفرهایش فقط جای خالی‌اند.
   */
  cost: number | null;
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
  status: AttemptStatus;
  error_code?: GatewayErrorCode;
  created_at: string;
}
