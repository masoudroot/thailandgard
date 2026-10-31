import { NextRequest, NextResponse } from "next/server";
import { checkAuth, dbConfig, postgrestGet, postgrestWrite, type ApprovalRow, type ArtifactRow, type WorkItemRow } from "@/lib/factory/tick/internal-api";
import { isValidApprovalDecision, isValidWorkItemTransition, statusAfterApproval, type WorkItemStatus } from "@/lib/factory/tick/work-items";

/**
 * POST /api/internal/work-items/[id]/approvals
 * ثبت تصمیم انسانی روی یک Artifact و Hash دقیق آن. فقط localhost و
 * فقط با INTERNAL_PUBLISH_TOKEN. Work Item باید awaiting_approval باشد
 * و Artifact باید متعلق به همان Work Item باشد و Hash داده‌شده باید با
 * Hash ثبت‌شدهٔ Artifact بخواند؛ وگرنه تصمیم ثبت نمی‌شود. تأیید،
 * Work Item را approved و رد، آن را blocked می‌کند و دلیل رد در
 * Approval و last_error ثبت می‌شود. تصمیم، محتوای Artifact را تغییر
 * نمی‌دهد و به Artifact یا Hash دیگر منتقل نمی‌شود.
 */
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
  const reviewerId = typeof input.reviewer_id === "string" ? input.reviewer_id : "";
  const reason = typeof input.decision_reason === "string" ? input.decision_reason : null;
  if (artifactId.length === 0 || artifactHash.length === 0 || reviewerId.length === 0) {
    return NextResponse.json({ error: "artifact_id, artifact_hash and reviewer_id are required" }, { status: 400 });
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
    })) as ApprovalRow[];
    if (rows.length === 0) return NextResponse.json({ error: "approval was not created" }, { status: 500 });
    const approval = rows[0];
    const nextStatus = statusAfterApproval(decision);
    if (!isValidWorkItemTransition(workItem.status as WorkItemStatus, nextStatus)) {
      return NextResponse.json({ error: `invalid work item transition ${workItem.status} to ${nextStatus}` }, { status: 409 });
    }
    const updated = (await postgrestWrite(
      cfg,
      "PATCH",
      `factory_work_items?id=eq.${encodeURIComponent(workItem.id)}`,
      {
        status: nextStatus,
        last_error: decision === "rejected" ? reason : null,
        updated_at: new Date().toISOString(),
      },
    )) as WorkItemRow[];
    return NextResponse.json({ approval, work_item: updated[0] ?? workItem });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
