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
 * این فایل، خالص است: بدون دسترسی دیتابیس، بدون Secret، بدون حافظهٔ
 * ضروری. تصمیم‌ها، همان رفتار مسیر Tick در R2 است که این‌جا یک‌جا
 * و قابل‌تست شده؛ مسیر Tick، همان تصمیم‌ها را از این‌جا می‌خواند.
 */
import { WorkItemSchema } from "../contracts";
import {
  WORKFLOW_VERSION,
  isStepKeyOfWorkflow,
  isSupportedWorkflowVersion,
  isValidWorkflowStepKey,
} from "./factory-tick";

/** نسخهٔ قرارداد Adapter؛ در گزارش R2-A و تست‌ها به همین نام ارجاع می‌شود. */
export const ADAPTER_CONTRACT_VERSION = "r2a-1";

/**
 * Workflow موکول‌شده: کار Shadow در آزمایشگاه می‌ماند. Tick، چنین
 * Work Itemی را نه Claim می‌کند و نه مسدود می‌کند؛ بی‌صدا رد می‌شود
 * تا وضعیت آزمایشگاهی دست نخورده بماند.
 */
export const DEFERRED_WORKFLOW_VERSIONS = ["source_shadow_v1"];

export type AdapterWorkItemDecision = "eligible" | "deferred" | "manual_or_legacy" | "unsupported_workflow";

export interface AdapterWorkItemInput {
  execution_mode: string | null | undefined;
  workflow_version: string | null | undefined;
}

/**
 * آیا Tick مجاز است این Work Item را Claim کند؟
 * ترتیب، عمدی است: اول deferred (بی‌صدا)، بعد manual یا قدیمی
 * (بی‌صدا، هرگز Claim نمی‌شود)، بعد نسخهٔ ناشناخته (مسدود با دلیل
 * مشخص)، و فقط در آخر eligible. پیش‌فرض manual و NULL بودن نسخهٔ
 * کارهای قدیمی، یعنی کارهای قدیمی ناخواسته Tick نمی‌شوند.
 */
export function adaptWorkItemForTick(item: AdapterWorkItemInput): AdapterWorkItemDecision {
  if (DEFERRED_WORKFLOW_VERSIONS.includes(item.workflow_version ?? "")) return "deferred";
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
