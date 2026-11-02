import "./server-guard";
import type {
  ModelProvider,
  ProviderCallInput,
  ProviderCallResult,
  ProviderStatus,
} from "./provider";
import { ProviderBlockedError } from "./provider";

/**
 * آداپتور ReformBoss برای Gateway (THG-RB-01).
 *
 * - کلید و ریشهٔ API فقط از متغیرهای محیطی سمت سرور خوانده
 *   می‌شوند؛ هیچ مقداری این‌جا hardcode نشده و هیچ مقداری لاگ
 *   نمی‌شود. نبود هر متغیر یعنی Provider مسدود با ذکر نام همان
 *   متغیر، نه فراخوان بی‌کلید.
 * - تایم‌اوت از سیگنال Gateway می‌آید که خودش به ۳۰ ثانیه بریده
 *   می‌شود؛ آداپتور نه تمدید می‌کند، نه خطای Abort را می‌بلعد و
 *   نه retry می‌کند. outcome_unknown در Gateway بدون retry کور
 *   می‌ماند.
 * - حذف reasoning_content در نقطهٔ خفگی Gateway انجام می‌شود، نه
 *   این‌جا؛ آداپتور خروجی را دست‌نخورده پاس می‌دهد.
 * - هزینه: اگر پاسخ، قیمت عددی بدهد، provider_actual است؛ وگرنه
 *   null یعنی نامعلوم، نه صفر.
 */

export const REFORMBOSS_ENV_VARS = [
  "REFORMBOSS_API_BASE_URL",
  "REFORMBOSS_API_KEY",
] as const;

interface ReformBossEnv {
  baseUrl: string | null;
  apiKey: string | null;
  missing: string[];
}

function readEnv(): ReformBossEnv {
  const baseUrl = process.env.REFORMBOSS_API_BASE_URL?.trim() || null;
  const apiKey = process.env.REFORMBOSS_API_KEY?.trim() || null;
  const missing: string[] = [];
  if (!baseUrl) missing.push("REFORMBOSS_API_BASE_URL");
  if (!apiKey) missing.push("REFORMBOSS_API_KEY");
  return { baseUrl, apiKey, missing };
}

function toMessages(input: unknown): Array<{ role: string; content: string }> {
  if (
    input !== null &&
    typeof input === "object" &&
    Array.isArray((input as { messages?: unknown }).messages)
  ) {
    return (input as { messages: Array<{ role: string; content: string }> })
      .messages;
  }
  if (
    input !== null &&
    typeof input === "object" &&
    typeof (input as { prompt?: unknown }).prompt === "string"
  ) {
    return [{ role: "user", content: (input as { prompt: string }).prompt }];
  }
  return [{ role: "user", content: JSON.stringify(input) }];
}

function parseContent(content: unknown): unknown {
  if (typeof content !== "string") return content;
  try {
    return JSON.parse(content) as unknown;
  } catch {
    return content;
  }
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export class ReformBossProvider implements ModelProvider {
  readonly id = "reformboss";

  get status(): ProviderStatus {
    return readEnv().missing.length === 0 ? "available" : "blocked";
  }

  get blockedReason(): string | undefined {
    const { missing } = readEnv();
    if (missing.length === 0) return undefined;
    return `reformboss_missing_env: ${missing.join(", ")} must be set in server environment`;
  }

  async call(input: ProviderCallInput): Promise<ProviderCallResult> {
    const env = readEnv();
    if (!env.baseUrl || !env.apiKey) {
      throw new ProviderBlockedError(
        this.id,
        this.blockedReason ?? "reformboss env is not configured",
      );
    }
    const { request, signal } = input;
    const response = await fetch(`${env.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: request.model_id,
        messages: toMessages(request.input),
        max_tokens: request.token_limit,
      }),
      signal,
    });
    if (!response.ok) {
      throw new Error(
        `reformboss request failed with ${response.status}`,
      );
    }
    const data = (await response.json()) as Record<string, unknown>;
    const choices = Array.isArray(data.choices) ? data.choices : [];
    const message = (choices[0] as { message?: { content?: unknown } } | undefined)
      ?.message;
    const usage = (data.usage ?? {}) as Record<string, unknown>;
    const promptTokens = finiteNumber(usage.prompt_tokens) ?? 0;
    const completionTokens = finiteNumber(usage.completion_tokens) ?? 0;
    const totalTokens =
      finiteNumber(usage.total_tokens) ?? promptTokens + completionTokens;
    const reportedCost =
      finiteNumber(usage.cost) ??
      finiteNumber(usage.total_cost) ??
      finiteNumber(data.cost);
    return {
      output: parseContent(message?.content),
      usage: { promptTokens, completionTokens, totalTokens },
      cost: reportedCost,
      cost_basis: reportedCost === null ? undefined : "provider_actual",
      cost_unit: "",
    };
  }
}
