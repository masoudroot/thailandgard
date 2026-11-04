import { NextRequest, NextResponse } from "next/server";
import { checkAuth, dbConfig, postgrestGet, postgrestWrite, type ApprovalRow, type ArtifactRow, type WorkItemRow } from "@/lib/factory/tick/internal-api";
import { isReviewLimitReached, isValidApprovalDecision, isValidWorkItemTransition, statusAfterApproval, type WorkItemStatus } from "@/lib/factory/tick/work-items";

/**
 * POST /api/internal/work-items/[id]/approvals
 * ثبت تصمیم انسانی روی یک Artifact و Hash دقیق آن. فقط localhost و
 * فقط با INTERNAL_PUBLISH_TOKEN. Work Item باید awaiting_approval باشد
 * و Artifact باید متعلق به همان Work Item باشد و Hash داده‌شده باید با
 * Hash ثبت‌شدهٔ Artifact بخواند؛ وگرنه تصمیم ثبت نمی‌شود. تأیید،
 * Work Item را approved و رد، آن را blocked می‌کند و دلیل رد در
 * Approval و last_error ثبت می‌شود. تصمیم، محتوای Artifact را تغییر
 * نمی‌دهد و به Artifact یا Hash دیگر منتقل نمی‌شود.
 *
 * هویت بازبین، فقط سروری است (SECURITY-CAP): از env سروری
 * ADMIN_USERNAME می‌آید، هرگز از بدنهٔ درخواست. این مسیر، نشست
 * مرورگری ندارد (داشبورد آن را سروربه‌سرور و فقط با توکن داخلی صدا
 * می‌زند)، پس نشست ادمینیِ قابل‌اثبات این‌جا در دسترس نیست و منبع
 * هویت، همان envای است که مسیر داشبورد از پیش با
 * reviewerIdentity() استفاده می‌کرد. reviewer_id فرستاده‌شده در بدنه،
 * نادیده گرفته می‌شود.
 */
