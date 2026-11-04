/**
 * Runtime محتوای مسیر Tick (THG-TEAM-ARCHITECTURE-01 فاز ۲، گام ۳).
 * این فایل، همان منطق قدم‌های محتوایی مسیر ‎/api/factory/tick‎ است که
 * بدون هیچ تغییر رفتاری از مسیر بیرون کشیده شده است: همان کلیدهای
 * قدم، همان ترتیب، همان گیت‌ها، همان کدهای خطا، همان نوشته‌های
 * تأیید و Policy (از جمله آینهٔ Policy گام ۲ در قدم auto_approve)،
 * همان تعامل‌های Outbox و همان شکل سطرهای Run و Step.
 * مسیر Tick فقط نمایندگی می‌کند: ماشینری عمومی Tick (احراز هویت،
 * Kill Switch، ساخت Run، بوت‌استرپ زنجیره‌ها، انتخاب کاندید، Claim،
 * ساخت Attempt، قلاب‌های آزمایشی و دمِ Step) در مسیر مانده است و
 * این Handler فقط اجرای یک قدم محتواییِ Claimشده را بر عهده دارد.
 * قدم‌های آزمایشی Gateway (‎generate_draft_mock‎) هم جزو همین زنجیرهٔ
 * if/else هستند و با همان زنجیره منتقل شده‌اند؛ ماشینری Gateway
 * خودش (‎lib/factory/tick/gateway-*‎ و ‎lib/factory/gateway/*‎) سر جایش
 * مانده است.
 * قرارداد بازگشت: قدم یا با یک پاسخ زودهنگام برمی‌گردد (همان پاسخی
 * که مسیر پیش از استخراج برمی‌گرداند) یا با ‎completed‎ که مسیر، دمِ
 * Step را با آن ادامه می‌دهد. خود Handler هرگز پاسخ HTTP نمی‌سازد.
 * هر مسیر respond، پیش از برگشت، Run را خاتمه می‌دهد (با finishRun
 * یا، در مسیرهای Crash، با وصلهٔ مستقیم failed) و هر جا قدم بسته
 * می‌شود، finishStep را هم پیش از آن صدا می‌زند؛ دمِ مسیر فقط
 * برای completed می‌چرخد. مسیر بازیابی Gateway هم همین‌طور است:
 * recoverGatewayArtifact، عملیات را پیش از برگشت، با گذار
 * نگهبانی‌شده به settled می‌رساند، پس دمِ مسیر برای آن لازم نیست.
 * این Handler فقط از مسیر Tick صدا زده می‌شود (route-private):
 * requestOrigin را مسیر از سربرگ درخواست خودش می‌سازد و
 * internalPost، همان origin را برای فراخوان‌های داخلی rollback و
 * complete می‌زند؛ فراخوان مستقیم از جای دیگر پشتیبانی نمی‌شود.
 * گیت generation فقط در مسیر بررسی می‌شود؛ Handler گیت‌های
 * await_human_approval و publish را دوباره می‌سنجد ولی فرضش این
 * است که مسیر، گیت generation را پیش از Claim گذرانده است.
 * وصله‌های مستقیم run با run_status برابر failed در مسیرهای
 * Crash، استثنای عمدی‌اند: finishRun مسیر فقط completed می‌نویسد
 * و برای Crash، وصلهٔ failed لازم است؛ پس آن وصله‌ها از بستار
 * finishRun رد نمی‌شوند.
 */

import { z } from "zod";
import {
  postgrestGet,
  postgrestRpc,
  postgrestWrite,
  type ApprovalRow,
  type ArtifactRow,
  type DbCfg,
  type DocumentRow,
  type PublicationRow,
  type VersionRow,
  type WorkItemRow,
} from "@/lib/factory/tick/internal-api";
import { computeContentHash, validatePublishPayload, type PublishPayload } from "@/lib/content-versioning";
import {
  canSubmitArtifact,
  isApprovalValidForPublish,
  workItemPublishIdempotencyKey,
} from "@/lib/factory/tick/work-items";
import { publishUpdateContent } from "@/lib/factory/publish-v2";
import { processOutboxBatch } from "@/lib/factory/tick/process-outbox-batch";
import { AUTO_WORKFLOW_VERSION, type AnyTickStepKey, type KillSwitches } from "@/lib/factory/tick/factory-tick";
import { PostgrestBudgetLedger } from "@/lib/factory/gateway/ledger";
import { CURRENT_BUDGET_POLICY, modelsForCapability } from "@/lib/factory/gateway/registry";
import { isSimulatedCrash, throwIfCrashAfter } from "@/lib/factory/gateway/crash-test";
import { getLatestOperation } from "@/lib/factory/gateway/operations";
import {
  GatewayOperationError,
  gatewayLogicalOperationId,
  openGatewayOperation,
  runGatewayCallForOperation,
} from "@/lib/factory/tick/gateway-operation-run";
import {
  AUTO_APPROVAL_REASON,
  SYSTEM_APPROVER_ID,
  buildRewriteUserMessage,
  sitemapContainsSlug,
} from "@/lib/factory/tick/autonomous";
import { verifyPageWithRetries } from "@/lib/factory/tick/publish-outbox";
import { recoverGatewayArtifact } from "@/lib/factory/tick/gateway-artifact-recovery";

const DEMO_DRAFT_SCHEMA = z.object({ draft_paragraph: z.string().min(1) });

/**
 * دستور سیستمی قدم draft واقعی (THG-RB-01): مدل، فقط JSON معتبر
 * برمی‌گرداند و هیچ قیمت یا زمان قطعی نمی‌سازد؛ چون Draft، پیش
 * از هر انتشار، تأیید انسانی می‌گیرد، کیفیت محتوا همان‌جا قضاوت
 * می‌شود نه با اعتبارسنجی ماشینی.
 */
const DRAFT_SYSTEM_PROMPT = [
  "تو نویسندهٔ راهنمای سفر سایت تایلندگردی. فقط یک JSON معتبر برگردان؛ هیچ متن اضافه، هیچ توضیح، هیچ بلاک کد.",
  "ساختار دقیق همان publish_payload_v1 است: schema_version برابر publish_payload_v1، slug همان slug داده‌شده، title همان عنوان داده‌شده، h1 برابر title، published_at برابر null، excerpt یک یا دو جمله، category برابر راهنمای سفر، reading_minutes عدد صحیح مثبت، updated_fa ماه و سال شمسی امروز، sections با position از ۱ و صعودی و هر بخش دقیقاً این فیلدها: position و heading (عنوان بخش) و paragraphs (آرایه‌ای از ۲ تا ۳ پاراگراف کوتاه)، faqs با position از ۱ و صعودی و ۳ پرسش و هر پرسش دقیقاً این فیلدها: position و question و answer، seo با title و description و canonical_path برابر /guide/<slug>.",
  "قوانین محتوا: هیچ قیمت، نرخ ارز، ساعت پرواز یا برنامهٔ زمانی قطعی نیاور؛ هیچ واقعیتی که از آن مطمئن نیستی نساز و به‌جای آن، راهنمایی کلی و قابل‌اتکا بده؛ راهنما فشرده باشد: دقیقاً ۴ بخش و ۳ پرسش؛ فارسی روان و ساده، بدون لحن تبلیغاتی و بدون ادعای فروش.",
].join(" ");

/**
 * پرامپت بازنویسی خودمختار (THG-AUTO-01): برخلاف پرامپت تازه،
 * بار جاری راهنما به‌عنوان ورودی داده می‌شود و مدل، همان راهنما
 * را کامل می‌کند؛ نه این‌که راهنمای دیگری بسازد. شمار بخش‌ها و
 * پرسش‌ها کمتر از بار جاری نمی‌شود؛ فقط جای خالی پر می‌شود و
 * کهنگی درست می‌شود. slug و عنوان و canonical_path همان می‌مانند.
 */
