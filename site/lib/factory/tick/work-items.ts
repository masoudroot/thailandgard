/**
 * منطق خالص M4: ماشین حالت Work Item و اعتبارسنجی Approval.
 * این فایل هیچ دسترسی دیتابیسی و هیچ Secret ندارد و با node:test تست
 * می‌شود. بررسی‌های دیتابیسی (تعلق Artifact به Work Item، تطابق Hash،
 * وضعیت Publication) در مسیرهای API داخلی انجام می‌شوند و این‌جا فقط
 * قوانین خالص حالت و تصمیم آمده‌اند.
 */

export type WorkItemStatus =
  | "queued"
  | "drafting"
  | "awaiting_approval"
  | "approved"
  | "publishing"
  | "succeeded"
  | "blocked"
  | "cancelled";

export type ApprovalDecision = "approved" | "rejected";

/**
 * Transitionهای مجاز Work Item.
 * - queued → drafting: شروع کار روی Work Item.
 * - queued → awaiting_approval: ثبت Artifact اول، بدون گام drafting
 *   جداگانه؛ چون مسیری برای تغییر وضعیت به drafting در API نیست.
 * - drafting → awaiting_approval: ثبت Artifact و آماده شدن برای بازبینی.
 * - awaiting_approval → approved: تأیید انسانی روی همان Artifact و Hash.
 * - awaiting_approval → blocked: رد انسانی؛ انتشار نمی‌رود و دلیل رد ثبت
 *   می‌شود. از blocked می‌توان با Artifact جدید به drafting برگشت.
 * - approved → drafting: ثبت Artifact جدید پس از تأیید، Work Item را به
 *   awaiting_approval برمی‌گرداند و تأیید قبلی، برای Artifact جدید
 *   معتبر نیست، چون انتشار فقط Approval متصل به Artifact جاری را قبول
 *   می‌کند.
 * - approved → publishing: ساخت نسخه از Artifact تأییدشده.
 * - publishing → succeeded: وقتی Publication، verified شد.
 * - publishing → blocked: اگر انتشار، با خطای غیرقابل بازیابی متوقف شد.
 * - هر وضعیت فعال → cancelled: لغو دستی Work Item.
 * - succeeded و cancelled، پایانی‌اند و از آن‌ها خروجی نیست.
 */
export function isValidWorkItemTransition(from: WorkItemStatus, to: WorkItemStatus): boolean {
  const allowed: Record<WorkItemStatus, WorkItemStatus[]> = {
    queued: ["drafting", "awaiting_approval", "blocked", "cancelled"],
    drafting: ["awaiting_approval", "blocked", "cancelled"],
    awaiting_approval: ["approved", "blocked", "cancelled"],
    approved: ["awaiting_approval", "publishing", "blocked", "cancelled"],
    publishing: ["succeeded", "blocked", "cancelled"],
    succeeded: [],
    blocked: ["drafting", "cancelled"],
    cancelled: [],
  };
  return allowed[from].includes(to);
}

/** وضعیت‌هایی که در آن‌ها، ثبت Artifact جدید مجاز است. */
export function canSubmitArtifact(status: WorkItemStatus): boolean {
  return status === "queued" || status === "drafting" || status === "blocked" || status === "approved";
}

/**
 * وضعیت پس از ثبت Artifact جدید: همیشه awaiting_approval. حتی اگر Work
 * Item قبلاً approved بود، Artifact جدید، تأیید قبلی را بی‌اثر می‌کند،
 * چون انتشار فقط Approval متصل به Artifact جاری را قبول می‌کند. این
 * تابع، فقط وضعیت جدید را می‌گوید؛ بررسی تطابق Approval با Artifact
 * جاری، در مسیر انتشار انجام می‌شود.
 */
export function statusAfterArtifactSubmitted(): WorkItemStatus {
  return "awaiting_approval";
}

/** تصمیم Approval، فقط approved یا rejected است. */
export function isValidApprovalDecision(value: unknown): value is ApprovalDecision {
  return value === "approved" || value === "rejected";
}

/** وضعیت Work Item پس از تصمیم Approval. */
export function statusAfterApproval(decision: ApprovalDecision): WorkItemStatus {
  return decision === "approved" ? "approved" : "blocked";
}

export interface ApprovalMatchInput {
  workItemStatus: WorkItemStatus;
  workItemArtifactId: string | null;
  approvalArtifactId: string;
  approvalArtifactHash: string;
  artifactHash: string;
  approvalDecision: ApprovalDecision;
}

/**
 * بررسی خالص تطابق Approval برای انتشار:
 * - Work Item باید approved باشد؛
 * - Approval باید روی همان Artifact جاری Work Item باشد؛
 * - Hash ثبت‌شده در Approval باید با Hash خود Artifact بخواند؛
 * - تصمیم باید approved باشد.
 * رد شدن هر شرط، یعنی انتشار مجاز نیست. این تابع، جایگزین خواندن
 * دیتابیس نیست؛ مسیر انتشار، سطرهای واقعی را می‌خواند و بعد این تابع
 * را روی آن‌ها صدا می‌کند.
 */
export function isApprovalValidForPublish(input: ApprovalMatchInput): boolean {
  if (input.workItemStatus !== "approved") return false;
  if (input.workItemArtifactId === null) return false;
  if (input.approvalArtifactId !== input.workItemArtifactId) return false;
  if (input.approvalArtifactHash !== input.artifactHash) return false;
  if (input.approvalDecision !== "approved") return false;
  return true;
}

/** کلید Idempotency انتشار از مسیر Work Item، از روی work_key ساخته می‌شود. */
export function workItemPublishIdempotencyKey(workKey: string): string {
  return `mvp01-m4-publish-${workKey}`;
}

/** work_key باید رشته‌ای با طول معقول باشد؛ همان قانون کلیدهای Idempotency. */
export function isValidWorkKey(key: unknown): key is string {
  return typeof key === "string" && key.length >= 8 && key.length <= 128;
}
