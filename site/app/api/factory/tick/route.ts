import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  checkAuth,
  dbConfig,
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
  isValidWorkItemTransition,
  workItemPublishIdempotencyKey,
} from "@/lib/factory/tick/work-items";
import {
  GATEWAY_TICK_STEP_KEYS,
  GATEWAY_WORKFLOW_VERSION,
  TICK_STEP_KEYS,
  WORKFLOW_VERSION,
  evaluateKillSwitches,
  stepMaxAttempts,
  type AnyTickStepKey,
  type TickStepKey,
} from "@/lib/factory/tick/factory-tick";
import {
  DEFERRED_WORKFLOW_VERSIONS,
  R2A1_SCOPE_CUTOFF,
  adaptStepForTick,
  adaptWorkItemForTick,
} from "@/lib/factory/tick/adapter";
import { PostgrestBudgetLedger } from "@/lib/factory/gateway/ledger";
import { isSimulatedCrash } from "@/lib/factory/gateway/crash-test";
import { getLatestOperation, patchOperation } from "@/lib/factory/gateway/operations";
import {
  GatewayOperationError,
  gatewayLogicalOperationId,
  openGatewayOperation,
  runGatewayCallForOperation,
} from "@/lib/factory/tick/gateway-operation-run";

const RUNNER_VERSION = "r3c-tick-1";

/**
 * ثابت‌های قدم آزمایشی اتصال Gateway در R3C. پاراگراف پیش‌نویس،
 * قطعی و بی‌ضرر است و فقط برای نمایش اتصال ساخته می‌شود؛ محتوای
 * راهنما را تغییر نمی‌دهد و هیچ‌وقت منتشر نمی‌شود.
 */
const DEMO_DRAFT_PARAGRAPH =
  "این پاراگراف فقط برای نمایش آزمایشی اتصال تیک و موتور مدل ساخته شده و محتوای راهنما را تغییر نمی‌دهد.";
const DEMO_DRAFT_SCHEMA = z.object({ draft_paragraph: z.string().min(1) });

/** خطای Crash پس از Commit انتشار: Step، claimed و Attempt، started می‌ماند تا Tick بعدی پس از انقضای Lease بازیابی کند. */
class CrashAfterPublicationError extends Error {}

interface WorkStepRow {
  id: string;
  work_item_id: string;
  step_key: AnyTickStepKey;
  sequence_no: number;
  status: string;
  attempt_count: number;
  max_attempts: number;
  lease_owner: string | null;
  lease_until: string | null;
  fencing_token: number;
  scheduled_at: string;
  error_code: string | null;
}

interface AttemptRow {
  id: string;
  finish_status: string;
}





interface RunRow {
  id: string;
}

