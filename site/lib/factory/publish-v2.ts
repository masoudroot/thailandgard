/**
 * M5 — سرویس انتشار v2 برای Work Itemهای UpdateContent.
 *
 * جریان (بدون Endpoint تازه و بدون UI تازه):
 *   تأیید انسانی → صف UpdateContent (قدم‌های Tick) → اعتبارسنجی
 *   Approval و سقف روزانه → به‌روزرسانی از مسیر سرویس/Repository
 *   (همین سرویس + Function اتمیک publish_v2_content_atomic) → ثبت
 *   superseded_by روی نسخهٔ پیشین → ثبت رویداد Outbox → Dispatch
 *   موجود (process-outbox) که revalidateTag را اجرا می‌کند.
 *
 * ترتیب، عمداً همان ترتیب اثبات‌شدهٔ v1 است: Pointer اول در تراکنش
 * اتمیک عوض می‌شود و revalidateTag بعد، در Dispatch، اجرا می‌شود؛
 * ابطالِ پیش از جابه‌جایی Pointer، محتوای کهنه را دوباره کش می‌کرد.
 *
 * ویژگی‌های ایمنی:
 * - نسخه‌ها Immutable می‌مانند؛ تنها تغییر مجاز روی یک نسخه،
 *   superseded_by است (Trigger نسخهٔ دوم).
 * - Draft (Artifact و نسخهٔ منتشرنشده) هرگز حذف نمی‌شود؛ این مسیر
 *   هیچ DELETEای صادر نمی‌کند و Trigger هم DELETE روی نسخه‌ها را رد
 *   می‌کند.
 * - خطا در Function اتمیک، کل تراکنش را برمی‌گرداند؛ Pointer قبلی،
 *   زنجیره و Outbox دست‌نخورده می‌مانند.
 * - Timeout یا خطای پس از ارسال، با همان کلید Idempotency یک‌بار
 *   Replay می‌شود (تکرار، انتشار تکراری نمی‌سازد)؛ اگر Replay هم
 *   ناموفق بود، نتیجه outcome_unknown است و هیچ فراخوان دیگری با
 *   کلید تازه انجام نمی‌شود.
 * - سقف روزانه: حداکثر ۷۰ انتشار (kind=publish) در روز (UTC). Replay
 *   یک انتشار موجود، چیزی تازه منتشر نمی‌کند و از سقف معاف است.
 *   Rollback هم از سقف معاف است (بازیابی است، نه انتشار تازه).
 *   از Migration سقف داخل RPC هم همان سقف، داخل خود Function اتمیک
 *   اعمال می‌شود؛ پس فراخوان مستقیم RPC هم نمی‌تواند سقف را دور بزند.
 *   سقف این‌جا، به‌عنوان دفاع در عمق می‌ماند و دست نمی‌خورد.
 * - Kill Switch (SECURITY-CAP): انتشار تازه، فقط وقتی انجام می‌شود که
 *   factory_paused دقیقاً 'false' و data_publishing_enabled دقیقاً
 *   'true' باشد (Fail-closed، همان معنای evaluateKillSwitches در
 *   مسیر Tick). این گیت، شکاف مسیر انتشار دستی داخلی را می‌بندد: آن
 *   مسیر، تنظیمات کارخانه را نمی‌خواند و پیش از این گیت، با وجود
 *   بسته بودن اضطراری هم منتشر می‌کرد. Replay از گیت معاف است (چیز
 *   تازه‌ای منتشر نمی‌کند) و Rollback هم گیت ندارد (بازیابی است، نه
 *   انتشار تازه؛ بستن اضطراری نباید راه برگشت را ببندد).
 * - Timeout انتشار: ۶۰ ثانیه.
 *
 * این فایل هیچ consoleای ندارد و هیچ Secretای نمی‌خواند؛ cfg (شامل
 * کلید سرویس) فقط از فراخوانندهٔ سروری می‌آید.
 */

import { evaluateKillSwitches } from "./tick/factory-tick";
import { postgrestGet, postgrestRpc, type DbCfg } from "./tick/internal-api";

export const DAILY_PUBLISH_LIMIT = 70;
export const PUBLISH_TIMEOUT_MS = 60_000;

export function publishV2IdempotencyKey(workKey: string): string {
  if (!workKey) throw new Error("work key is required");
  return `publish-v2-${workKey}`;
}

export function publishV2RollbackIdempotencyKey(workKey: string): string {
  if (!workKey) throw new Error("work key is required");
  return `publish-v2-rollback-${workKey}`;
}

export function isDailyPublishLimitReached(count: number): boolean {
  return count >= DAILY_PUBLISH_LIMIT;
}

export interface PublishPayloadLike {
  sections: Array<{ paragraphs: string[] }>;
}

/** همان منطق Tick: نشان نسخه، پاراگراف اولِ بخش اول است. */
export function firstParagraphOfPayload(payload: PublishPayloadLike): string {
  return payload.sections[0]?.paragraphs[0] ?? "";
}

