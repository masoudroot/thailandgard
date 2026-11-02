/**
 * رجیستری سیاست Model Gateway برای تیم‌های فاز ۳ (نسخهٔ ۲).
 *
 * این ماژول فقط یک سند سیاست نسخه‌بندی‌شده است، نه فراخوانندهٔ Provider:
 * هیچ شبکه، هیچ دیتابیس، هیچ خواندن محیط و هیچ کلیدی در آن نیست و
 * عمداً نگهبان سمت سرور را وارد نمی‌کند تا از تست و هر مصرف‌کنندهٔ
 * سمت سرور بدون وابستگی اضافه قابل وارد باشد. مسیر واقعی فراخوان،
 * همان ProviderRegistry و آداپتور Gateway موجود است و این رجیستری
 * فقط قاعده‌های حاکم بر آن مسیر را ثبت می‌کند.
 *
 * قاعده‌های قطعی این نسخه (THG-RB-01، با تأیید صریح مدیر پروژه
 * در ۱۴۰۵/۰۸/۱۱):
 * - Provider واقعی ReformBoss متصل است و مصرف آن نامحدود است؛
 *   سقف مصرف اعمال نمی‌شود و ثبت هزینه فقط برای نمایش است.
 * - هیچ Fallback میان حساب‌ها نیست؛ حساب صندوق امن منسوخ است و هرگز
 *   در هیچ مسیری استفاده نمی‌شود.
 * - انتخاب مدل capability-based است؛ مدل extraction با مدل تولید متن
 *   الزاماً یکی نیست و هر capability فهرست نامزد خودش را دارد.
 * - Timeout هر مدل ۳۰ ثانیه است.
 * - نتیجهٔ outcome_unknown هرگز retry کور ندارد و برای reconciliation
 *   نگه داشته می‌شود.
 * - reasoning_content همیشه پیش از ذخیره حذف می‌شود.
 * - هزینهٔ unknown هرگز صفر فرض نمی‌شود و با null نشان داده می‌شود.
 *
 * نسخهٔ ۱ با سقف صفر، دست‌نخورده برای سابقه نگه داشته شده است؛
 * تغییر قاعده، نسخهٔ تازه می‌خواهد و ویرایش بی‌صدای نسخهٔ جاری ممنوع است.
 */

export const GATEWAY_REGISTRY_VERSION = 2;

export const GATEWAY_REGISTRY_ID = "gateway-registry-v2";

/**
 * شناسهٔ Provider واقعی تیم‌ها. رشتهٔ apiRoot فقط ریشهٔ عمومی API است،
 * نه Credential؛ هیچ کلید، توکن یا رمزی در این فایل نیست.
 */
export interface TeamGatewayProvider {
  id: "reformboss";
  status: "connected";
  apiRoot: "https://api.reformboss.com/v1";
  fallbackProvider: null;
  vaultAccountStatus: "deprecated";
}

export const TEAM_GATEWAY_PROVIDER: TeamGatewayProvider = {
  id: "reformboss",
  status: "connected",
  apiRoot: "https://api.reformboss.com/v1",
  fallbackProvider: null,
  vaultAccountStatus: "deprecated",
};

export const TEAM_GATEWAY_PROVIDERS: TeamGatewayProvider[] = [
  TEAM_GATEWAY_PROVIDER,
];

/**
 * سیاست بودجهٔ جاری. سقف تهی یعنی نامحدود: هیچ سقفی اعمال
 * نمی‌شود و ثبت هزینه فقط برای نمایش است. سقف صفر یعنی قفل کامل
 * مصرف، حتی اگر بودجه جداگانه تأیید شده باشد؛ باز شدن مصرف هم
 * سقف (مثبت یا نامحدود) و هم تأیید صریح بودجه را با هم می‌خواهد.
 */
export interface GatewayBudgetPolicy {
  consumptionCap: number | null;
  budgetApproved: boolean;
}