const REWRITE_SYSTEM_PROMPT = [
  "تو ویراستار راهنمای سفر سایت تایلندگردی. فقط یک JSON معتبر برگردان؛ هیچ متن اضافه، هیچ توضیح، هیچ بلاک کد.",
  "ساختار دقیق همان publish_payload_v1 است: schema_version برابر publish_payload_v1، slug همان slug داده‌شده، title همان عنوان داده‌شده، h1 برابر title، published_at برابر null، excerpt یک یا دو جمله، category برابر راهنمای سفر، reading_minutes عدد صحیح مثبت، updated_fa ماه و سال شمسی امروز، sections با position از ۱ و صعودی و هر بخش دقیقاً این فیلدها: position و heading (عنوان بخش) و paragraphs (آرایه‌ای از ۲ تا ۳ پاراگراف کوتاه)، faqs با position از ۱ و صعودی و هر پرسش دقیقاً این فیلدها: position و question و answer، seo با title و description و canonical_path برابر /guide/<slug>.",
  "قوانین بازنویسی: کهنگی، ناقصی و ناهماهنگی بار جاری را درست کن؛ بخش‌های کم‌مایه را کامل و پرسش‌های جاافتاده را اضافه کن؛ شمار بخش‌ها و پرسش‌ها را کمتر از بار جاری نکن؛ هیچ قیمت، نرخ ارز، ساعت پرواز یا برنامهٔ زمانی قطعی نیاور؛ هیچ واقعیتی که از آن مطمئن نیستی نساز؛ فارسی روان و ساده، بدون لحن تبلیغاتی و بدون ادعای فروش.",
].join(" ");

/**
 * اسکیمای خروجی قدم draft واقعی: همان اعتبارسنجی publish_payload_v1
 * که validate_artifact هم استفاده می‌کند؛ اسکیمای موازی ساخته
 * نمی‌شود تا یک منبع حقیقت بماند. خروجی مدل، پیش از ساخت
 * Artifact، همین‌جا اعتبارسنجی می‌شود.
 */
const PUBLISH_PAYLOAD_SCHEMA = {
  safeParse: (data: unknown) => {
    try {
      validatePublishPayload(data);
      return { success: true as const, data };
    } catch (error) {
      return { success: false as const, error };
    }
  },
};

/** خطای Crash پس از Commit انتشار: Step، claimed و Attempt، started می‌ماند تا Tick بعدی پس از انقضای Lease بازیابی کند. */
class CrashAfterPublicationError extends Error {}

function firstParagraph(payload: PublishPayload): string {
  return payload.sections[0]?.paragraphs[0] ?? "";
}

/**
 * ساخت بار Artifact از بار منتشرشدهٔ راهنما با جای‌گذاری یک
 * پاراگراف و محاسبهٔ Hash واقعی آن. منطق خالصِ ساخت بار است که
 * هم مسیر عادی و هم بازیابی R3C-RECOVERY از آن استفاده می‌کنند؛
 * هیچ منطق موازی برای بازسازی بار وجود ندارد.
 */
async function buildGuideEditPayload(
  cfg: DbCfg,
  workItem: WorkItemRow,
  paragraph: string,
): Promise<{ payload: PublishPayload; hash: string }> {
  const docs = (await postgrestGet(
    cfg,
    `content_documents?id=eq.${encodeURIComponent(workItem.content_id)}&select=*`,
  )) as DocumentRow[];
  const publishedId = docs[0]?.published_version_id;
  const versions = (await postgrestGet(
    cfg,
    `content_versions?id=eq.${encodeURIComponent(publishedId ?? "")}&select=*`,
  )) as VersionRow[];
  if (versions.length === 0) throw new Error("published version not found");
  validatePublishPayload(versions[0].payload);
  const payload = JSON.parse(JSON.stringify(versions[0].payload)) as PublishPayload;
  payload.sections[0].paragraphs[0] = paragraph;
  validatePublishPayload(payload);
  const hash = computeContentHash(payload);
  return { payload, hash };
}

/**
 * ساخت Artifact از بار منتشرشدهٔ راهنما با جای‌گذاری یک پاراگراف.
 * همان منطق قدم create_artifact است که R3C آن را یک‌جا کرد تا قدم
 * generate_draft_mock هم، با همان اعتبارسنجی و همان Hash واقعی،
 * Artifact بسازد؛ نه منطق موازی و نه Artifact ساختگی. نوع Artifact،
 * قدم را مشخص می‌کند: guide_edit برای مسیر رسمی، content_draft_demo
 * برای پیش‌نویس آزمایشی Gateway.
 */
async function createGuideEditArtifact(
  cfg: DbCfg,
  workItem: WorkItemRow,
  artifactType: string,
  paragraph: string,
): Promise<string> {
  const { payload, hash } = await buildGuideEditPayload(cfg, workItem, paragraph);
  const inserted = (await postgrestWrite(cfg, "POST", "factory_artifacts", {
    work_item_id: workItem.id,
    artifact_type: artifactType,
    schema_version: "publish_payload_v1",
    payload,
    artifact_hash: hash,
  })) as ArtifactRow[];
  const artifactId = inserted[0]?.id ?? null;
  if (!artifactId) throw new Error("artifact was not created");
  await postgrestWrite(cfg, "PATCH", `factory_work_items?id=eq.${encodeURIComponent(workItem.id)}`, {
    result_artifact_id: artifactId,
    status: "awaiting_approval",
    updated_at: new Date().toISOString(),
  });
  return artifactId;
}

/**
 * ساخت Artifact پیش‌نویس راهنمای تازه (THG-RB-01): برخلاف
 * createGuideEditArtifact، هیچ نسخهٔ منتشرشده‌ای پایه نیست؛ بار،
 * همان خروجی کامل مدل است که پیش از این‌جا اعتبارسنجی شده و
 * Hash واقعی‌اش حساب می‌شود. آیتم، پس از این قدم، awaiting_approval
 * می‌شود و قدم بعدی (validate_artifact) بار را دوباره می‌سنجد.
 */
async function createGuideDraftArtifact(
  cfg: DbCfg,
  workItem: WorkItemRow,
  payload: PublishPayload,
): Promise<string> {
  validatePublishPayload(payload);
  const hash = computeContentHash(payload);
  const inserted = (await postgrestWrite(cfg, "POST", "factory_artifacts", {
    work_item_id: workItem.id,
    artifact_type: "content_draft",
    schema_version: "publish_payload_v1",
    payload,
    artifact_hash: hash,
  })) as ArtifactRow[];
  const artifactId = inserted[0]?.id ?? null;
  if (!artifactId) throw new Error("artifact was not created");
  await postgrestWrite(cfg, "PATCH", `factory_work_items?id=eq.${encodeURIComponent(workItem.id)}`, {
    result_artifact_id: artifactId,
    status: "awaiting_approval",
    updated_at: new Date().toISOString(),
  });
  return artifactId;
}

/**
 * ثبت هزینه‌های attempt از پاسخ Gateway: estimated همیشه،
 * actual فقط وقتی غیرتهی است؛ ستون actual_cost در factory_attempts
 * تهی نمی‌پذیرد و null هرگز نباید به صفر تبدیل شود.
 */
async function patchAttemptCosts(
  cfg: DbCfg,
  attemptId: string,
  estimatedCost: number,
  actualCost: number | null,
): Promise<void> {
  await postgrestWrite(cfg, "PATCH", `factory_attempts?id=eq.${encodeURIComponent(attemptId)}`, {
    estimated_cost: estimatedCost,
    ...(actualCost === null ? {} : { actual_cost: actualCost }),
  });
}

/**
 * پیوند یا درج Artifact بازسازی‌شده (R3C-RECOVERY). پیش از درج،
 * دو بررسی می‌شود تا Artifact تکراری ساخته نشود:
 * - اگر آیتم، از پیش Artifact پیوندیافته دارد، Hash آن باید با
 *   Hash بازسازی‌شده از پاسخ ذخیره‌شده برابر باشد؛ ناسازگاری،
 *   خطای gateway_artifact_hash_mismatch است و قدم مسدود می‌شود؛
 * - اگر Artifact با همان Hash برای همین آیتم هست ولی پیوند
 *   نخورده است (Crash میان درج Artifact و PATCH آیتم)، همان سطر
 *   پیوند می‌خورد و سطر تازه‌ای ساخته نمی‌شود.
 * پیوند، با فیلتر result_artifact_id تهی انجام می‌شود؛ پس از دو
 * بازیابی هم‌زمان، فقط یکی پیوند را می‌گیرد و دیگری، برنده را
 * دوباره می‌خواند. سطر یتیمِ جامانده از مسابقه، مثل سابقهٔ M4،
 * به‌علت تغییرناپذیری Artifact باقی می‌ماند و پیوند نمی‌خورد.
 */