export interface PublishV2ValidationInput {
  workItemStatus: string;
  workItemArtifactId: string | null;
  approvalArtifactId: string;
  approvalArtifactHash: string;
  artifactHash: string;
  approvalDecision: string;
  contentType: string;
  schemaVersion: string;
}

/** اعتبارسنجی خالص پیش‌نیازهای انتشار؛ خطا یا null.
 * وضعیت قابل انتشار: approved (پیش از ساخت نسخه) یا publishing (پس از
 * قدم create_version که وضعیت را publishing کرده است)؛ در هر دو حالت،
 * Approval باید روی Artifact جاری و با Hash برابر باشد. */
export function validatePublishV2Input(input: PublishV2ValidationInput): string | null {
  if (input.workItemStatus !== "approved" && input.workItemStatus !== "publishing") {
    return "work item is not approved or publishing";
  }
  if (input.workItemArtifactId === null) return "work item has no artifact";
  if (input.approvalArtifactId !== input.workItemArtifactId) {
    return "approval artifact does not match the work item artifact";
  }
  if (input.approvalArtifactHash !== input.artifactHash) {
    return "approval artifact hash does not match the artifact";
  }
  if (input.approvalDecision !== "approved") return "approval decision is not approved";
  if (input.contentType !== "guide") return "content document is not a guide";
  if (input.schemaVersion !== "publish_payload_v1") {
    return "version schema is not publish_payload_v1";
  }
  return null;
}

export interface SupersededByTransitionInput {
  kind: "publish" | "rollback";
  previousVersionId: string | null;
  newVersionId: string;
}

export interface SupersededByTransition {
  pointerVersionId: string;
  previousSupersededBy: string | null;
  newSupersededBy: string | null;
}

/**
 * آینهٔ خالصِ قواعد زنجیره در Function اتمیک (مرجع نهایی، خود Function
 * است؛ این تابع فقط برای تست و مستندسازی رفتار است):
 * - انتشار روبه‌جلو: نسخهٔ پیشین به نسخهٔ تازه وصل می‌شود و نسخهٔ تازه،
 *   superseded_by تهی می‌گیرد (جاری است).
 * - Rollback: فقط superseded_by نسخهٔ هدف NULL می‌شود و Pointer به آن
 *   برمی‌گردد.
 */
export function supersededByTransition(input: SupersededByTransitionInput): SupersededByTransition {
  if (input.kind === "rollback") {
    return { pointerVersionId: input.newVersionId, previousSupersededBy: null, newSupersededBy: null };
  }
  return {
    pointerVersionId: input.newVersionId,
    previousSupersededBy: input.previousVersionId ? input.newVersionId : null,
    newSupersededBy: null,
  };
}

export class PublishV2Error extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

function utcMidnightIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}

interface RpcResult {
  publication_id: string;
  outbox_id: string | null;
  previous_version_id: string | null;
  version_id: string;
  status: string;
  replayed: boolean;
}

async function callPublishRpc(
  cfg: DbCfg,
  body: Record<string, unknown>,
): Promise<RpcResult> {
  const result = (await postgrestRpc(
    cfg,
    "publish_v2_content_atomic",
    body,
    AbortSignal.timeout(PUBLISH_TIMEOUT_MS),
  )) as RpcResult;
  if (!result || !result.publication_id) throw new Error("publish_v2 rpc returned no publication");
  return result;
}

export interface PublishUpdateContentRequest {
  workItemId: string;
  workKey: string;
  contentId: string;
  versionId: string;
  approvalId: string;
  expectedMarker: string;
  previousUniqueText: string | null;
  previousVersionId: string | null;
  validation: PublishV2ValidationInput;
}

export interface PublishUpdateContentResult {
  publicationId: string;
  outboxId: string | null;
  previousVersionId: string | null;
  versionId: string;
  replayed: boolean;
  dailyCount: number;
  previousPreserved: boolean | null;
}

/**
 * انتشار v2 یک محتوای UpdateContent. ترتیب: اعتبارسنجی خالص → بررسی
 * Replay موجود → گیت Kill Switch (فقط انتشار تازه) → سقف روزانه →
 * فراخوان اتمیک (با Timeout ۶۰ ثانیه) → Replay در صورت خطا → بررسی
 * حفظ نسخهٔ پیشین.
 */