/** سیاست نسخهٔ ۱ (سقف صفر، قفل کامل)؛ برای سابقه نگه داشته شده است. */
export const GATEWAY_V1_BUDGET_POLICY: GatewayBudgetPolicy = {
  consumptionCap: 0,
  budgetApproved: false,
};

/** سیاست نسخهٔ ۲ (نامحدود، مصوب مدیر پروژه در THG-RB-01). */
export const GATEWAY_V2_BUDGET_POLICY: GatewayBudgetPolicy = {
  consumptionCap: null,
  budgetApproved: true,
};

export const CURRENT_BUDGET_POLICY: GatewayBudgetPolicy =
  GATEWAY_V2_BUDGET_POLICY;

export function isCallAllowed(policy: GatewayBudgetPolicy): boolean {
  return (
    (policy.consumptionCap === null || policy.consumptionCap > 0) &&
    policy.budgetApproved
  );
}

export type GatewayCapability = "extraction" | "generation";

export interface GatewayModelEntry {
  model: string;
  capabilities: GatewayCapability[];
}

/**
 * مدل‌های ثبت‌شده بر پایهٔ شواهد واقعی T1 تا T4. این فهرست، سیاست
 * انتخاب است نه فراخوان؛ نامزد هر capability جداگانه آمده تا هیچ
 * مدل پیش‌فرض واحدی برای همهٔ capabilityها فرض نشود.
 */
export const GATEWAY_MODELS: GatewayModelEntry[] = [
  { model: "qwen3.8-flash", capabilities: ["extraction", "generation"] },
  { model: "deepseek-v4.1-flash", capabilities: ["extraction"] },
  { model: "qwen3.8-max", capabilities: ["generation"] },
];

export function modelsForCapability(
  capability: GatewayCapability,
): string[] {
  return GATEWAY_MODELS.filter((entry) =>
    entry.capabilities.includes(capability),
  ).map((entry) => entry.model);
}

/** Timeout هر مدل، به میلی‌ثانیه. برای همهٔ مدل‌ها یکسان است. */
export const MODEL_TIMEOUT_MS = 30_000;

export function timeoutForModel(model: string): number {
  if (!GATEWAY_MODELS.some((entry) => entry.model === model)) {
    throw new Error(`unknown gateway model: ${model}`);
  }
  return MODEL_TIMEOUT_MS;
}

export type GatewayCallOutcome = "succeeded" | "failed" | "outcome_unknown";

export interface OutcomeDecision {
  retryBlindly: boolean;
  nextStep: "proceed" | "fail" | "hold_for_reconciliation";
}

/**
 * تصمیم پس از نتیجهٔ فراخوان. outcome_unknown در این رجیستری همان
 * وضعیت unknown قرارداد Gateway است و فقط برای reconciliation نگه
 * داشته می‌شود؛ هیچ مسیر retry کور برای آن وجود ندارد.
 */
export function decideAfterOutcome(
  outcome: GatewayCallOutcome,
): OutcomeDecision {
  switch (outcome) {
    case "succeeded":
      return { retryBlindly: false, nextStep: "proceed" };
    case "failed":
      return { retryBlindly: false, nextStep: "fail" };
    case "outcome_unknown":
      return { retryBlindly: false, nextStep: "hold_for_reconciliation" };
  }
}

/**
 * مقدار هزینه؛ null یعنی unknown. این قرارداد همان قرارداد
 * actual_cost در gateway/types است: هزینهٔ نامشخص هرگز صفرِ
 * گمراه‌کننده ثبت نمی‌شود.
 */
export type CostValue = number | null;

export function isCostKnown(cost: CostValue): boolean {
  return cost !== null;
}

export function costForDisplay(cost: CostValue): string {
  return cost === null ? "نامشخص" : String(cost);
}

export interface KnownCostSum {
  total: number;
  unknownCount: number;
}

/**
 * جمع هزینه‌های معلوم؛ مقدارهای unknown در جمع صفر فرض نمی‌شوند،
 * بلکه شمارشان جداگانه گزارش می‌شود.
 */