async function linkOrInsertGuideEditArtifact(
  cfg: DbCfg,
  workItem: WorkItemRow,
  artifactType: string,
  paragraph: string,
): Promise<string> {
  const { payload, hash } = await buildGuideEditPayload(cfg, workItem, paragraph);
  if (workItem.result_artifact_id) {
    const linked = (await postgrestGet(
      cfg,
      `factory_artifacts?id=eq.${encodeURIComponent(workItem.result_artifact_id)}&select=id,artifact_hash`,
    )) as ArtifactRow[];
    if (linked.length > 0) {
      if (linked[0].artifact_hash !== hash) throw new Error("gateway_artifact_hash_mismatch");
      return linked[0].id;
    }
  }
  const existing = (await postgrestGet(
    cfg,
    `factory_artifacts?work_item_id=eq.${encodeURIComponent(workItem.id)}&artifact_hash=eq.${encodeURIComponent(hash)}&select=id&limit=1`,
  )) as ArtifactRow[];
  if (existing.length > 0) {
    const patched = (await postgrestWrite(
      cfg,
      "PATCH",
      `factory_work_items?id=eq.${encodeURIComponent(workItem.id)}&result_artifact_id=is.null`,
      {
        result_artifact_id: existing[0].id,
        status: "awaiting_approval",
        updated_at: new Date().toISOString(),
      },
    )) as WorkItemRow[];
    if (patched.length > 0) return existing[0].id;
    const winner = (await postgrestGet(
      cfg,
      `factory_work_items?id=eq.${encodeURIComponent(workItem.id)}&select=result_artifact_id`,
    )) as WorkItemRow[];
    if (winner[0]?.result_artifact_id) return winner[0].result_artifact_id;
    throw new Error("artifact link raced and no winner found");
  }
  const inserted = (await postgrestWrite(cfg, "POST", "factory_artifacts", {
    work_item_id: workItem.id,
    artifact_type: artifactType,
    schema_version: "publish_payload_v1",
    payload,
    artifact_hash: hash,
  })) as ArtifactRow[];
  const artifactId = inserted[0]?.id ?? null;
  if (!artifactId) throw new Error("artifact was not created");
  const patched = (await postgrestWrite(
    cfg,
    "PATCH",
    `factory_work_items?id=eq.${encodeURIComponent(workItem.id)}&result_artifact_id=is.null`,
    {
      result_artifact_id: artifactId,
      status: "awaiting_approval",
      updated_at: new Date().toISOString(),
    },
  )) as WorkItemRow[];
  if (patched.length > 0) return artifactId;
  const winner = (await postgrestGet(
    cfg,
    `factory_work_items?id=eq.${encodeURIComponent(workItem.id)}&select=result_artifact_id`,
  )) as WorkItemRow[];
  if (winner[0]?.result_artifact_id) return winner[0].result_artifact_id;
  throw new Error("artifact link raced and no winner found");
}

async function internalPost(base: string, path: string, body: unknown): Promise<{ status: number; json: unknown }> {
  const token = process.env.INTERNAL_PUBLISH_TOKEN ?? "";
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-internal-publish-token": token },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const text = await res.text();
  return { status: res.status, json: text ? JSON.parse(text) : null };
}

/** قدم Claimشده‌ای که Handler اجرا می‌کند؛ زیرمجموعهٔ سطر Step مسیر Tick. */
export interface ClaimedContentStep {
  id: string;
  work_item_id: string;
  step_key: AnyTickStepKey;
  attempt_count: number;
  max_attempts: number;
  fencing_token: number;
}

export type ContentStepFinish = (
  newStatus: string,
  finishStatus: string,
  reconciliation: string,
  errorCode: string | null,
  outputArtifactId: string | null,
  scheduledAt: string | null,
) => Promise<boolean>;

/**
 * زمینهٔ اجرای قدم: همان مقدارهایی که مسیر Tick پیش از Claim و
 * Attempt ساخته است. finishStep و finishRun و blockWorkItem، همان
 * بستارهای مسیرند (fencing و executor و runId در مسیر می‌مانند) تا
 * Handler، منطق ماشینری را تکرار نکند.
 */
export interface ContentStepContext {
  cfg: DbCfg;
  workItem: WorkItemRow;
  claimed: ClaimedContentStep;
  attemptId: string | null;
  runId: string;
  requestOrigin: string;
  switches: KillSwitches;
  testCrashAfterPublication: boolean;
  finishStep: ContentStepFinish;
  finishRun: (claimed: number, completed: number, failed: number) => Promise<void>;
  blockWorkItem: (workItem: WorkItemRow, errorCode: string) => Promise<void>;
}

export type ContentStepResult =
  | { kind: "respond"; status: number; body: unknown }
  | {
      kind: "completed";
      outputArtifactId: string | null;
      gatewayOperationId: string | null;
      gatewayHasExcess: boolean;
    };

