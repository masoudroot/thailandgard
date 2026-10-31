/**
 * منطق خالص Tick در R2: Kill Switch، Lease، Attempt و Budget برای مسیر
 * رسمی محتوا (guide_content_v1). این فایل هیچ دسترسی دیتابیسی و هیچ
 * Secret ندارد. نسخهٔ آزمایشگاهی (MVP-01) دو Workflow داشت؛ در R2 فقط
 * مسیر guide منتقل شده و Shadow (source_shadow_v1) موکول به بعد است:
 * Tick در R2، کار Shadow را نه Claim می‌کند و نه مسدود می‌کند (آن گارد،
 * در مسیر Tick است، نه این‌جا).
 */

/** ترتیب ثابت Stepهای مسیر رسمی، همان مسیر M4، بدون منطق موازی. */
export const TICK_STEP_KEYS = [
  "prepare_context",
  "create_artifact",
  "validate_artifact",
  "await_human_approval",
  "create_version",
  "publish_version",
  "process_publication",
  "complete_work",
] as const;

export type TickStepKey = (typeof TICK_STEP_KEYS)[number];

/**
 * ترتیب ثابت Stepهای Workflow آزمایشی اتصال Gateway در R3C. فقط
 * همین ۴ Step و همین ترتیب؛ هیچ قدم نسخه‌سازی یا انتشار در این
 * Workflow نیست، پس انتشار از این مسیر، ساختاری ناممکن است. قدم
 * generate_draft_mock، تنها قدم تازه است و فقط در همین Workflow
 * اجرا می‌شود؛ قدم‌های دیگر، همان قدم‌های مسیر رسمی‌اند.
 */
export const GATEWAY_TICK_STEP_KEYS = [
  "prepare_context",
  "generate_draft_mock",
  "validate_artifact",
  "await_human_approval",
] as const;

export type GatewayTickStepKey = (typeof GATEWAY_TICK_STEP_KEYS)[number];

export type AnyTickStepKey = TickStepKey | GatewayTickStepKey;

/**
 * نسخهٔ Workflow مسیر رسمی. فقط همین نسخه، با همین ۸ Step و همین
 * ترتیب، برای Tick مجاز است. نسخه‌بندی، یعنی Tick هرگز Workflow را در
 * میانهٔ اجرا بی‌صدا عوض نمی‌کند و Step ناشناخته را اجرا نمی‌کند.
 */
export const WORKFLOW_VERSION = "guide_content_v1";
export const WORKFLOW_STEPS = TICK_STEP_KEYS;

/** نسخهٔ Workflow آزمایشی اتصال Gateway در R3C. */
export const GATEWAY_WORKFLOW_VERSION = "guide_content_gateway_v1";
export const GATEWAY_WORKFLOW_STEPS = GATEWAY_TICK_STEP_KEYS;

export function isSupportedWorkflowVersion(version: string | null | undefined): boolean {
  return version === WORKFLOW_VERSION || version === GATEWAY_WORKFLOW_VERSION;
}

export function isValidWorkflowStepKey(stepKey: string): stepKey is AnyTickStepKey {
  return (
    (TICK_STEP_KEYS as readonly string[]).includes(stepKey) ||
    (GATEWAY_TICK_STEP_KEYS as readonly string[]).includes(stepKey)
  );
}

/** Step، متعلق به همان Workflow است که Work Item دارد؛ جز این، Tick آن را اجرا نمی‌کند. */
export function isStepKeyOfWorkflow(stepKey: string, workflowVersion: string | null | undefined): boolean {
  if (workflowVersion === WORKFLOW_VERSION) return (TICK_STEP_KEYS as readonly string[]).includes(stepKey);
  if (workflowVersion === GATEWAY_WORKFLOW_VERSION) {
    return (GATEWAY_TICK_STEP_KEYS as readonly string[]).includes(stepKey);
  }
  return false;
}