export function sumCosts(costs: CostValue[]): KnownCostSum {
  let total = 0;
  let unknownCount = 0;
  for (const cost of costs) {
    if (cost === null) {
      unknownCount += 1;
    } else {
      total += cost;
    }
  }
  return { total, unknownCount };
}

/**
 * حذف بازگشتی کلید reasoning_content از هر خروجی، پیش از ذخیره.
 * ورودی جهش نمی‌یابد؛ یک مقدار تازه برگردانده می‌شود.
 */
export function stripReasoningContent(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => stripReasoningContent(item));
  }
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(
      value as Record<string, unknown>,
    )) {
      if (key === "reasoning_content") {
        continue;
      }
      out[key] = stripReasoningContent(item);
    }
    return out;
  }
  return value;
}

export function containsReasoningContent(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some((item) => containsReasoningContent(item));
  }
  if (value !== null && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).some(
      ([key, item]) =>
        key === "reasoning_content" || containsReasoningContent(item),
    );
  }
  return false;
}

/**
 * شواهد تست‌های واقعی قبلی با حساب مرجع (T1 تا T4).
 *
 * این‌ها فقط متن شواهد تاریخی‌اند که در ۲۰۲۶-۱۱-۰۱ ثبت شده‌اند؛
 * دوباره اجرا نشده‌اند و هیچ فراخوان تازه‌ای برای تازه‌سازی آن‌ها
 * مجاز نیست. در همهٔ آن‌ها، مجموع جزئیات usage ارائه‌دهنده با
 * completion_tokens جمع نمی‌شود (usage_detail ناسازگار) و پاسخ خام،
 * reasoning_content دارد که پیش از ذخیره حذف می‌شود.
 */
export interface ReferenceEvidence {
  id: "T1" | "T2" | "T3" | "T4";
  model: string;
  capability: GatewayCapability;
  task: string;
  httpStatus: 200;
  latencySeconds: number;
  totalTokens: number;
  usageDetailConsistent: false;
  reasoningInRawResponse: true;
}

export const REFERENCE_EVIDENCE_RECORDED_AT = "2026-11-01";

export const REFERENCE_ACCOUNT_EVIDENCE: ReferenceEvidence[] = [
  {
    id: "T1",
    model: "qwen3.8-flash",
    capability: "extraction",
    task: "extraction",
    httpStatus: 200,
    latencySeconds: 10.3,
    totalTokens: 653,
    usageDetailConsistent: false,
    reasoningInRawResponse: true,
  },
  {
    id: "T2",
    model: "deepseek-v4.1-flash",
    capability: "extraction",
    task: "extraction",
    httpStatus: 200,
    latencySeconds: 6.3,
    totalTokens: 401,
    usageDetailConsistent: false,
    reasoningInRawResponse: true,
  },
  {
    id: "T3",
    model: "qwen3.8-max",
    capability: "generation",
    task: "draft",
    httpStatus: 200,
    latencySeconds: 5.4,
    totalTokens: 274,
    usageDetailConsistent: false,
    reasoningInRawResponse: true,
  },
  {
    id: "T4",
    model: "qwen3.8-flash",
    capability: "generation",
    task: "draft",
    httpStatus: 200,
    latencySeconds: 8.0,
    totalTokens: 459,
    usageDetailConsistent: false,
    reasoningInRawResponse: true,
  },
];

/**
 * تصمیم‌های باز که این رجیستری آن‌ها را قفل نگه می‌دارد. این‌ها
 * ریسک‌اند، نه Secret؛ هیچ مقداری از Credential در آن‌ها نیست.
 */
export const GATEWAY_PENDING_DECISIONS: string[] = [
  "production key must come from the Panachat secure card, never from chat; confirm the card holds a rotated key before the first real call (the reference credential was exposed in chat on 2026-10-31)",
  "the vault account stays deprecated with no fallback to it under any condition",
];
