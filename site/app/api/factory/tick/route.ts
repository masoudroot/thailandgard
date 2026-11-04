import { NextRequest, NextResponse } from "next/server";
import {
  checkAuth,
  dbConfig,
  postgrestGet,
  postgrestRpc,
  postgrestWrite,
  type ApprovalRow,
  type ArtifactRow,
  type WorkItemRow,
} from "@/lib/factory/tick/internal-api";
import {
  isApprovalValidForPublish,
  isValidWorkItemTransition,
} from "@/lib/factory/tick/work-items";
import {
  AUTO_TICK_STEP_KEYS,
  AUTO_WORKFLOW_VERSION,
  GATEWAY_TICK_STEP_KEYS,
  GATEWAY_V2_TICK_STEP_KEYS,
  GATEWAY_V2_WORKFLOW_VERSION,
  GATEWAY_WORKFLOW_VERSION,
  TICK_STEP_KEYS,
  WORKFLOW_VERSION,
  evaluateKillSwitches,
  gatewayStepBlockReason,
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
import { patchOperation } from "@/lib/factory/gateway/operations";
import { runContentStep } from "@/lib/factory/handlers/content-runtime";

const RUNNER_VERSION = "r3c-tick-1";


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

    // بوت‌استرپ THG-RB-01: همان الگو، برای Workflow واقعی Gateway
    // نسخهٔ ۲. زنجیرهٔ ۳ Step این Workflow، هیچ قدم نسخه‌سازی یا
    // انتشار ندارد؛ پس از await_human_approval، چرخه می‌ایستد.
    const queuedGatewayV2WIs = (await postgrestGet(
      cfg,
      `factory_work_items?status=eq.queued&execution_mode=eq.tick_managed&workflow_version=eq.${GATEWAY_V2_WORKFLOW_VERSION}&created_at=gte.${encodeURIComponent(R2A1_SCOPE_CUTOFF)}&order=created_at.asc&select=id,work_key,status`,
    )) as WorkItemRow[];
    for (const wi of queuedGatewayV2WIs) {
      const existing = (await postgrestGet(
        cfg,
        `factory_work_steps?work_item_id=eq.${encodeURIComponent(wi.id)}&select=id&limit=1`,
      )) as unknown[];
      if (existing.length === 0) {
        await postgrestWrite(
          cfg,
          "POST",
          "factory_work_steps",
          GATEWAY_V2_TICK_STEP_KEYS.map((stepKey, index) => ({
            work_item_id: wi.id,
            step_key: stepKey,
            sequence_no: index + 1,
            status: "queued",
            max_attempts: stepMaxAttempts(stepKey),
            idempotency_key: `r3g-gateway-step-${wi.work_key}-${stepKey}`,
          })),
        );
        break;
      }
    }
    // بوت‌استرپ THG-AUTO-01: همان الگو، برای Workflow خودمختار.
    // زنجیرهٔ ۸ Step این Workflow، هیچ قدم تأیید انسانی ندارد؛
    // جای آن، auto_approve سیستمی و verify_publication نشسته است.
    const queuedAutoWIs = (await postgrestGet(
      cfg,
      `factory_work_items?status=eq.queued&execution_mode=eq.tick_managed&workflow_version=eq.${AUTO_WORKFLOW_VERSION}&created_at=gte.${encodeURIComponent(R2A1_SCOPE_CUTOFF)}&order=created_at.asc&select=id,work_key,status`,
    )) as WorkItemRow[];
    for (const wi of queuedAutoWIs) {
      const existing = (await postgrestGet(
        cfg,
        `factory_work_steps?work_item_id=eq.${encodeURIComponent(wi.id)}&select=id&limit=1`,
      )) as unknown[];
      if (existing.length === 0) {
        await postgrestWrite(
          cfg,
          "POST",
          "factory_work_steps",
          AUTO_TICK_STEP_KEYS.map((stepKey, index) => ({
            work_item_id: wi.id,
            step_key: stepKey,
            sequence_no: index + 1,
            status: "queued",
            max_attempts: stepMaxAttempts(stepKey),
            idempotency_key: `auto-step-${wi.work_key}-${stepKey}`,
          })),
        );
        break;
      }
    }
    // گارد دوم: Work Item tick_managed با نسخهٔ ناشناخته، با وضعیت
    // مشخص مسدود می‌شود، نه این‌که بی‌صدا در صف بماند یا با حدس
    // اجرا شود. بوت‌استرپ، فقط نسخهٔ پشتیبانی‌شده را Step می‌دهد،
    // پس این اسکن، همان گارد دوم است.
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
      // THG-UNIFY-01: gateway steps are judged by the generation gate
      // here, next to the publish_version data-publishing gate. A blocked
      // gateway step never gets claimed, so it can never reach a provider
      // call. The gate returns a status instead of blocking the work item,
      // exactly like the other candidate gates in this loop.
      const gatewayBlock = gatewayStepBlockReason(
        switches,
        stepWi.workflow_version,
        step.step_key,
      );
      if (gatewayBlock) {
        if (!gateStatus) {
          gateStatus = gatewayBlock;
          gateWorkItemId = step.work_item_id;
        }
        continue;
      }
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
    // قدم‌های Gateway، از این رزرو سطح مسیر معاف‌اند، چون
    // Gateway خودش رزرو می‌کند؛ رزرو دوباره، همان هزینه را دو بار می‌شمرد.
    if (testCostAmount > 0 && attemptId && claimed.step_key !== "generate_draft_mock" && claimed.step_key !== "generate_draft") {
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


    // THG-TEAM-ARCHITECTURE-01 فاز ۲، گام ۳: اجرای قدم محتوایی، به
    // Handler بیرون کشیده شده است؛ مسیر فقط نتیجه را برمی‌گرداند یا
    // دمِ Step را ادامه می‌دهد. هیچ منطقی این‌جا تکرار نمی‌شود.
    // runId، پس از گارد بالا، رشته است؛ const تازه، همان باریکه را
    // برای بستارهای Handler نگه می‌دارد (let در بستار، باریکه را از
    // دست می‌دهد و خطای نوع می‌دهد).
    const stepRunId: string = runId;
    const stepResult = await runContentStep({
      cfg,
      workItem,
      claimed,
      attemptId,
      runId,
      requestOrigin,
      switches,
      testCrashAfterPublication,
      finishStep,
      finishRun: (claimedCount, completed, failed) => finishRun(cfg, stepRunId, claimedCount, completed, failed),
      blockWorkItem: (wi, errorCode) => blockWorkItem(cfg, wi, errorCode),
    });
    if (stepResult.kind === "respond") {
      return NextResponse.json(stepResult.body, { status: stepResult.status });
    }
    const { outputArtifactId, gatewayOperationId, gatewayHasExcess } = stepResult;

    // قدم Gateway با اضافه‌هزینهٔ باز، تسویه‌اش را pending نگه
    // می‌دارد تا اپراتور، همان بدهی را تعیین تکلیف کند؛ قدم‌های
    // دیگر، مثل قبل not_required می‌مانند.
    const tailReconciliation =
      (claimed.step_key === "generate_draft_mock" || claimed.step_key === "generate_draft") && gatewayHasExcess ? "pending" : "not_required";
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
    if ((claimed.step_key === "generate_draft_mock" || claimed.step_key === "generate_draft") && gatewayOperationId) {
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