export async function runContentStep(ctx: ContentStepContext): Promise<ContentStepResult> {
  const {
    cfg,
    workItem,
    attemptId,
    runId,
    requestOrigin,
    switches,
    testCrashAfterPublication,
    finishStep,
    finishRun,
    blockWorkItem,
  } = ctx;
  const claimed = ctx.claimed;
  let outputArtifactId: string | null = null;
  // ردیاب R3C برای قدم Gateway: شناسهٔ عملیات Gateway که این Tick
  // ثبت کرده و آیا تسویه، اضافه‌هزینهٔ باز دارد؛ دمِ مسیر، عملیات
  // را settled می‌کند و تسویه را با وضعیت درست ثبت می‌کند.
  let gatewayOperationId: string | null = null;
  let gatewayHasExcess = false;
  try {
    // ورودی فقط از مسیر می‌رسد و مسیر، آیتم را با همان
    // claimed.work_item_id خوانده است؛ ناهماهنگی این‌جا، خطای
    // قدم است، نه اجرای قدمِ آیتم دیگر.
    if (claimed.work_item_id !== workItem.id) throw new Error("claimed step work item mismatch");
    if (claimed.step_key === "prepare_context") {
      const docs = (await postgrestGet(
        cfg,
        `content_documents?id=eq.${encodeURIComponent(workItem.content_id)}&select=*`,
      )) as DocumentRow[];
      if (docs.length === 0) throw new Error("content document not found");
      if (docs[0].is_test_fixture) throw new Error("test fixture cannot be processed");
      if (!docs[0].published_version_id) throw new Error("document has no published version");
    } else if (claimed.step_key === "create_artifact") {
      if (!canSubmitArtifact(workItem.status as never)) {
        throw new Error(`work item cannot submit artifact in status ${workItem.status}`);
      }
      const marker = (workItem.description ?? "").trim();
      if (!marker) throw new Error("work item has no marker text for artifact");
      outputArtifactId = await createGuideEditArtifact(cfg, workItem, "guide_edit", marker);
    } else if (claimed.step_key === "validate_artifact") {
      if (!workItem.result_artifact_id) throw new Error("work item has no artifact");
      const artifacts = (await postgrestGet(
        cfg,
        `factory_artifacts?id=eq.${encodeURIComponent(workItem.result_artifact_id)}&select=*`,
      )) as ArtifactRow[];
      if (artifacts.length === 0) throw new Error("artifact not found");
      validatePublishPayload(artifacts[0].payload);
      if (computeContentHash(artifacts[0].payload as PublishPayload) !== artifacts[0].artifact_hash) {
        throw new Error("artifact content_hash mismatch");
      }
      outputArtifactId = artifacts[0].id;
    } else if (claimed.step_key === "generate_draft_mock") {
      // قدم آزمایشی اتصال Tick به Gateway در R3C. فقط برای Workflow
      // تازهٔ guide_content_gateway_v1 به این‌جا می‌رسد (آداپتور،
      // قدم را فقط برای همان Workflow eligible می‌داند) و فقط با
      // Mock Provider کار می‌کند؛ هیچ API مدل خارجی صدا زده نمی‌شود.
      if (!attemptId) throw new Error("factory attempt was not created");
      // بازیابی R3C-RECOVERY، پیش از گیت canSubmitArtifact:
      // آیتمی که Artifactش در تلاشِ قطع‌شده ثبت شده، وضعیتش
      // awaiting_approval است؛ بازیابی، تسلیم تازه نیست (Artifactِ
      // پیوندشده بازاستفاده یا بازسازی و پیوند می‌شود) و نباید
      // پشت گیتِ تسلیم تازه بماند، وگرنه هر تیکِ بازیابی با
      // «cannot submit artifact» می‌افتد و قدم پس از ۵ تلاش
      // blocked می‌شود (دیده‌شده در S6). مسیر تازهٔ پایین،
      // همچنان همان گیت را دارد.
      {
        const recoveryLogicalId = gatewayLogicalOperationId(workItem.id, claimed.step_key, "generate_draft_mock");
        const recoveryLatest = await getLatestOperation(cfg, recoveryLogicalId);
        const recoverableStates = ["pending", "reserved", "sent", "unknown", "response_recorded", "settled_unreturned", "settled"];
        if (recoveryLatest && recoverableStates.includes(recoveryLatest.state)) {
          const outcome = await recoverGatewayArtifact(cfg, new PostgrestBudgetLedger(cfg), {
            workItemId: workItem.id,
            stepKey: claimed.step_key,
            operationName: "generate_draft_mock",
            outputSchema: DEMO_DRAFT_SCHEMA,
          });
          if (outcome.kind === "gate_open") {
            await finishRun(1, 0, 0);
            return { kind: "respond", status: 200, body: {
              run_id: runId,
              status: outcome.reason,
              work_item_id: workItem.id,
              step_key: claimed.step_key,
              attempt_no: claimed.attempt_count,
            } };
          }
          if (outcome.kind === "lost_race") {
            await finishRun(1, 0, 0);
            return { kind: "respond", status: 200, body: {
              run_id: runId,
              status: "gateway_recovery_race",
              work_item_id: workItem.id,
              step_key: claimed.step_key,
              attempt_no: claimed.attempt_count,
            } };
          }
          if (outcome.kind === "blocked") {
            await finishStep("blocked", "failed", "not_required", outcome.reason, null, null);
            await blockWorkItem(workItem, outcome.reason);
            await finishRun(1, 0, 1);
            return { kind: "respond", status: 200, body: {
              run_id: runId,
              status: "gateway_recovery_blocked",
              reason: outcome.reason,
              work_item_id: workItem.id,
              step_key: claimed.step_key,
              attempt_no: claimed.attempt_count,
            } };
          }
          if (outcome.kind === "recovered") {
            // قدم، فقط پس از ثبت Artifact معتبر موفق می‌شود.
            try {
              await postgrestWrite(cfg, "PATCH", `factory_attempts?id=eq.${encodeURIComponent(attemptId)}`, {
                estimated_cost: outcome.operation.estimated_cost,
                actual_cost: outcome.operation.actual_cost,
              });
              outputArtifactId = await linkOrInsertGuideEditArtifact(cfg, workItem, "content_draft_demo", outcome.paragraph);
            } catch (error) {
              if (error instanceof Error && error.message === "gateway_artifact_hash_mismatch") {
                await finishStep("blocked", "failed", "not_required", "gateway_artifact_hash_mismatch", null, null);
                await blockWorkItem(workItem, "gateway_artifact_hash_mismatch");
                await finishRun(1, 0, 1);
                return { kind: "respond", status: 200, body: {
                  run_id: runId,
                  status: "gateway_recovery_blocked",
                  reason: "gateway_artifact_hash_mismatch",
                  work_item_id: workItem.id,
                  step_key: claimed.step_key,
                  attempt_no: claimed.attempt_count,
                } };
              }
              throw error;
            }
            gatewayOperationId = outcome.operation.id;
            gatewayHasExcess = outcome.excessAmount !== null;
            const finished = await finishStep(
              "succeeded",
              "succeeded",
              gatewayHasExcess ? "pending" : "not_required",
              null,
              outputArtifactId,
              null,
            );
            if (!finished) {
              await finishRun(1, 0, 1);
              return { kind: "respond", status: 200, body: {
                run_id: runId,
                status: "stale_fencing",
                work_item_id: workItem.id,
                step_key: claimed.step_key,
                attempt_no: claimed.attempt_count,
              } };
            }
            await finishRun(1, 1, 0);
            return { kind: "respond", status: 200, body: {
              run_id: runId,
              status: "step_succeeded",
              work_item_id: workItem.id,
              step_key: claimed.step_key,
              attempt_no: claimed.attempt_count,
            } };
          }
          // proceed_fresh و no_operation: منطق موجود پایین، فراخوان تازه را ادامه می‌دهد.
        }
      }
      // گیت تسلیم تازه، فقط برای مسیر تازهٔ پایین (بازیابی، بالا انجام شد).
      if (!canSubmitArtifact(workItem.status as never)) {
        throw new Error(`work item cannot submit artifact in status ${workItem.status}`);
      }
      if (workItem.result_artifact_id) {
        // Artifact، از تلاش پیشین هست؛ دوباره ساخته نمی‌شود.
        outputArtifactId = workItem.result_artifact_id;
      } else {
        const logicalId = gatewayLogicalOperationId(workItem.id, claimed.step_key, "generate_draft_mock");
        const latestOp = await getLatestOperation(cfg, logicalId);
        const priorId =
          latestOp &&
          ["settled", "released", "referred", "failed", "abandoned"].includes(latestOp.state)
            ? latestOp.id
            : null;
        const idempotencyKey = `r3c-${workItem.work_key}-generate_draft_mock-${claimed.attempt_count}`;
        let opened;
        try {
          opened = await openGatewayOperation(
            cfg,
            {
              work_item_id: workItem.id,
              work_step_id: claimed.id,
              operation_name: "generate_draft_mock",
              idempotency_key: idempotencyKey,
              capability: "draft_generation",
              provider: "mock",
              model_id: "mock-deterministic-v1",
              prompt_version: "r3c-demo-v1",
              token_limit: 100,
              timeout: 30000,
              input: { guide_slug: "best-time-to-visit-thailand", demo_key: workItem.work_key },
              prior_operation_id: priorId,
              retry_reason: priorId ? `tick retry after terminal operation ${latestOp?.state}` : null,
            },
            claimed.step_key,
          );
        } catch (error) {
          if (error instanceof GatewayOperationError) {
            throw new Error(`gateway operation open failed: ${error.code}`);
          }
          throw error;
        }
        if (opened.kind === "blocked" || opened.kind === "open") {
          // گیت: قدم، claimed می‌ماند و Attempt نمی‌سوزد؛ اپراتور
          // باید عملیات باز را تعیین تکلیف کند. بدون finishStep.
          await finishRun(1, 0, 0);
          return { kind: "respond", status: 200, body: {
            run_id: runId,
            status: opened.kind === "blocked" && opened.reason === "debt_open" ? "gateway_debt_open" : "gateway_operation_open",
            work_item_id: workItem.id,
            step_key: claimed.step_key,
            attempt_no: claimed.attempt_count,
          } };
        }
        if (opened.kind === "replayed") {
          // عملیات پایانی با همان کلید: بدون فراخوان تازه. اگر
          // خروجی ذخیره‌شده، پاراگراف دارد، Artifact از همان
          // خروجی قطعی بازسازی می‌شود؛ وگرنه قدم، مسدود می‌شود.
          const stored = opened.operation.response_json as { output?: { draft_paragraph?: string } } | null;
          const paragraph = stored?.output?.draft_paragraph;
          if (!paragraph) {
            await finishStep("blocked", "failed", "not_required", "gateway_operation_terminal", null, null);
            await blockWorkItem(workItem, "gateway_operation_terminal");
            await finishRun(1, 0, 1);
            return { kind: "respond", status: 200, body: {
              run_id: runId,
              status: "gateway_operation_terminal",
              work_item_id: workItem.id,
              step_key: claimed.step_key,
              attempt_no: claimed.attempt_count,
            } };
          }
          gatewayOperationId = opened.operation.id;
          await postgrestWrite(cfg, "PATCH", `factory_attempts?id=eq.${encodeURIComponent(attemptId)}`, {
            estimated_cost: opened.operation.estimated_cost,
            actual_cost: opened.operation.actual_cost,
          });
          outputArtifactId = await createGuideEditArtifact(cfg, workItem, "content_draft_demo", paragraph);
        } else {
          let run;
          try {
            run = await runGatewayCallForOperation(
              cfg,
              {
                ledger: new PostgrestBudgetLedger(cfg),
                estimateUnitPrice: 1,
                budgetPolicy: CURRENT_BUDGET_POLICY,
              },
              {
                operation: opened.operation,
                work_item_id: workItem.id,
                work_step_id: claimed.id,
                capability: "draft_generation",
                provider: "mock",
                model_id: "mock-deterministic-v1",
                prompt_version: "r3c-demo-v1",
                token_limit: 100,
                timeout: 30000,
                input: { guide_slug: "best-time-to-visit-thailand", demo_key: workItem.work_key },
                output_schema: DEMO_DRAFT_SCHEMA,
                factory_attempt_id: attemptId,
              },
            );
          } catch (error) {
            if (isSimulatedCrash(error)) {
              // Crash شبیه‌سازی‌شده: قدم بسته نمی‌شود تا بازیابی
              // از دیتابیس ممکن بماند (مثل test_crash_after_claim).
              await postgrestWrite(cfg, "PATCH", `factory_runs?id=eq.${encodeURIComponent(runId)}`, {
                finished_at: new Date().toISOString(),
                run_status: "failed",
                items_claimed: 1,
                items_completed: 0,
                items_failed: 1,
              });
              return { kind: "respond", status: 500, body: {
                  run_id: runId,
                  status: "crash_after_gateway_reservation",
                  work_item_id: workItem.id,
                  step_key: claimed.step_key,
                  attempt_no: claimed.attempt_count,
                } };
            }
            throw error;
          }
          if (run.kind === "unknown") {
            gatewayOperationId = run.operation.id;
            await finishStep("blocked", "outcome_unknown", "pending", "timeout", null, null);
            await finishRun(1, 0, 1);
            return { kind: "respond", status: 200, body: {
              run_id: runId,
              status: "gateway_outcome_unknown",
              work_item_id: workItem.id,
              step_key: claimed.step_key,
              attempt_no: claimed.attempt_count,
            } };
          }
          if (run.kind === "failed") {
            const code = run.response.error?.code ?? "provider_error";
            gatewayOperationId = run.operation.id;
            if (code === "budget_not_configured" || code === "budget_exceeded") {
              await finishStep("blocked", "failed", "not_required", "budget_exhausted", null, null);
              await blockWorkItem(workItem, "budget_exhausted");
              await finishRun(1, 0, 1);
              return { kind: "respond", status: 200, body: {
                run_id: runId,
                status: "budget_exhausted",
                work_item_id: workItem.id,
                step_key: claimed.step_key,
                attempt_no: claimed.attempt_count,
              } };
            }
            throw new Error(`gateway call failed: ${code}`);
          }
          const draft = run.response.output as { draft_paragraph?: string } | undefined;
          if (!draft?.draft_paragraph) throw new Error("gateway draft output missing");
          gatewayOperationId = run.operation.id;
          gatewayHasExcess = run.response.reconciliation?.excess_amount != null;
          // هزینه‌های attempt، از پاسخ واقعی Gateway ثبت می‌شود،
          // نه صفر پیش‌فرض؛ finish_work_step به این ستون‌ها دست
          // نمی‌زند، پس این‌جا بازنویسی نمی‌شوند.
          await postgrestWrite(cfg, "PATCH", `factory_attempts?id=eq.${encodeURIComponent(attemptId)}`, {
            estimated_cost: run.response.estimated_cost,
            actual_cost: run.response.actual_cost,
          });
          // قلاب آزمایشی R3C-RECOVERY: Crash پس از تسویه و پیش از
          // درج Artifact (پنجرهٔ اصلی). پیش‌فرض خاموش است.
          throwIfCrashAfter("artifact");
          outputArtifactId = await createGuideEditArtifact(cfg, workItem, "content_draft_demo", draft.draft_paragraph);
          // قلاب آزمایشی R3C-RECOVERY: Crash پس از درج Artifact و
          // پیش از finish شدن Step.
          throwIfCrashAfter("artifact_registered");
        }
      }
    } else if (claimed.step_key === "generate_draft") {
      // قدم واقعی تولید Draft با Provider واقعی (THG-RB-01). فقط
      // برای Workflow نسخهٔ ۲ به این‌جا می‌رسد. برخلاف قدم آزمایشی،
      // پایهٔ ویرایش ندارد: مدل، بار کامل publish_payload_v1 را
      // می‌سازد و Artifact از همان بار کامل ساخته می‌شود. بازیابی
      // خودکار R3C-RECOVERY برای این قدم هنوز وصل نشده است؛ اگر
      // فراخوان، میان راه قطع شود، عملیات باز می‌ماند و قدم،
      // Attempt نمی‌سوزاند تا اپراتور تعیین تکلیفش کند.
      if (!attemptId) throw new Error("factory attempt was not created");
      if (!canSubmitArtifact(workItem.status as never)) {
        throw new Error(`work item cannot submit artifact in status ${workItem.status}`);
      }
      if (workItem.result_artifact_id) {
        // Artifact، از تلاش پیشین هست؛ دوباره ساخته نمی‌شود.
        outputArtifactId = workItem.result_artifact_id;
      } else {
        const docs = (await postgrestGet(
          cfg,
          `content_documents?id=eq.${encodeURIComponent(workItem.content_id)}&select=*`,
        )) as DocumentRow[];
        const doc = docs[0];
        if (!doc?.slug) throw new Error("work item has no guide document");
        const modelId = modelsForCapability("generation")[0];
        if (!modelId) throw new Error("no generation model registered");
        // مسیر بازنویسی خودمختار (THG-AUTO-01): اگر سند، نسخهٔ
        // منتشرشده دارد، بار جاری همان نسخه به مدل داده می‌شود و
        // پرامپت بازنویسی است؛ وگرنه، همان پرامپت راهنمای تازه.
        // تمایز، از وضعیت سند است، نه از Work Item؛ پس یک Workflow
        // خودمختار، هم راهنمای تازه و هم بازنویسی را می‌سازد.
        let draftInput;
        let draftPromptVersion = "r3g-draft-v1";
        if (doc.published_version_id) {
          const versions = (await postgrestGet(
            cfg,
            `content_versions?id=eq.${encodeURIComponent(doc.published_version_id)}&select=payload`,
          )) as { payload: unknown }[];
          if (versions.length === 0) throw new Error("published version not found for rewrite");
          draftPromptVersion = "auto-rewrite-v1";
          draftInput = {
            guide_slug: doc.slug,
            messages: [
              { role: "system", content: REWRITE_SYSTEM_PROMPT },
              {
                role: "user",
                content: buildRewriteUserMessage(doc.slug, workItem.title ?? doc.slug, versions[0].payload),
              },
            ],
          };
        } else {
          draftInput = {
            guide_slug: doc.slug,
            messages: [
              { role: "system", content: DRAFT_SYSTEM_PROMPT },
              {
                role: "user",
                content: `راهنمای تازه با slug «${doc.slug}» و عنوان «${workItem.title ?? doc.slug}» بنویس.`,
              },
            ],
          };
        }
        const logicalId = gatewayLogicalOperationId(workItem.id, claimed.step_key, "generate_draft");
        const latestOp = await getLatestOperation(cfg, logicalId);
        const priorId =
          latestOp &&
          ["settled", "released", "referred", "failed", "abandoned"].includes(latestOp.state)
            ? latestOp.id
            : null;
        const idempotencyKey = `r3g-${workItem.work_key}-generate_draft-${claimed.attempt_count}`;
        let opened;
        try {
          opened = await openGatewayOperation(
            cfg,
            {
              work_item_id: workItem.id,
              work_step_id: claimed.id,
              operation_name: "generate_draft",
              idempotency_key: idempotencyKey,
              capability: "draft_generation",
              provider: "reformboss",
              model_id: modelId,
              prompt_version: draftPromptVersion,
              token_limit: 3000,
              timeout: 30000,
              input: draftInput,
              prior_operation_id: priorId,
              retry_reason: priorId ? `tick retry after terminal operation ${latestOp?.state}` : null,
            },
            claimed.step_key,
          );
        } catch (error) {
          if (error instanceof GatewayOperationError) {
            throw new Error(`gateway operation open failed: ${error.code}`);
          }
          throw error;
        }
        if (opened.kind === "blocked" || opened.kind === "open") {
          // گیت: قدم، claimed می‌ماند و Attempt نمی‌سوزد؛ اپراتور
          // باید عملیات باز را تعیین تکلیف کند. بدون finishStep.
          await finishRun(1, 0, 0);
          return { kind: "respond", status: 200, body: {
            run_id: runId,
            status: opened.kind === "blocked" && opened.reason === "debt_open" ? "gateway_debt_open" : "gateway_operation_open",
            work_item_id: workItem.id,
            step_key: claimed.step_key,
            attempt_no: claimed.attempt_count,
          } };
        }
        if (opened.kind === "replayed") {
          // عملیات پایانی با همان کلید: بدون فراخوان تازه. اگر
          // خروجی ذخیره‌شده، بار معتبر دارد، Artifact از همان
          // خروجی قطعی ساخته می‌شود؛ وگرنه قدم، مسدود می‌شود.
          const stored = opened.operation.response_json as { output?: unknown } | null;
          const payload = stored?.output;
          try {
            validatePublishPayload(payload);
          } catch {
            await finishStep("blocked", "failed", "not_required", "gateway_operation_terminal", null, null);
            await blockWorkItem(workItem, "gateway_operation_terminal");
            await finishRun(1, 0, 1);
            return { kind: "respond", status: 200, body: {
              run_id: runId,
              status: "gateway_operation_terminal",
              work_item_id: workItem.id,
              step_key: claimed.step_key,
              attempt_no: claimed.attempt_count,
            } };
          }
          gatewayOperationId = opened.operation.id;
          await patchAttemptCosts(cfg, attemptId, opened.operation.estimated_cost, opened.operation.actual_cost);
          outputArtifactId = await createGuideDraftArtifact(cfg, workItem, payload as PublishPayload);
        } else {
          let run;
          try {
            run = await runGatewayCallForOperation(
              cfg,
              {
                ledger: new PostgrestBudgetLedger(cfg),
                estimateUnitPrice: 1,
                budgetPolicy: CURRENT_BUDGET_POLICY,
              },
              {
                operation: opened.operation,
                work_item_id: workItem.id,
                work_step_id: claimed.id,
                capability: "draft_generation",
                provider: "reformboss",
                model_id: modelId,
                prompt_version: draftPromptVersion,
                token_limit: 3000,
                timeout: 30000,
                input: draftInput,
                output_schema: PUBLISH_PAYLOAD_SCHEMA,
                factory_attempt_id: attemptId,
              },
            );
          } catch (error) {
            if (isSimulatedCrash(error)) {
              await postgrestWrite(cfg, "PATCH", `factory_runs?id=eq.${encodeURIComponent(runId)}`, {
                finished_at: new Date().toISOString(),
                run_status: "failed",
                items_claimed: 1,
                items_completed: 0,
                items_failed: 1,
              });
              return { kind: "respond", status: 500, body: {
                  run_id: runId,
                  status: "crash_after_gateway_reservation",
                  work_item_id: workItem.id,
                  step_key: claimed.step_key,
                  attempt_no: claimed.attempt_count,
                } };
            }
            throw error;
          }
          if (run.kind === "unknown") {
            gatewayOperationId = run.operation.id;
            await finishStep("blocked", "outcome_unknown", "pending", "timeout", null, null);
            await finishRun(1, 0, 1);
            return { kind: "respond", status: 200, body: {
              run_id: runId,
              status: "gateway_outcome_unknown",
              work_item_id: workItem.id,
              step_key: claimed.step_key,
              attempt_no: claimed.attempt_count,
            } };
          }
          if (run.kind === "failed") {
            const code = run.response.error?.code ?? "provider_error";
            gatewayOperationId = run.operation.id;
            if (code === "budget_not_configured" || code === "budget_exceeded") {
              await finishStep("blocked", "failed", "not_required", "budget_exhausted", null, null);
              await blockWorkItem(workItem, "budget_exhausted");
              await finishRun(1, 0, 1);
              return { kind: "respond", status: 200, body: {
                run_id: runId,
                status: "budget_exhausted",
                work_item_id: workItem.id,
                step_key: claimed.step_key,
                attempt_no: claimed.attempt_count,
              } };
            }
            throw new Error(`gateway call failed: ${code}`);
          }
          const payload = run.response.output as PublishPayload;
          validatePublishPayload(payload);
          gatewayOperationId = run.operation.id;
          gatewayHasExcess = run.response.reconciliation?.excess_amount != null;
          await patchAttemptCosts(cfg, attemptId, run.response.estimated_cost, run.response.actual_cost);
          throwIfCrashAfter("artifact");
          outputArtifactId = await createGuideDraftArtifact(cfg, workItem, payload);
          throwIfCrashAfter("artifact_registered");
        }
      }
    } else if (claimed.step_key === "auto_approve") {
      // قدم تأیید سیستمی (THG-AUTO-01): فقط برای Workflow
      // خودمختار. سطر approval، مستقیم با PostgREST درج می‌شود،
      // چون مسیر approvals داشبورد، reviewer_id بدنه را نادیده
      // می‌گیرد و هویت سروری می‌زند؛ استفاده از آن مسیر برای
      // تأیید سیستمی، هویت انسان را جعل می‌کرد. این‌جا reviewer_id
      // دقیقاً system:autonomous است و دلیل، دستور مدیر پروژه را
      // می‌گوید؛ پس هیچ تأیید انسانی جعل نمی‌شود. بازپخش: اگر
      // تأیید سیستمی همین Artifact از پیش هست، همان برگردانده
      // می‌شود و سطر تازه ساخته نمی‌شود.
      if (workItem.workflow_version !== AUTO_WORKFLOW_VERSION) {
        throw new Error("auto_approve is only for the autonomous workflow");
      }
      if (workItem.status !== "awaiting_approval") {
        throw new Error(`work item is not awaiting_approval (status ${workItem.status})`);
      }
      if (!workItem.result_artifact_id) throw new Error("work item has no artifact");
      const artifacts = (await postgrestGet(
        cfg,
        `factory_artifacts?id=eq.${encodeURIComponent(workItem.result_artifact_id)}&select=*`,
      )) as ArtifactRow[];
      if (artifacts.length === 0) throw new Error("artifact not found");
      const existing = (await postgrestGet(
        cfg,
        `factory_approvals?work_item_id=eq.${encodeURIComponent(workItem.id)}&artifact_id=eq.${encodeURIComponent(workItem.result_artifact_id)}&decision=eq.approved&reviewer_id=eq.${encodeURIComponent(SYSTEM_APPROVER_ID)}&select=id&limit=1`,
      )) as ApprovalRow[];
      if (existing.length === 0) {
        const inserted = (await postgrestWrite(cfg, "POST", "factory_approvals", {
          work_item_id: workItem.id,
          artifact_id: artifacts[0].id,
          artifact_hash: artifacts[0].artifact_hash,
          decision: "approved",
          reviewer_id: SYSTEM_APPROVER_ID,
          decision_reason: AUTO_APPROVAL_REASON,
        })) as ApprovalRow[];
        if (!inserted[0]?.id) throw new Error("system approval was not created");
      }
      // THG-TEAM-ARCHITECTURE-01 P2 step 2: تصمیم Policy هم روی همان
      // Work Item می‌نشیند؛ دروازهٔ خودکار، policy_decision برابر auto
      // با تصمیم‌گیرندهٔ system:autonomous است. مقدار auto از CHECK
      // روی factory_work_items می‌آید، نه از حدس.
      // policy_decision فقط نوع تصمیم‌گیرنده (auto) را می‌گوید؛ نتیجه در status و سطر approval است.
      await postgrestWrite(cfg, "PATCH", `factory_work_items?id=eq.${encodeURIComponent(workItem.id)}`, {
        status: "approved",
        policy_decision: "auto",
        policy_decided_by: SYSTEM_APPROVER_ID,
        policy_decided_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    } else if (claimed.step_key === "await_human_approval") {
      // گیت پیش از Claim، Approval را بررسی کرده است؛ این‌جا دوباره بررسی می‌شود.
      if (!workItem.result_artifact_id) throw new Error("work item has no artifact");
      const artifacts = (await postgrestGet(
        cfg,
        `factory_artifacts?id=eq.${encodeURIComponent(workItem.result_artifact_id)}&select=*`,
      )) as ArtifactRow[];
      const approvals = (await postgrestGet(
        cfg,
        `factory_approvals?work_item_id=eq.${encodeURIComponent(workItem.id)}&decision=eq.approved&order=created_at.desc&select=*`,
      )) as ApprovalRow[];
      const approval = approvals[0];
      const valid =
        artifacts.length > 0 &&
        approval !== undefined &&
        isApprovalValidForPublish({
          workItemStatus: workItem.status as never,
          workItemArtifactId: workItem.result_artifact_id,
          approvalArtifactId: approval.artifact_id,
          approvalArtifactHash: approval.artifact_hash,
          artifactHash: artifacts[0].artifact_hash,
          approvalDecision: "approved",
        });
      if (!valid) {
        await finishStep("queued", "failed", "not_required", "awaiting_approval", null, null);
        await finishRun(1, 0, 0);
        return { kind: "respond", status: 200, body: {
          run_id: runId,
          status: "awaiting_human_approval",
          work_item_id: workItem.id,
          step_key: claimed.step_key,
          attempt_no: claimed.attempt_count,
        } };
      }
    } else if (claimed.step_key === "create_version") {
      if (!workItem.result_artifact_id) throw new Error("work item has no artifact");
      const artifacts = (await postgrestGet(
        cfg,
        `factory_artifacts?id=eq.${encodeURIComponent(workItem.result_artifact_id)}&select=*`,
      )) as ArtifactRow[];
      if (artifacts.length === 0) throw new Error("artifact not found");
      // M5: قدم ساخت نسخه برای UpdateContent از Function نسخهٔ دوم
      // استفاده می‌کند (بدون محدودیت تک‌slug)؛ بقیهٔ Work Itemها همان
      // Function نسخهٔ اول را می‌گیرند.
      const versionFn =
        workItem.work_type === "update_content"
          ? "create_approved_version_v2"
          : "create_approved_version";
      const created = (await postgrestRpc(cfg, versionFn, {
        p_content_id: workItem.content_id,
        p_payload: artifacts[0].payload,
        p_content_hash: artifacts[0].artifact_hash,
        p_work_item_id: workItem.id,
        p_artifact_id: artifacts[0].id,
      })) as VersionRow | VersionRow[] | null;
      const versionRow = Array.isArray(created) ? created[0] : created;
      if (!versionRow || !versionRow.id) throw new Error("approved version was not created");
      outputArtifactId = artifacts[0].id;
    } else if (claimed.step_key === "publish_version") {
      if (!switches.dataPublishingEnabled) throw new Error("publishing is disabled by kill switch");
      if (!workItem.result_artifact_id || !workItem.result_version_id) {
        throw new Error("work item has no approved version");
      }
      if (workItem.publication_id) {
        // بازیابی پس از Crash: Publication از قبل هست و دوباره ساخته نمی‌شود.
      } else {
        const artifacts = (await postgrestGet(
          cfg,
          `factory_artifacts?id=eq.${encodeURIComponent(workItem.result_artifact_id)}&select=*`,
        )) as ArtifactRow[];
        const approvals = (await postgrestGet(
          cfg,
          `factory_approvals?work_item_id=eq.${encodeURIComponent(workItem.id)}&artifact_id=eq.${encodeURIComponent(workItem.result_artifact_id)}&decision=eq.approved&order=created_at.desc&select=*`,
        )) as ApprovalRow[];
        const docs = (await postgrestGet(
          cfg,
          `content_documents?id=eq.${encodeURIComponent(workItem.content_id)}&select=*`,
        )) as DocumentRow[];
        if (artifacts.length === 0 || approvals.length === 0 || docs.length === 0) {
          throw new Error("publish prerequisites are missing");
        }
        const payload = artifacts[0].payload as PublishPayload;
        let previousUniqueText: string | null = null;
        if (docs[0].published_version_id) {
          const prevVersions = (await postgrestGet(
            cfg,
            `content_versions?id=eq.${encodeURIComponent(docs[0].published_version_id)}&select=*`,
          )) as VersionRow[];
          if (prevVersions.length > 0) {
            const prevFirst = firstParagraph(prevVersions[0].payload as PublishPayload);
            const expectedMarker = firstParagraph(payload);
            previousUniqueText = prevFirst !== expectedMarker ? prevFirst : null;
          }
        }
        if (workItem.work_type === "update_content") {
          // M5 publish-v2: اعتبارسنجی، سقف روزانه و Timeout در سرویس؛
          // زنجیرهٔ superseded_by و Outbox در Function اتمیک. بازیابی
          // پس از Crash با همان کلید Idempotency در خود سرویس انجام
          // می‌شود (Replay)، پس این‌جا فقط نتیجه ثبت می‌شود.
          const versionRows = (await postgrestGet(
            cfg,
            `content_versions?id=eq.${encodeURIComponent(workItem.result_version_id)}&select=*`,
          )) as VersionRow[];
          const v2result = await publishUpdateContent(cfg, {
            workItemId: workItem.id,
            workKey: workItem.work_key,
            contentId: docs[0].id,
            versionId: workItem.result_version_id,
            approvalId: approvals[0].id,
            expectedMarker: firstParagraph(payload),
            previousUniqueText,
            previousVersionId: docs[0].published_version_id,
            validation: {
              workItemStatus: workItem.status,
              workItemArtifactId: workItem.result_artifact_id,
              approvalArtifactId: approvals[0].artifact_id,
              approvalArtifactHash: approvals[0].artifact_hash,
              artifactHash: artifacts[0].artifact_hash,
              approvalDecision: "approved",
              contentType: docs[0].content_type,
              schemaVersion: versionRows[0]?.schema_version ?? "unknown",
            },
          });
          if (testCrashAfterPublication) {
            throw new CrashAfterPublicationError("test hook: crash after publication commit");
          }
          await postgrestWrite(cfg, "PATCH", `factory_work_items?id=eq.${encodeURIComponent(workItem.id)}`, {
            publication_id: v2result.publicationId,
            status: "publishing",
            updated_at: new Date().toISOString(),
          });
        } else {
          const result = (await postgrestRpc(cfg, "publish_content_atomic", {
            p_content_id: docs[0].id,
            p_version_id: workItem.result_version_id,
            p_idempotency_key: workItemPublishIdempotencyKey(workItem.work_key),
            p_expected_marker: firstParagraph(payload),
            p_previous_unique_text: previousUniqueText,
            p_publication_kind: "publish",
            p_rollback_of_publication_id: null,
            p_reason: `approved tick publish for work item ${workItem.work_key}`,
            p_work_item_id: workItem.id,
            p_approval_id: approvals[0].id,
          })) as Record<string, unknown>;
          if (testCrashAfterPublication) {
            throw new CrashAfterPublicationError("test hook: crash after publication commit");
          }
          await postgrestWrite(cfg, "PATCH", `factory_work_items?id=eq.${encodeURIComponent(workItem.id)}`, {
            publication_id: result.publication_id,
            status: "publishing",
            updated_at: new Date().toISOString(),
          });
        }
      }
    } else if (claimed.step_key === "process_publication") {
      if (!workItem.publication_id) throw new Error("work item has no publication");
      const pubs = (await postgrestGet(
        cfg,
        `factory_publications?id=eq.${encodeURIComponent(workItem.publication_id)}&select=*`,
      )) as PublicationRow[];
      if (pubs.length > 0 && pubs[0].status === "verified") {
        // از قبل verified است؛ Step موفق می‌شود.
      } else {
        // گام process_publication، مستقیم از سرویس مشترک پمپ صدا می‌زند؛
        // همان منطقی که مسیر process-outbox هم از آن استفاده می‌کند.
        const processed = await processOutboxBatch(cfg, requestOrigin, {});
        const result = processed.body as Record<string, unknown> | null;
        if (result && result.status === "verified") {
          // موفق؛ Step پایین‌تر succeeded می‌شود.
        } else if (result && result.status === "needs_intervention") {
          await finishStep("blocked", "failed", "needs_intervention", "publication_needs_intervention", null, null);
          await blockWorkItem(workItem, "publication_needs_intervention");
          await finishRun(1, 0, 1);
          return { kind: "respond", status: 200, body: {
            run_id: runId,
            status: "publication_needs_intervention",
            work_item_id: workItem.id,
            step_key: claimed.step_key,
            attempt_no: claimed.attempt_count,
          } };
        } else {
          const nextAttempt = typeof result?.next_attempt_at === "string" ? (result.next_attempt_at as string) : null;
          await finishStep("queued", "failed", "not_required", "verification_pending", null, nextAttempt);
          await finishRun(1, 0, 0);
          return { kind: "respond", status: 200, body: {
            run_id: runId,
            status: "verification_pending",
            work_item_id: workItem.id,
            step_key: claimed.step_key,
            attempt_no: claimed.attempt_count,
            next_attempt_at: nextAttempt,
          } };
        }
      }
    } else if (claimed.step_key === "verify_publication") {
      // قدم Verify خودکار پس از انتشار (THG-AUTO-01): تنها چیزی
      // که جای تأیید انسانی را می‌گیرد. صفحهٔ واقعی با همان
      // سنجش مسیر Outbox (۲۰۰ + مسیر متعارف + نشان نسخهٔ تازه +
      // نبود متن یکتای نسخهٔ قبل) و با ۳ تلاش سنجیده می‌شود،
      // به‌علاوهٔ حضور slug در نقشهٔ سایت داینامیک. موفقیت یعنی
      // قدم succeeded و زنجیره به complete_work می‌رسد. شکست
      // یعنی Rollback خودکار از مسیر موجود (وقتی نسخهٔ قبل هست)
      // یا Unpublish برای انتشار اول (وقتی نسخهٔ قبلی نیست) +
      // سطر audit از نوع intervention + مسدود شدن WI؛ قدم، هرگز
      // با صفحهٔ خراب succeeded نمی‌شود.
      if (workItem.workflow_version !== AUTO_WORKFLOW_VERSION) {
        throw new Error("verify_publication is only for the autonomous workflow");
      }
      if (!workItem.publication_id) throw new Error("work item has no publication");
      if (!workItem.result_version_id) throw new Error("work item has no version");
      const pubs = (await postgrestGet(
        cfg,
        `factory_publications?id=eq.${encodeURIComponent(workItem.publication_id)}&select=*`,
      )) as PublicationRow[];
      if (pubs.length === 0) throw new Error("publication not found");
      const publication = pubs[0];
      const docs = (await postgrestGet(
        cfg,
        `content_documents?id=eq.${encodeURIComponent(workItem.content_id)}&select=*`,
      )) as DocumentRow[];
      if (docs.length === 0) throw new Error("guide document not found");
      const versions = (await postgrestGet(
        cfg,
        `content_versions?id=eq.${encodeURIComponent(workItem.result_version_id)}&select=*`,
      )) as VersionRow[];
      if (versions.length === 0) throw new Error("version not found");
      const payload = versions[0].payload as PublishPayload;
      const canonicalPath = docs[0].canonical_path;
      const expectedMarker = firstParagraph(payload);
      let previousUniqueText: string | null = null;
      if (publication.previous_version_id) {
        const prevVersions = (await postgrestGet(
          cfg,
          `content_versions?id=eq.${encodeURIComponent(publication.previous_version_id)}&select=*`,
        )) as VersionRow[];
        if (prevVersions.length > 0) {
          const prevFirst = firstParagraph(prevVersions[0].payload as PublishPayload);
          previousUniqueText = prevFirst !== expectedMarker ? prevFirst : null;
        }
      }
      const pageVerification = await verifyPageWithRetries(
        async () => {
          const res = await fetch(`${requestOrigin}${canonicalPath}`, { cache: "no-store" });
          return { httpStatus: res.status, html: await res.text().catch(() => "") };
        },
        { canonicalPath, expectedMarker, previousUniqueText },
        3,
        3000,
      );
      let sitemapOk = false;
      for (let attempt = 1; attempt <= 3 && !sitemapOk; attempt++) {
        try {
          const smRes = await fetch(`${requestOrigin}/sitemap.xml`, { cache: "no-store" });
          const smXml = await smRes.text().catch(() => "");
          sitemapOk = smRes.status === 200 && sitemapContainsSlug(smXml, canonicalPath);
        } catch {
          sitemapOk = false;
        }
        if (!sitemapOk && attempt < 3) await new Promise((r) => setTimeout(r, 2000));
      }
      const verifyReasons = [
        ...pageVerification.result.reasons,
        ...(sitemapOk ? [] : ["canonical path not found in sitemap"]),
      ];
      if (!pageVerification.result.ok || !sitemapOk) {
        const detail = `auto verify failed: ${verifyReasons.join("; ")}`.slice(0, 400);
        let rollbackNote: string;
        if (publication.previous_version_id) {
          const rb = await internalPost(requestOrigin, "/api/internal/factory/rollback", {
            publication_id: publication.id,
            reason: `auto rollback after failed verification: ${detail}`.slice(0, 500),
          });
          if (rb.status !== 200) throw new Error(`auto rollback failed: ${JSON.stringify(rb.json)?.slice(0, 200)}`);
          const pumped = await processOutboxBatch(cfg, requestOrigin, {});
          const pumpBody = pumped.body as Record<string, unknown> | null;
          rollbackNote = `rollback publication ${(rb.json as Record<string, unknown>)?.publication_id ?? "unknown"}, pump status ${String(pumpBody?.status ?? "unknown")}`;
        } else {
          await postgrestWrite(cfg, "PATCH", `content_documents?id=eq.${encodeURIComponent(workItem.content_id)}`, {
            status: "draft",
            published_version_id: null,
            updated_at: new Date().toISOString(),
          });
          rollbackNote = "unpublished (no previous version)";
        }
        await postgrestWrite(cfg, "POST", "factory_audit_events", {
          publication_id: publication.id,
          kind: "intervention",
          error: `${detail}; ${rollbackNote}`.slice(0, 1000),
        });
        await finishStep("blocked", "failed", "not_required", "auto_verify_failed", null, null);
        await blockWorkItem(workItem, "auto_verify_failed");
        await finishRun(1, 0, 1);
        return { kind: "respond", status: 200, body: {
          run_id: runId,
          status: "auto_verify_failed_rollback",
          work_item_id: workItem.id,
          step_key: claimed.step_key,
          attempt_no: claimed.attempt_count,
          rollback: rollbackNote,
        } };
      }
    } else if (claimed.step_key === "complete_work") {
      const completed = await internalPost(requestOrigin, `/api/internal/work-items/${encodeURIComponent(workItem.id)}/complete`, {});
      const result = completed.json as Record<string, unknown> | null;
      const wi = result?.work_item as { status?: string } | undefined;
      if (completed.status !== 200 || wi?.status !== "succeeded") {
        await finishStep("queued", "failed", "not_required", "complete_not_ready", null, null);
        await finishRun(1, 0, 0);
        return { kind: "respond", status: 200, body: {
          run_id: runId,
          status: "complete_not_ready",
          work_item_id: workItem.id,
          step_key: claimed.step_key,
          attempt_no: claimed.attempt_count,
        } };
      }
    }
  } catch (err) {
    if (err instanceof CrashAfterPublicationError) {
      // عمداً Step بسته نمی‌شود: Lease منقضی، Tick بعدی را بازیابی می‌کند.
      await postgrestWrite(cfg, "PATCH", `factory_runs?id=eq.${encodeURIComponent(runId)}`, {
        finished_at: new Date().toISOString(),
        run_status: "failed",
        items_claimed: 1,
        items_completed: 0,
        items_failed: 1,
      });
      return { kind: "respond", status: 500, body: {
          run_id: runId,
          status: "crash_after_publication",
          work_item_id: workItem.id,
          step_key: claimed.step_key,
          attempt_no: claimed.attempt_count,
          fencing_token: claimed.fencing_token,
        } };
    }
    if (isSimulatedCrash(err)) {
      // Crash شبیه‌سازی‌شدهٔ R3C-RECOVERY (artifact یا
      // artifact_registered): عمداً Step بسته نمی‌شود تا Tick
      // بعدی پس از انقضای Lease، از دیتابیس بازیابی کند.
      await postgrestWrite(cfg, "PATCH", `factory_runs?id=eq.${encodeURIComponent(runId)}`, {
        finished_at: new Date().toISOString(),
        run_status: "failed",
        items_claimed: 1,
        items_completed: 0,
        items_failed: 1,
      });
      return { kind: "respond", status: 500, body: {
          run_id: runId,
          status: `crash_after_${err.stage}`,
          work_item_id: workItem.id,
          step_key: claimed.step_key,
          attempt_no: claimed.attempt_count,
        } };
    }
    const message = err instanceof Error ? err.message : String(err);
    const exhausted = claimed.attempt_count >= claimed.max_attempts;
    await finishStep(exhausted ? "blocked" : "queued", "failed", "not_required", message.slice(0, 200), null, null);
    if (exhausted) await blockWorkItem(workItem, "attempts_exhausted");
    await finishRun(1, 0, 1);
    return { kind: "respond", status: 200, body: {
      run_id: runId,
      status: exhausted ? "attempts_exhausted" : "step_failed",
      error: message.slice(0, 300),
      work_item_id: workItem.id,
      step_key: claimed.step_key,
      attempt_no: claimed.attempt_count,
    } };
  }
  // کلید ناشناخته هم به همین completed با خروجی تهی می‌رسد؛
  // از راه مسیر، دست‌نیافتنی است، چون حلقهٔ کاندید مسیر، هر
  // Step ناشناخته یا ناهم‌خوان با Workflow را پیش از Claim، با
  // unknown_step_key مسدود می‌کند و هرگز Claimش نمی‌کند. رفتار
  // پیش از استخراج هم همین بود و عمداً عوض نشده است.
  return {
    kind: "completed",
    outputArtifactId,
    gatewayOperationId,
    gatewayHasExcess,
  };
}