/**
 * آیا Tick مجاز است این Work Item را Claim کند؟ فقط tick_managed با
 * نسخهٔ پشتیبانی‌شده (مسیر رسمی یا Workflow آزمایشی Gateway).
 * manual، هرگز. workflow_version ناشناخته یا خالی، هرگز. پیش‌فرض
 * manual و NULL بودن نسخهٔ کارهای قدیمی، یعنی کارهای قدیمی ناخواسته
 * Tick نمی‌شوند.
 */
export function isTickManagedWorkItem(
  executionMode: string | null | undefined,
  workflowVersion: string | null | undefined,
): boolean {
  return executionMode === "tick_managed" && isSupportedWorkflowVersion(workflowVersion);
}

/** سقف Attempt هر Step. پردازش Publication، به‌خاطر بچ‌های کهنه، بیشتر است. */
export function stepMaxAttempts(stepKey: AnyTickStepKey): number {
  return stepKey === "process_publication" ? 10 : 5;
}

export type StepStatus = "queued" | "claimed" | "succeeded" | "failed" | "blocked";

/** Transitionهای مجاز Step در Tick. blocked، پایانی است و Tick آن را دوباره برنمی‌دارد. */
export function isValidStepTransition(from: StepStatus, to: StepStatus): boolean {
  const allowed: Record<StepStatus, StepStatus[]> = {
    queued: ["claimed", "blocked"],
    claimed: ["queued", "succeeded", "failed", "blocked"],
    succeeded: [],
    failed: [],
    blocked: [],
  };
  return allowed[from].includes(to);
}

export interface KillSwitches {
  factoryPaused: boolean;
  generationEnabled: boolean;
  dataPublishingEnabled: boolean;
  discoveryEnabled: boolean;
  codeAgentsEnabled: boolean;
}

/**
 * ارزیابی Kill Switchها با Fail-closed: نبودن سطر یا مقدار نامعتبر،
 * یعنی کارخانه paused و انتشار بسته. فقط مقدار دقیق 'true'، باز است.
 */
export function evaluateKillSwitches(settings: Record<string, string | undefined>): KillSwitches {
  const isTrue = (key: string): boolean => settings[key] === "true";
  const pausedRaw = settings["factory_paused"];
  return {
    factoryPaused: pausedRaw !== "false",
    generationEnabled: isTrue("generation_enabled"),
    dataPublishingEnabled: isTrue("data_publishing_enabled"),
    discoveryEnabled: isTrue("discovery_enabled"),
    codeAgentsEnabled: isTrue("code_agents_enabled"),
  };
}

export type AttemptFinishStatus = "started" | "succeeded" | "failed" | "timeout" | "outcome_unknown";
export type ReconciliationStatus = "not_required" | "pending" | "resolved" | "retry_allowed" | "needs_intervention";

/**
 * آیا Attempt، اجازهٔ Retry دارد؟ فقط شکست مشخص با reconciliation
 * not_required یا retry_allowed. نتیجهٔ نامشخص (timeout یا
 * outcome_unknown) با reconciliation pending، هرگز کورکورانه Retry
 * نمی‌شود.
 */
export function mayRetryAttempt(finishStatus: AttemptFinishStatus, reconciliation: ReconciliationStatus): boolean {
  if (finishStatus === "timeout" || finishStatus === "outcome_unknown") return false;
  if (reconciliation === "pending" || reconciliation === "needs_intervention") return false;
  return finishStatus === "failed" && (reconciliation === "not_required" || reconciliation === "retry_allowed");
}

/** بررسی خالص سقف بودجه، پیش از رزرو اتمیک در دیتابیس. */
export function canReserveBudget(limit: number, spent: number, amount: number): boolean {
  if (amount < 0) return false;
  return spent + amount <= limit;
}

/** هزینهٔ Stepهای قطعی، صفر است؛ هیچ هزینهٔ ساختگی برای مدل ثبت نمی‌شود. */
export function deterministicStepCost(stepKey: AnyTickStepKey): number {
  void stepKey;
  return 0;
}

/** آیا Step، به اجازهٔ انتشار نیاز دارد؟ فقط publish_version. */
export function stepNeedsPublishing(stepKey: AnyTickStepKey): boolean {
  return stepKey === "publish_version";
}