export async function publishUpdateContent(
  cfg: DbCfg,
  req: PublishUpdateContentRequest,
): Promise<PublishUpdateContentResult> {
  const validationError = validatePublishV2Input(req.validation);
  if (validationError) throw new PublishV2Error("invalid_prerequisites", validationError);
  const idempotencyKey = publishV2IdempotencyKey(req.workKey);

  const existing = (await postgrestGet(
    cfg,
    `factory_publications?idempotency_key=eq.${encodeURIComponent(idempotencyKey)}&select=id`,
  )) as unknown[];
  const isReplay = existing.length > 0;

  let dailyCount = 0;
  if (!isReplay) {
    // گیت Kill Switch، فقط برای انتشار تازه (نه Replay): مسیر انتشار
    // دستی داخلی، تنظیمات کارخانه را نمی‌خواند؛ این گیت، همان‌جا جلوی
    // انتشار در حالت بستهٔ اضطراری را می‌گیرد. Fail-closed: نبودن سطر
    // یا مقدار نامعتبر، یعنی بسته.
    const settingsRows = (await postgrestGet(
      cfg,
      "factory_settings?select=key,value",
    )) as { key: string; value: string }[];
    const settings: Record<string, string> = {};
    for (const row of settingsRows) settings[row.key] = row.value;
    const switches = evaluateKillSwitches(settings);
    if (switches.factoryPaused || !switches.dataPublishingEnabled) {
      throw new PublishV2Error("publishing_disabled", "publishing is disabled by kill switch");
    }
    const today = (await postgrestGet(
      cfg,
      `factory_publications?publication_kind=eq.publish&requested_at=gte.${encodeURIComponent(utcMidnightIso())}&select=id&limit=200`,
    )) as unknown[];
    dailyCount = today.length;
    if (isDailyPublishLimitReached(dailyCount)) {
      throw new PublishV2Error(
        "daily_publish_limit",
        `daily publish limit reached (${dailyCount}/${DAILY_PUBLISH_LIMIT})`,
      );
    }
  }

  const body: Record<string, unknown> = {
    p_content_id: req.contentId,
    p_version_id: req.versionId,
    p_idempotency_key: idempotencyKey,
    p_expected_marker: req.expectedMarker,
    p_previous_unique_text: req.previousUniqueText,
    p_publication_kind: "publish",
    p_rollback_of_publication_id: null,
    p_reason: `approved tick publish-v2 for work item ${req.workKey}`,
    p_work_item_id: req.workItemId,
    p_approval_id: req.approvalId,
  };

  let result: RpcResult;
  try {
    result = await callPublishRpc(cfg, body);
  } catch (err) {
    // خطا پس از ارسال، ممکن است Commit شده باشد یا نه؛ با همان کلید،
    // یک‌بار Replay می‌شود (تکراری نمی‌سازد). اگر Replay هم ناموفق بود،
    // نتیجه Unknown است و فراخوان دیگری با کلید تازه انجام نمی‌شود.
    try {
      result = await callPublishRpc(cfg, body);
    } catch {
      throw new PublishV2Error(
        "publish_outcome_unknown",
        err instanceof Error ? err.message : "publish outcome unknown after retry",
      );
    }
  }

  let previousPreserved: boolean | null = req.previousVersionId === null ? true : null;
  if (req.previousVersionId !== null) {
    try {
      const prev = (await postgrestGet(
        cfg,
        `content_versions?id=eq.${encodeURIComponent(req.previousVersionId)}&select=id`,
      )) as unknown[];
      previousPreserved = prev.length > 0;
    } catch {
      previousPreserved = null;
    }
  }

  return {
    publicationId: result.publication_id,
    outboxId: result.outbox_id,
    previousVersionId: result.previous_version_id,
    versionId: result.version_id,
    replayed: result.replayed,
    dailyCount,
    previousPreserved,
  };
}

export interface RollbackUpdateContentRequest {
  workItemId: string;
  workKey: string;
  contentId: string;
  targetVersionId: string;
  rollbackOfPublicationId: string;
  reason: string;
  approvalId: string;
  expectedMarker: string;
  previousUniqueText: string | null;
}

/**
 * Rollback v2: فقط با برگرداندن superseded_by نسخهٔ هدف به NULL
 * (به‌علاوهٔ برگرداندن Pointer) در همان تراکنش اتمیک. از سقف روزانه
 * معاف است، چون بازیابی است نه انتشار تازه.
 */
export async function rollbackUpdateContent(
  cfg: DbCfg,
  req: RollbackUpdateContentRequest,
): Promise<PublishUpdateContentResult> {
  const body: Record<string, unknown> = {
    p_content_id: req.contentId,
    p_version_id: req.targetVersionId,
    p_idempotency_key: publishV2RollbackIdempotencyKey(req.workKey),
    p_expected_marker: req.expectedMarker,
    p_previous_unique_text: req.previousUniqueText,
    p_publication_kind: "rollback",
    p_rollback_of_publication_id: req.rollbackOfPublicationId,
    p_reason: req.reason,
    p_work_item_id: req.workItemId,
    p_approval_id: req.approvalId,
  };
  let result: RpcResult;
  try {
    result = await callPublishRpc(cfg, body);
  } catch {
    try {
      result = await callPublishRpc(cfg, body);
    } catch (err) {
      throw new PublishV2Error(
        "publish_outcome_unknown",
        err instanceof Error ? err.message : "rollback outcome unknown after retry",
      );
    }
  }
  return {
    publicationId: result.publication_id,
    outboxId: result.outbox_id,
    previousVersionId: result.previous_version_id,
    versionId: result.version_id,
    replayed: result.replayed,
    dailyCount: 0,
    previousPreserved: null,
  };
}