function serverReviewerIdentity(): string {
  const username = process.env.ADMIN_USERNAME?.trim();
  return username ? username : "admin";
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  if (!process.env.INTERNAL_PUBLISH_TOKEN) {
    return NextResponse.json({ error: "work items not configured" }, { status: 503 });
  }
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const cfg = dbConfig();
  if (!cfg) {
    return NextResponse.json({ error: "work items not configured" }, { status: 503 });
  }
  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "body must be an object" }, { status: 400 });
  }
  const input = body as Record<string, unknown>;
  const artifactId = typeof input.artifact_id === "string" ? input.artifact_id : "";
  const artifactHash = typeof input.artifact_hash === "string" ? input.artifact_hash : "";
  const decision = input.decision;
  // هویت بازبین، فقط سروری است؛ reviewer_id بدنه نادیده گرفته می‌شود.
  const reviewerId = serverReviewerIdentity();
  const reason = typeof input.decision_reason === "string" ? input.decision_reason : null;
  // THG-TEAM-ARCHITECTURE-01 P2 step 2: معنای تازهٔ factory_approvals.
  // سطر approval می‌تواند معنای بازبینی را هم حمل کند؛ این سه فیلد
  // اختیاری‌اند و وقتی فرستنده‌ای ندارد، NULL می‌مانند. واژگان
  // review_type هنوز آزاد است (بستهٔ پیگیری گام ۱، Q11) و این‌جا هیچ
  // مقداری اختراع نمی‌شود؛ فقط آن‌چه بازبینی واقعاً داده، ثبت می‌شود.
  const reviewType =
    typeof input.review_type === "string" && input.review_type.trim().length > 0
      ? input.review_type.trim()
      : null;
  const severity =
    typeof input.severity === "string" && input.severity.trim().length > 0 ? input.severity.trim() : null;
  let confidence: number | null = null;
  if (input.confidence !== undefined && input.confidence !== null) {
    if (typeof input.confidence !== "number" || !Number.isFinite(input.confidence) || input.confidence < 0 || input.confidence > 1) {
      return NextResponse.json({ error: "confidence must be a number between 0 and 1" }, { status: 400 });
    }
    confidence = input.confidence;
  }
  if (artifactId.length === 0 || artifactHash.length === 0) {
    return NextResponse.json({ error: "artifact_id and artifact_hash are required" }, { status: 400 });
  }
  if (!isValidApprovalDecision(decision)) {
    return NextResponse.json({ error: "decision must be approved or rejected" }, { status: 400 });
  }
  try {
    const workItems = (await postgrestGet(
      cfg,
      `factory_work_items?id=eq.${encodeURIComponent(id)}&select=*`,
    )) as WorkItemRow[];
    if (workItems.length === 0) return NextResponse.json({ error: "work item not found" }, { status: 404 });
    const workItem = workItems[0];
    if (workItem.status !== "awaiting_approval") {
      return NextResponse.json({ error: `work item is not awaiting_approval (status ${workItem.status})` }, { status: 409 });
    }
    // M5: حداکثر ۳ دور بازبینی برای یک Work Item؛ دور چهارم ثبت نمی‌شود
    // تا چرخهٔ تأیید/رد بی‌نهایت نشود. شمارش، همهٔ تصمیم‌های ثبت‌شده
    // (تأیید و رد) را می‌شمرد.
    const priorApprovals = (await postgrestGet(
      cfg,
      `factory_approvals?work_item_id=eq.${encodeURIComponent(workItem.id)}&select=id`,
    )) as ApprovalRow[];
    if (isReviewLimitReached(priorApprovals.length)) {
      return NextResponse.json({ error: "review limit reached (3 reviews per work item)" }, { status: 409 });
    }
    const artifacts = (await postgrestGet(
      cfg,
      `factory_artifacts?id=eq.${encodeURIComponent(artifactId)}&select=*`,
    )) as ArtifactRow[];
    if (artifacts.length === 0) return NextResponse.json({ error: "artifact not found" }, { status: 404 });
    const artifact = artifacts[0];
    if (artifact.work_item_id !== workItem.id) {
      return NextResponse.json({ error: "artifact belongs to a different work item" }, { status: 400 });
    }
    if (artifact.artifact_hash !== artifactHash) {
      return NextResponse.json({ error: "artifact_hash does not match the artifact" }, { status: 400 });
    }
    const rows = (await postgrestWrite(cfg, "POST", "factory_approvals", {
      work_item_id: workItem.id,
      artifact_id: artifact.id,
      artifact_hash: artifactHash,
      decision,
      reviewer_id: reviewerId,
      decision_reason: reason,
      review_type: reviewType,
      severity,
      confidence,
    })) as ApprovalRow[];
    if (rows.length === 0) return NextResponse.json({ error: "approval was not created" }, { status: 500 });
    const approval = rows[0];
    const nextStatus = statusAfterApproval(decision);
    if (!isValidWorkItemTransition(workItem.status as WorkItemStatus, nextStatus)) {
      return NextResponse.json({ error: `invalid work item transition ${workItem.status} to ${nextStatus}` }, { status: 409 });
    }
    // THG-TEAM-ARCHITECTURE-01 P2 step 2: تصمیم Policy روی همان Work
    // Item آینه می‌شود؛ دروازهٔ انسانی، policy_decision برابر human
    // با تصمیم‌گیرندهٔ سروری است. مقدار human از CHECK روی
    // factory_work_items می‌آید، نه از حدس.
    // policy_decision فقط نوع تصمیم‌گیرنده (human) را می‌گوید؛ نتیجه در status و تصمیم سطر approval است.
    const updated = (await postgrestWrite(
      cfg,
      "PATCH",
      `factory_work_items?id=eq.${encodeURIComponent(workItem.id)}`,
      {
        status: nextStatus,
        policy_decision: "human",
        policy_decided_by: reviewerId,
        policy_decided_at: new Date().toISOString(),
        last_error: decision === "rejected" ? reason : null,
        updated_at: new Date().toISOString(),
      },
    )) as WorkItemRow[];
    return NextResponse.json({ approval, work_item: updated[0] ?? workItem });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