function firstParagraph(payload: PublishPayload): string {
  return payload.sections[0]?.paragraphs[0] ?? "";
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

async function finishRun(
  cfg: { url: string; serviceKey: string },
  runId: string,
  claimed: number,
  completed: number,
  failed: number,
): Promise<void> {
  await postgrestWrite(cfg, "PATCH", `factory_runs?id=eq.${encodeURIComponent(runId)}`, {
    finished_at: new Date().toISOString(),
    run_status: "completed",
    items_claimed: claimed,
    items_completed: completed,
    items_failed: failed,
  });
}

async function blockWorkItem(
  cfg: { url: string; serviceKey: string },
  workItem: WorkItemRow,
  errorCode: string,
): Promise<void> {
  if (!isValidWorkItemTransition(workItem.status as never, "blocked")) return;
  await postgrestWrite(cfg, "PATCH", `factory_work_items?id=eq.${encodeURIComponent(workItem.id)}`, {
    status: "blocked",
    last_error: errorCode,
    updated_at: new Date().toISOString(),
  });
}

/**
 * POST /api/factory/tick
 * یک Tick مستقل و قابل‌بازیابی برای مسیر رسمی محتوا (guide_content_v1)
 * در R2. فقط با INTERNAL_PUBLISH_TOKEN؛ روی Preview، پشت SSO ورسل هم
 * هست. هیچ وضعیتی در حافظهٔ فرایند نگه داشته نمی‌شود؛ همه‌چیز در
 * دیتابیس است و Tick بعدی، از همان‌جا ادامه می‌دهد. در هر Tick،
 * حداکثر یک Step اجرا می‌شود. فراخوانی‌های داخلی (process-outbox و
 * complete) به origin همان درخواست می‌روند، نه localhost ثابت، تا روی
 * سرور Muse و روی Preview ورسل، هر دو کار کنند. کار Shadow
 * (source_shadow_v1) در R2 اجرا نمی‌شود و مسدود هم نمی‌شود.
 *
 * ترتیب Tick:
 * ۱) Kill Switchها Fail-closed خوانده می‌شوند؛
 * ۲) یک Run ثبت می‌شود؛
 * ۳) اگر Work Item تازهٔ tick_managed با نسخهٔ پشتیبانی‌شده، بدون Step
 *    هست، زنجیرهٔ ۸ Step نسخهٔ guide_content_v1 ساخته می‌شود؛
 *    Work Itemهای manual، هرگز بوت‌استرپ نمی‌شوند؛
 * ۴) Step آماده (پیش‌نیازها succeeded) اتمیک Claim می‌شود، فقط وقتی
 *    Work Item، tick_managed با نسخهٔ پشتیبانی‌شده باشد و Step، از
 *    همان نسخه باشد؛
 * ۵) گیت‌های awaiting_approval و publishing، پیش از Claim بررسی می‌شوند
 *    و بدون مصرف Attempt، Tick را با همان وضعیت برمی‌گردانند؛
 * ۶) Step اجرا می‌شود؛ انتشار، فقط با همان RPC اتمیک M4 و Outbox، فقط
 *    در Step جداگانهٔ process_publication پردازش می‌شود، هرگز در همان
 *    تراکنش انتشار؛
 * ۷) پایان Step با Fencing ثبت می‌شود و Run خاتمه می‌یابد.
 *
 * قاعدهٔ Scope در R2A.1: فقط Work Item ساخته‌شده پس از
 * R2A1_SCOPE_CUTOFF (شروع مأموریت R2A.1) وارد Tick می‌شود؛ کار
 * تاریخی، در بوت‌استرپ، در اسکن نسخهٔ ناشناخته و در انتخاب کاندید،
 * بی‌صدا رد می‌شود و وضعیتش دست نمی‌خورد. ترتیب گیت‌ها:
 * deferred، بعد out_of_scope، بعد وضعیت پایانی، بعد manual، بعد
 * نسخهٔ ناشناخته، بعد Step.
 *
 * Test Hookها فقط وقتی M2_TEST_HOOKS_ENABLED=true است، آن هم فقط در
 * Staging، عمل می‌کنند: test_step_fail، test_step_timeout،
 * test_cost_amount، test_crash_after_publication.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!process.env.INTERNAL_PUBLISH_TOKEN) {
    return NextResponse.json({ error: "factory tick not configured" }, { status: 503 });
  }
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const cfg = dbConfig();
  if (!cfg) {
    return NextResponse.json({ error: "factory tick not configured" }, { status: 503 });
  }
  const forwardedProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const host = req.headers.get("host");
  const requestOrigin = host ? `${forwardedProto ?? "http"}://${host}` : "http://127.0.0.1:3100";

  const body: Record<string, unknown> = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const hooksEnabled = process.env.M2_TEST_HOOKS_ENABLED === "true";
  const executorKey = typeof body.executor_key === "string" && body.executor_key ? body.executor_key : "tick-executor-1";
  const leaseSeconds = typeof body.lease_seconds === "number" && body.lease_seconds > 0 ? body.lease_seconds : 300;
  const requestId = typeof body.request_id === "string" && body.request_id ? body.request_id : crypto.randomUUID();
  const testStepFail = hooksEnabled && body.test_step_fail === true;
  const testStepTimeout = hooksEnabled && body.test_step_timeout === true;
  const testCrashAfterClaim = hooksEnabled && body.test_crash_after_claim === true;
  const testCostAmount = hooksEnabled && typeof body.test_cost_amount === "number" ? (body.test_cost_amount as number) : 0;
  const testCrashAfterPublication = hooksEnabled && body.test_crash_after_publication === true;
  let runId: string | null = null;
  try {
    const settingsRows = (await postgrestGet(cfg, "factory_settings?select=key,value")) as { key: string; value: string }[];
    const settings: Record<string, string> = {};
    for (const row of settingsRows) settings[row.key] = row.value;
    const switches = evaluateKillSwitches(settings);

    const runs = (await postgrestWrite(cfg, "POST", "factory_runs", {
      trigger_type: "manual",
      runner_version: RUNNER_VERSION,
      run_status: "running",
      items_claimed: 0,
      items_completed: 0,
      items_failed: 0,
      request_id: requestId,
    })) as RunRow[];
    runId = runs[0]?.id ?? null;
    if (!runId) return NextResponse.json({ error: "run was not created" }, { status: 500 });

    if (switches.factoryPaused) {
      await finishRun(cfg, runId, 0, 0, 0);
      return NextResponse.json({ run_id: runId, status: "factory_paused", claimed: 0 });
    }

    // بوت‌استرپ M6: فقط Work Itemهای tick_managed با نسخهٔ پشتیبانی‌شده
    // که هنوز Step ندارند، زنجیرهٔ ۸ Step می‌گیرند. محدودیت کلیدی
    // mvp01-m5-* از مسیر اصلی حذف شد و جایش را قرارداد عمومی گرفت؛
    // Work Itemهای manual، از جمله همهٔ کارهای قدیمی، عمداً بوت‌استرپ
    // نمی‌شوند تا Tick، کار خارج از Workflow را خودبه‌خود جلو نبرد.
    // قاعدهٔ Scope در R2A.1: بوت‌استرپ، فقط ساخته‌شده پس از برش
    // R2A1_SCOPE_CUTOFF را Step می‌دهد؛ کار تاریخی، هرگز زنجیره نمی‌گیرد.
    const queuedWorkItems = (await postgrestGet(
      cfg,
      `factory_work_items?status=eq.queued&execution_mode=eq.tick_managed&workflow_version=eq.${WORKFLOW_VERSION}&created_at=gte.${encodeURIComponent(R2A1_SCOPE_CUTOFF)}&order=created_at.asc&select=id,work_key,status`,
    )) as WorkItemRow[];
    for (const wi of queuedWorkItems) {
      const existing = (await postgrestGet(
        cfg,
        `factory_work_steps?work_item_id=eq.${encodeURIComponent(wi.id)}&select=id&limit=1`,
      )) as unknown[];
      if (existing.length === 0) {
        await postgrestWrite(
          cfg,
          "POST",
          "factory_work_steps",
          TICK_STEP_KEYS.map((stepKey, index) => ({
            work_item_id: wi.id,
            step_key: stepKey,
            sequence_no: index + 1,
            status: "queued",
            max_attempts: stepMaxAttempts(stepKey),
            idempotency_key: `mvp01-m6-step-${wi.work_key}-${stepKey}`,
          })),
        );
        break;
      }
    }

    // بوت‌استرپ R3C: همان الگو، فقط برای Workflow آزمایشی Gateway.
    // زنجیرهٔ ۴ Step این Workflow، هیچ قدم نسخه‌سازی یا انتشار
    // ندارد؛ پس از await_human_approval، چرخه می‌ایستد و نسخه یا
    // Publication ساخته نمی‌شود. قانون Scope مربوط به cutoff، این‌جا
    // هم عین مسیر رسمی اعمال می‌شود.
    const queuedGatewayWIs = (await postgrestGet(
      cfg,
      `factory_work_items?status=eq.queued&execution_mode=eq.tick_managed&workflow_version=eq.${GATEWAY_WORKFLOW_VERSION}&created_at=gte.${encodeURIComponent(R2A1_SCOPE_CUTOFF)}&order=created_at.asc&select=id,work_key,status`,
    )) as WorkItemRow[];
    for (const wi of queuedGatewayWIs) {
      const existing = (await postgrestGet(
        cfg,
        `factory_work_steps?work_item_id=eq.${encodeURIComponent(wi.id)}&select=id&limit=1`,
      )) as unknown[];
      if (existing.length === 0) {
        await postgrestWrite(
          cfg,
          "POST",
          "factory_work_steps",
          GATEWAY_TICK_STEP_KEYS.map((stepKey, index) => ({
            work_item_id: wi.id,
            step_key: stepKey,
            sequence_no: index + 1,
            status: "queued",
            max_attempts: stepMaxAttempts(stepKey),
            idempotency_key: `r3c-gateway-step-${wi.work_key}-${stepKey}`,
          })),
        );
        break;
      }
    }

    // قرارداد M6: Work Item tick_managed با نسخهٔ ناشناخته، حتی اگر
    // Step هم نداشته باشد، با وضعیت مشخص مسدود می‌شود، نه این‌که
    // بی‌صدا در صف بماند یا با حدس اجرا شود. بوت‌استرپ، فقط نسخهٔ
    // پشتیبانی‌شده را Step می‌دهد، پس این اسکن، همان گارد دوم است.
    const unknownWorkflowWIs = (await postgrestGet(
      cfg,
      "factory_work_items?status=eq.queued&execution_mode=eq.tick_managed&select=id,work_key,status,workflow_version,created_at",
    )) as WorkItemRow[];
    for (const wi of unknownWorkflowWIs) {
      // گارد دوم، از Adapter واحد: deferred و out_of_scope بی‌صدا رد
      // می‌شوند، نسخهٔ ناشناخته با وضعیت مشخص مسدود می‌شود، نسخهٔ
      // پشتیبانی‌شده کاری ندارد. کار تاریخی، حتی با نسخهٔ ناشناخته،
      // به‌جای مسدود شدن، فقط رد می‌شود.
      const decision = adaptWorkItemForTick({
        execution_mode: "tick_managed",
        workflow_version: wi.workflow_version,
        created_at: wi.created_at,
      });
      if (decision === "deferred") continue;
      if (decision === "out_of_scope") continue;
      if (decision === "unsupported_workflow") {
        await blockWorkItem(cfg, wi, "unsupported_workflow_version");
      }
    }

    // انتخاب Step آماده: اولین queued که همهٔ پیش‌نیازهایش succeeded‌اند،
    // یا claimed با Lease منقضی که Claim بعدی، آن را بازیابی می‌کند.
    const queuedSteps = (await postgrestGet(
      cfg,
      "factory_work_steps?status=in.(queued,claimed)&order=created_at.asc&select=*",
    )) as WorkStepRow[];
    let candidate: WorkStepRow | null = null;
    let gateStatus: string | null = null;
    let gateWorkItemId: string | null = null;
    for (const step of queuedSteps) {
      // Step با زمان‌بندی آینده یا سقف Attempt ردشده، کاندید نیست.
      if (step.attempt_count >= step.max_attempts) continue;
      if (new Date(step.scheduled_at).getTime() > Date.now()) continue;
      if (step.status === "claimed") {
        // Lease زنده، یعنی مالک معتبر دارد؛ فقط Lease منقضی قابل بازیابی است.
        if (!step.lease_until || new Date(step.lease_until).getTime() > Date.now()) continue;
      }
      // قرارداد M6، پیش از هر Claim: Work Item قدم، اول خوانده می‌شود.
      // manual، بی‌صدا رد می‌شود؛ خارج از Scope (پیش از برش R2A.1)
      // هم، بی‌صدا رد می‌شود؛ مسدود، لغوشده یا موفق هم، Step قابل
      // Claim ندارد. tick_managed با نسخهٔ ناشناخته، بدون اجرا با حدس،
      // با وضعیت مشخص مسدود می‌شود؛ Step ناشناخته هم، همین‌طور.
      const stepWiRows = (await postgrestGet(
        cfg,
        `factory_work_items?id=eq.${encodeURIComponent(step.work_item_id)}&select=*`,
      )) as WorkItemRow[];
      const stepWi = stepWiRows[0];
      if (!stepWi) continue;
      // گیت‌های ورود، از Adapter واحد (R2-A): deferred و manual یا
      // قدیمی، بی‌صدا رد می‌شوند؛ tick_managed با نسخهٔ ناشناخته،
      // با وضعیت مشخص مسدود می‌شود. رفتار، عین R2 است؛ فقط محل
      // تصمیم، یک‌جا شده است.
      const workItemDecision = adaptWorkItemForTick(stepWi);
      if (workItemDecision === "deferred") continue;
      if (workItemDecision === "out_of_scope") continue;
      if (stepWi.status === "blocked" || stepWi.status === "cancelled" || stepWi.status === "succeeded") continue;
      if (workItemDecision === "manual_or_legacy") continue;
      if (workItemDecision === "unsupported_workflow") {
        await blockWorkItem(cfg, stepWi, "unsupported_workflow_version");
        if (!gateStatus) {
          gateStatus = "unsupported_workflow";
          gateWorkItemId = step.work_item_id;
        }
        continue;
      }
      // Step، باید شناخته‌شده و متعلق به همان Workflow باشد که Work
      // Item دارد؛ جز این، با همان رفتار Step ناشناخته برخورد
      // می‌شود: مسدود، بدون اجرا با حدس.
      if (adaptStepForTick(step.step_key, stepWi.workflow_version) !== "eligible") {
        await blockWorkItem(cfg, stepWi, "unknown_step_key");
        if (!gateStatus) {
          gateStatus = "unknown_step_key";
          gateWorkItemId = step.work_item_id;
        }
        continue;
      }
      const siblings = (await postgrestGet(
        cfg,
        `factory_work_steps?work_item_id=eq.${encodeURIComponent(step.work_item_id)}&select=step_key,sequence_no,status&order=sequence_no.asc`,
      )) as WorkStepRow[];
      const predecessorsDone = siblings
        .filter((s) => s.sequence_no < step.sequence_no)
        .every((s) => s.status === "succeeded");
      if (!predecessorsDone) continue;
      if (step.step_key === "await_human_approval") {
        const wis = (await postgrestGet(
          cfg,
          `factory_work_items?id=eq.${encodeURIComponent(step.work_item_id)}&select=*`,
        )) as WorkItemRow[];
        const wi = wis[0];
        let valid = false;
        if (wi && wi.result_artifact_id) {
          const artifacts = (await postgrestGet(
            cfg,
            `factory_artifacts?id=eq.${encodeURIComponent(wi.result_artifact_id)}&select=*`,
          )) as ArtifactRow[];
          const approvals = (await postgrestGet(
            cfg,
            `factory_approvals?work_item_id=eq.${encodeURIComponent(wi.id)}&decision=eq.approved&order=created_at.desc&select=*`,
          )) as ApprovalRow[];
          const approval = approvals[0];
          valid =
            artifacts.length > 0 &&
            approval !== undefined &&
            isApprovalValidForPublish({
              workItemStatus: wi.status as never,
              workItemArtifactId: wi.result_artifact_id,
              approvalArtifactId: approval.artifact_id,
              approvalArtifactHash: approval.artifact_hash,
              artifactHash: artifacts[0].artifact_hash,
              approvalDecision: "approved",
            });
        }
        if (!valid) {
          // گیت، این Step را رد می‌کند ولی Stepهای آمادهٔ Work Itemهای
          // دیگر را نمی‌بندد؛ اگر کاندید دیگری نبود، همین گیت برگردانده می‌شود.
          if (!gateStatus) {
            gateStatus = "awaiting_human_approval";
            gateWorkItemId = step.work_item_id;
          }
          continue;
        }
      }
      if (step.step_key === "publish_version" && !switches.dataPublishingEnabled) {
        if (!gateStatus) {
          gateStatus = "publishing_disabled";
          gateWorkItemId = step.work_item_id;
        }
        continue;
      }
      candidate = step;
      break;
    }

    if (candidate) {
      // کاندید پیدا شد؛ گیت‌های Work Itemهای دیگر، Tick را متوقف نمی‌کنند.
    } else if (gateStatus) {
      await finishRun(cfg, runId, 0, 0, 0);
      return NextResponse.json({ run_id: runId, status: gateStatus, work_item_id: gateWorkItemId, claimed: 0 });
    }
    if (!candidate) {
      await finishRun(cfg, runId, 0, 0, 0);
      return NextResponse.json({ run_id: runId, status: "no_work", processed: 0, claimed: 0 });
    }

    // Claim اتمیک؛ بازیابی Lease منقضی هم داخل همان تابع است.
    const claimedRows = (await postgrestRpc(cfg, "claim_work_step_by_id", {
      p_step_id: candidate.id,
      p_executor: executorKey,
      p_lease_seconds: leaseSeconds,
    })) as WorkStepRow[] | null;
    const claimed = Array.isArray(claimedRows) ? claimedRows[0] : null;
    if (!claimed) {
      await finishRun(cfg, runId, 0, 0, 0);
      return NextResponse.json({ run_id: runId, status: "no_work", reason: "claim raced or step not ready", claimed: 0 });
    }

    const attempts = (await postgrestWrite(cfg, "POST", "factory_attempts", {
      work_item_id: claimed.work_item_id,
      work_step_id: claimed.id,
      attempt_no: claimed.attempt_count,
      executor_key: executorKey,
      finish_status: "started",
      reconciliation_status: "not_required",
      estimated_cost: testCostAmount,
      actual_cost: 0,
    })) as AttemptRow[];
    const attemptId = attempts[0]?.id ?? null;

    const finishStep = async (
      newStatus: string,
      finishStatus: string,
      reconciliation: string,
      errorCode: string | null,
      outputArtifactId: string | null,
      scheduledAt: string | null,
    ): Promise<boolean> => {
      const rows = (await postgrestRpc(cfg, "finish_work_step", {
        p_step_id: claimed.id,
        p_fencing_token: claimed.fencing_token,
        p_lease_owner: executorKey,
        p_new_status: newStatus,
        p_finish_status: finishStatus,
        p_reconciliation_status: reconciliation,
        p_error_code: errorCode,
        p_output_artifact_id: outputArtifactId,
        p_scheduled_at: scheduledAt,
      })) as WorkStepRow[] | null;
      return Array.isArray(rows) && rows.length > 0;
    };

    const workItems = (await postgrestGet(
      cfg,
      `factory_work_items?id=eq.${encodeURIComponent(claimed.work_item_id)}&select=*`,
    )) as WorkItemRow[];
    const workItem = workItems[0];
    if (!workItem) throw new Error("work item not found for claimed step");

    if (testCrashAfterClaim) {
      // عمداً Step بسته نمی‌شود: Claim و Attempt ثبت شده‌اند و Worker مرده است.
      await postgrestWrite(cfg, "PATCH", `factory_runs?id=eq.${encodeURIComponent(runId)}`, {
        finished_at: new Date().toISOString(),
        run_status: "failed",
        items_claimed: 1,
        items_completed: 0,
        items_failed: 1,
      });
      return NextResponse.json(
        {
          run_id: runId,
          status: "crash_after_claim",
          work_item_id: workItem.id,
          step_key: claimed.step_key,
          attempt_no: claimed.attempt_count,
          fencing_token: claimed.fencing_token,
        },
        { status: 500 },
      );
    }

    // رزرو بودجه فقط برای Step هزینه‌دار آزمایشی؛ Stepهای قطعی، صفرند و رزرو نمی‌خواهند.
    // قدم generate_draft_mock، از این رزرو سطح مسیر معاف است، چون
    // Gateway خودش رزرو می‌کند؛ رزرو دوباره، همان هزینه را دو بار می‌شمرد.
    if (testCostAmount > 0 && attemptId && claimed.step_key !== "generate_draft_mock") {
      const reserved = (await postgrestRpc(cfg, "reserve_budget", {
        p_work_item_id: workItem.id,
        p_attempt_id: attemptId,
        p_amount: testCostAmount,
      })) as boolean;
      if (!reserved) {
        await finishStep("blocked", "failed", "not_required", "budget_exhausted", null, null);
        await blockWorkItem(cfg, workItem, "budget_exhausted");
        await finishRun(cfg, runId, 1, 0, 1);
        return NextResponse.json({
          run_id: runId,
          status: "budget_exhausted",
          work_item_id: workItem.id,
          step_key: claimed.step_key,
          attempt_no: claimed.attempt_count,
        });
      }
    }

    if (testStepTimeout) {
      await finishStep("blocked", "timeout", "pending", "step_timeout", null, null);
      await blockWorkItem(cfg, workItem, "step_timeout");
      await finishRun(cfg, runId, 1, 0, 1);
      return NextResponse.json({
        run_id: runId,
        status: "step_timeout",
        work_item_id: workItem.id,
        step_key: claimed.step_key,
        attempt_no: claimed.attempt_count,
      });
    }
    if (testStepFail) {
      const exhausted = claimed.attempt_count >= claimed.max_attempts;
      await finishStep(exhausted ? "blocked" : "queued", "failed", "not_required", "test_step_fail", null, null);
      if (exhausted) await blockWorkItem(cfg, workItem, "attempts_exhausted");
      await finishRun(cfg, runId, 1, 0, 1);
      return NextResponse.json({
        run_id: runId,
        status: exhausted ? "attempts_exhausted" : "step_failed",
        work_item_id: workItem.id,
        step_key: claimed.step_key,
        attempt_no: claimed.attempt_count,
      });
    }

    let outputArtifactId: string | null = null;
    // ردیاب R3C برای قدم Gateway: شناسهٔ عملیات Gateway که این Tick
    // ثبت کرده و آیا تسویه، اضافه‌هزینهٔ باز دارد؛ دمِ مسیر، عملیات
    // را settled می‌کند و تسویه را با وضعیت درست ثبت می‌کند.
    let gatewayOperationId: string | null = null;
    let gatewayHasExcess = false;
    try {
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
            await finishRun(cfg, runId, 1, 0, 0);
            return NextResponse.json({
              run_id: runId,
              status: opened.kind === "blocked" && opened.reason === "debt_open" ? "gateway_debt_open" : "gateway_operation_open",
              work_item_id: workItem.id,
              step_key: claimed.step_key,
              attempt_no: claimed.attempt_count,
            });
          }
          if (opened.kind === "replayed") {
            // عملیات پایانی با همان کلید: بدون فراخوان تازه. اگر
            // خروجی ذخیره‌شده، پاراگراف دارد، Artifact از همان
            // خروجی قطعی بازسازی می‌شود؛ وگرنه قدم، مسدود می‌شود.
            const stored = opened.operation.response_json as { output?: { draft_paragraph?: string } } | null;
            const paragraph = stored?.output?.draft_paragraph;
            if (!paragraph) {
              await finishStep("blocked", "failed", "not_required", "gateway_operation_terminal", null, null);
              await blockWorkItem(cfg, workItem, "gateway_operation_terminal");
              await finishRun(cfg, runId, 1, 0, 1);
              return NextResponse.json({
                run_id: runId,
                status: "gateway_operation_terminal",
                work_item_id: workItem.id,
                step_key: claimed.step_key,
                attempt_no: claimed.attempt_count,
              });
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
                  mockConfig: {
                    mode: "ok",
                    output: { draft_paragraph: DEMO_DRAFT_PARAGRAPH },
                    promptTokens: 10,
                    completionTokens: 5,
                    costPerToken: 2,
                  },
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
                return NextResponse.json(
                  {
                    run_id: runId,
                    status: "crash_after_gateway_reservation",
                    work_item_id: workItem.id,
                    step_key: claimed.step_key,
                    attempt_no: claimed.attempt_count,
                  },
                  { status: 500 },
                );
              }
              throw error;
            }
            if (run.kind === "unknown") {
              gatewayOperationId = run.operation.id;
              await finishStep("blocked", "outcome_unknown", "pending", "timeout", null, null);
              await finishRun(cfg, runId, 1, 0, 1);
              return NextResponse.json({
                run_id: runId,
                status: "gateway_outcome_unknown",
                work_item_id: workItem.id,
                step_key: claimed.step_key,
                attempt_no: claimed.attempt_count,
              });
            }
            if (run.kind === "failed") {
              const code = run.response.error?.code ?? "provider_error";
              gatewayOperationId = run.operation.id;
              if (code === "budget_not_configured" || code === "budget_exceeded") {
                await finishStep("blocked", "failed", "not_required", "budget_exhausted", null, null);
                await blockWorkItem(cfg, workItem, "budget_exhausted");
                await finishRun(cfg, runId, 1, 0, 1);
                return NextResponse.json({
                  run_id: runId,
                  status: "budget_exhausted",
                  work_item_id: workItem.id,
                  step_key: claimed.step_key,
                  attempt_no: claimed.attempt_count,
                });
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
            outputArtifactId = await createGuideEditArtifact(cfg, workItem, "content_draft_demo", draft.draft_paragraph);
          }
        }
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
          await finishRun(cfg, runId, 1, 0, 0);
          return NextResponse.json({
            run_id: runId,
            status: "awaiting_human_approval",
            work_item_id: workItem.id,
            step_key: claimed.step_key,
            attempt_no: claimed.attempt_count,
          });
        }
      } else if (claimed.step_key === "create_version") {
        if (!workItem.result_artifact_id) throw new Error("work item has no artifact");
        const artifacts = (await postgrestGet(
          cfg,
          `factory_artifacts?id=eq.${encodeURIComponent(workItem.result_artifact_id)}&select=*`,
        )) as ArtifactRow[];
        if (artifacts.length === 0) throw new Error("artifact not found");
        const created = (await postgrestRpc(cfg, "create_approved_version", {
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
      } else if (claimed.step_key === "process_publication") {
        if (!workItem.publication_id) throw new Error("work item has no publication");
        const pubs = (await postgrestGet(
          cfg,
          `factory_publications?id=eq.${encodeURIComponent(workItem.publication_id)}&select=*`,
        )) as PublicationRow[];
        if (pubs.length > 0 && pubs[0].status === "verified") {
          // از قبل verified است؛ Step موفق می‌شود.
        } else {
          const processed = await internalPost(requestOrigin, "/api/internal/process-outbox", {});
          const result = processed.json as Record<string, unknown> | null;
          if (result && result.status === "verified") {
            // موفق؛ Step پایین‌تر succeeded می‌شود.
          } else if (result && result.status === "needs_intervention") {
            await finishStep("blocked", "failed", "needs_intervention", "publication_needs_intervention", null, null);
            await blockWorkItem(cfg, workItem, "publication_needs_intervention");
            await finishRun(cfg, runId, 1, 0, 1);
            return NextResponse.json({
              run_id: runId,
              status: "publication_needs_intervention",
              work_item_id: workItem.id,
              step_key: claimed.step_key,
              attempt_no: claimed.attempt_count,
            });
          } else {
            const nextAttempt = typeof result?.next_attempt_at === "string" ? (result.next_attempt_at as string) : null;
            await finishStep("queued", "failed", "not_required", "verification_pending", null, nextAttempt);
            await finishRun(cfg, runId, 1, 0, 0);
            return NextResponse.json({
              run_id: runId,
              status: "verification_pending",
              work_item_id: workItem.id,
              step_key: claimed.step_key,
              attempt_no: claimed.attempt_count,
              next_attempt_at: nextAttempt,
            });
          }
        }
      } else if (claimed.step_key === "complete_work") {
        const completed = await internalPost(requestOrigin, `/api/internal/work-items/${encodeURIComponent(workItem.id)}/complete`, {});
        const result = completed.json as Record<string, unknown> | null;
        const wi = result?.work_item as { status?: string } | undefined;
        if (completed.status !== 200 || wi?.status !== "succeeded") {
          await finishStep("queued", "failed", "not_required", "complete_not_ready", null, null);
          await finishRun(cfg, runId, 1, 0, 0);
          return NextResponse.json({
            run_id: runId,
            status: "complete_not_ready",
            work_item_id: workItem.id,
            step_key: claimed.step_key,
            attempt_no: claimed.attempt_count,
          });
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
        return NextResponse.json(
          {
            run_id: runId,
            status: "crash_after_publication",
            work_item_id: workItem.id,
            step_key: claimed.step_key,
            attempt_no: claimed.attempt_count,
            fencing_token: claimed.fencing_token,
          },
          { status: 500 },
        );
      }
      const message = err instanceof Error ? err.message : String(err);
      const exhausted = claimed.attempt_count >= claimed.max_attempts;
      await finishStep(exhausted ? "blocked" : "queued", "failed", "not_required", message.slice(0, 200), null, null);
      if (exhausted) await blockWorkItem(cfg, workItem, "attempts_exhausted");
      await finishRun(cfg, runId, 1, 0, 1);
      return NextResponse.json({
        run_id: runId,
        status: exhausted ? "attempts_exhausted" : "step_failed",
        error: message.slice(0, 300),
        work_item_id: workItem.id,
        step_key: claimed.step_key,
        attempt_no: claimed.attempt_count,
      });
    }

    // قدم Gateway با اضافه‌هزینهٔ باز، تسویه‌اش را pending نگه
    // می‌دارد تا اپراتور، همان بدهی را تعیین تکلیف کند؛ قدم‌های
    // دیگر، مثل قبل not_required می‌مانند.
    const tailReconciliation =
      claimed.step_key === "generate_draft_mock" && gatewayHasExcess ? "pending" : "not_required";
    const finished = await finishStep("succeeded", "succeeded", tailReconciliation, null, outputArtifactId, null);
    if (!finished) {
      await finishRun(cfg, runId, 1, 0, 1);
      return NextResponse.json({
        run_id: runId,
        status: "stale_fencing",
        work_item_id: workItem.id,
        step_key: claimed.step_key,
        attempt_no: claimed.attempt_count,
      });
    }
    // دمِ R3C: عملیات Gateway که این Tick ثبت کرده، پس از این‌که
    // نتیجه‌اش به Work Item برگشت، settled می‌شود. اگر این وصله
    // بخورد، عملیات در settled_unreturned می‌ماند و بازیابی، همان
    // را از دیتابیس به settled می‌رساند (قدم، از پیش succeeded است).
    if (claimed.step_key === "generate_draft_mock" && gatewayOperationId) {
      await patchOperation(cfg, gatewayOperationId, { state: "settled" });
    }
    await finishRun(cfg, runId, 1, 1, 0);
    return NextResponse.json({
      run_id: runId,
      status: "step_succeeded",
      work_item_id: workItem.id,
      step_key: claimed.step_key,
      attempt_no: claimed.attempt_count,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (runId) {
      try {
        await postgrestWrite(cfg, "PATCH", `factory_runs?id=eq.${encodeURIComponent(runId)}`, {
          finished_at: new Date().toISOString(),
          run_status: "failed",
          items_claimed: 0,
          items_completed: 0,
          items_failed: 1,
        });
      } catch {
        // خطای ثبت Run، خطای اصلی را نمی‌پوشاند.
      }
    }
    return NextResponse.json({ error: message.slice(0, 300) }, { status: 500 });
  }
}
