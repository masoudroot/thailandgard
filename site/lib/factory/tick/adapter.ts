/**
 * قرارداد واحد Adapter در R2-A: اتصال Work Item اصلی به Runner
 * اثبات‌شدهٔ MVP-01، بدون موتور موازی و بدون موتور عمومی DAG.
 *
 * نقش Adapter، فقط «اجازهٔ ورود» است: Work Item اصلی را می‌خواند،
 * گیت‌های R2 را روی آن اعمال می‌کند و می‌گوید Tick مجاز است آن را
 * Claim کند یا نه. وضعیت و تاریخچهٔ اصلی را نمی‌نویسد و Step جدید
 * نمی‌سازد؛ ساخت Step، همان بوت‌استرپ مسیر Tick است که با همین
 * قرارداد، فقط tick_managed با نسخهٔ پشتیبانی‌شده را Step می‌دهد.
 *
 * DAG اصلی، فقط envelope و metadata اعتبارسنجی باقی می‌ماند:
 * اگر یک Work Item، envelope معتبر factory-v2 همراهش باشد، Adapter
 * آن را با WorkItemSchema اصلی اعتبارسنجی می‌کند و envelope نامعتبر
 * را fail-closed رد می‌کند. نبودن envelope، رد نیست؛ سطر آزمایشگاهی
 * به‌تنهایی می‌ایستد. موتور DAG، نه ساخته می‌شود و نه اجرا می‌شود.
 *
 * قاعدهٔ Scope در R2A.1: هر Work Item که پیش از شروع مأموریت R2A.1
 * ساخته شده، خارج از Scope است و Tick آن را نه Claim می‌کند و نه
 * مسدود می‌کند؛ بی‌صدا رد می‌شود. این حکم، بعد از deferred و پیش
 * از manual می‌نشیند تا کار تاریخی، حتی با نسخهٔ ناشناخته، به‌جای
 * مسدود شدن، فقط رد شود. نبودن یا خراب بودن created_at هم،
 * fail-closed، خارج از Scope است.
 *
 * این فایل، خالص است: بدون دسترسی دیتابیس، بدون Secret، بدون حافظهٔ
 * ضروری. تصمیم‌ها، همان رفتار مسیر Tick در R2 است که این‌جا یک‌جا
 * و قابل‌تست شده؛ مسیر Tick، همان تصمیم‌ها را از این‌جا می‌خواند.
 *
 * تغییر R3C: Workflow آزمایشی Gateway هم، از مسیر همین توابع
 * پشتیبانی‌شدهٔ factory-tick، eligible شد؛ قانون Scope مربوط به
 * cutoff و رفتار مسیر رسمی و Workflow سایه، دست نخورده‌اند.
 */
import { WorkItemSchema } from "../contracts";
import {
  WORKFLOW_VERSION,
  isStepKeyOfWorkflow,
  isSupportedWorkflowVersion,
  isValidWorkflowStepKey,
} from "./factory-tick";

/** نسخهٔ قرارداد Adapter؛ در گزارش R2-A و تست‌ها به همین نام ارجاع می‌شود. R3C آن را به r3c-1 برد. */
export const ADAPTER_CONTRACT_VERSION = "r3c-1";

/**
 * نقطهٔ برش Scope در R2A.1: شروع مأموریت، ۱۹:۱۴ تهران در ۸ آبان ۱۴۰۵.
 * Work Item با created_at پیش از این لحظه، خارج از Scope است.
 */
export const R2A1_SCOPE_CUTOFF = "2026-10-30T15:44:00Z";

/**
 * Workflow موکول‌شده: کار Shadow در آزمایشگاه می‌ماند. Tick، چنین
 * Work Itemی را نه Claim می‌کند و نه مسدود می‌کند؛ بی‌صدا رد می‌شود
 * تا وضعیت آزمایشگاهی دست نخورده بماند.
 */
export const DEFERRED_WORKFLOW_VERSIONS = ["source_shadow_v1"];

export type AdapterWorkItemDecision =
  | "eligible"
  | "deferred"
  | "out_of_scope"
  | "manual_or_legacy"
  | "unsupported_workflow";

export interface AdapterWorkItemInput {
  execution_mode: string | null | undefined;
  workflow_version: string | null | undefined;
  created_at: string | null | undefined;
}

/**
 * آیا Tick مجاز است این Work Item را Claim کند؟
 * ترتیب، عمدی است: اول deferred (بی‌صدا)، بعد out_of_scope
 * (بی‌صدا، کار پیش از برش R2A.1)، بعد manual یا قدیمی (بی‌صدا،
 * هرگز Claim نمی‌شود)، بعد نسخهٔ ناشناخته (مسدود با دلیل مشخص)،
 * و فقط در آخر eligible. پیش‌فرض manual و NULL بودن نسخهٔ کارهای
 * قدیمی، یعنی کارهای قدیمی ناخواسته Tick نمی‌شوند.
 */
export function adaptWorkItemForTick(item: AdapterWorkItemInput): AdapterWorkItemDecision {
  if (DEFERRED_WORKFLOW_VERSIONS.includes(item.workflow_version ?? "")) return "deferred";
  const createdMs = item.created_at ? new Date(item.created_at).getTime() : Number.NaN;
  if (Number.isNaN(createdMs) || createdMs < new Date(R2A1_SCOPE_CUTOFF).getTime()) {
    return "out_of_scope";
  }
  if (item.execution_mode !== "tick_managed") return "manual_or_legacy";
  if (!isSupportedWorkflowVersion(item.workflow_version)) return "unsupported_workflow";
  return "eligible";
}

export type AdapterStepDecision = "eligible" | "unknown_step" | "step_not_in_workflow";

/**
 * آیا Tick مجاز است این Step را اجرا کند؟ Step ناشناخته، هرگز.
 * Step معتبر ولی متعلق به Workflow دیگر هم، هرگز؛ با همان رفتار
 * Step ناشناخته برخورد می‌شود: مسدود، بدون اجرا با حدس.
 */
export function adaptStepForTick(
  stepKey: string,
  workflowVersion: string | null | undefined,
): AdapterStepDecision {
  if (!isValidWorkflowStepKey(stepKey)) return "unknown_step";
  if (!isStepKeyOfWorkflow(stepKey, workflowVersion)) return "step_not_in_workflow";
  return "eligible";
}

/**
 * اعتبارسنجی envelope اصلی factory-v2، وقتی همراه Work Item آمده
 * باشد. نبودن envelope، معتبر است؛ envelope نامعتبر، fail-closed
 * رد می‌شود تا دادهٔ اصلیِ خراب، وارد Runner نشود.
 */
export function adaptMainEnvelope(envelope: unknown): { valid: boolean } {
  if (envelope === null || envelope === undefined) return { valid: true };
  return { valid: WorkItemSchema.safeParse(envelope).success };
}

/** نسخهٔ Workflow مسیر رسمی که Adapter می‌پذیرد؛ همان guide_content_v1. */
export { WORKFLOW_VERSION };
