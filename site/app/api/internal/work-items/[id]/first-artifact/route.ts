import { NextRequest, NextResponse } from "next/server";
import { checkAuth, dbConfig, postgrestGet, postgrestWrite, type ArtifactRow, type DbCfg, type DocumentRow, type WorkItemRow } from "@/lib/factory/tick/internal-api";
import { canSubmitArtifact } from "@/lib/factory/tick/work-items";
import { computeContentHash, validatePublishPayload, type PublishPayload } from "@/lib/content-versioning";

/**
 * POST /api/internal/work-items/[id]/first-artifact
 * ثبت اولین Artifact برای سندی که هنوز نسخهٔ منتشرشده ندارد. فقط با
 * توکن INTERNAL_PUBLISH_TOKEN. بدنه { payload } می‌گیرد؛ payload کامل
 * با همان اعتبارسنج و همان Hash کانونیکال موجود بررسی می‌شود و
 * Artifact تغییرناپذیر با schema_version برابر publish_payload_v1 و
 * artifact_type برابر guide_edit درج می‌شود، بعد Work Item با
 * result_artifact_id و وضعیت awaiting_approval به‌روز می‌شود. پیش‌نویس
 * تا پیش از تأیید، منتشر نمی‌شود.
 *
 * گیت‌ها:
 * - Work Item ناموجود ۴۰۴؛ payload نامعتبر ۴۰۰.
 * - Idempotency: اگر Work Item از پیش Artifact پیوندیافته با همان Hash
 *   دارد، همان برگردانده می‌شود (۲۰۰، existing)؛ Hash متفاوت ۴۰۹ است.
 *   Artifact هم‌Hashِ پیوندنخورده (Crash میان درج و PATCH) هم به‌جای
 *   درج تکراری، پیوند می‌خورد؛ همان بازیابی مسیر Tick.
 * - وضعیت Work Item باید اجازهٔ ثبت Artifact بدهد (همان تابع
 *   canSubmitArtifact مسیر Tick) وگرنه ۴۰۹.
 * - سند نسخهٔ منتشرشده داشته باشد، ۴۰۹ است: برای آن حالت باید از مسیر
 *   به‌روزرسانی استفاده شود، نه Artifact اول.
 * - slug داخل payload باید با slug سند بخواند وگرنه ۴۰۰؛ وگرنه نسخه‌ای
 *   ساخته می‌شود که خواندن نسخه‌ای آن را با VERSION_MISMATCH رد می‌کند.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
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
  const payload = (body as Record<string, unknown>).payload;
  try {
    const workItems = (await postgrestGet(
      cfg,
      `factory_work_items?id=eq.${encodeURIComponent(id)}&select=*`,
    )) as WorkItemRow[];
    if (workItems.length === 0) {
      return NextResponse.json({ error: "work item not found" }, { status: 404 });
    }
    const workItem = workItems[0];
    let hash: string;
    try {
      validatePublishPayload(payload);
      hash = computeContentHash(payload as PublishPayload);
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "invalid payload" },
        { status: 400 },
      );
    }
    // Idempotency پیش از گیت وضعیت: تکرار درخواست پس از موفقیت، با همان
    // Hash باید همان Artifact را برگرداند، حتی اگر وضعیت دیگر
    // awaiting_approval شده باشد.
    if (workItem.result_artifact_id) {
      const linked = (await postgrestGet(
        cfg,
        `factory_artifacts?id=eq.${encodeURIComponent(workItem.result_artifact_id)}&select=*`,
      )) as ArtifactRow[];
      if (linked.length === 0) {
        return NextResponse.json({ error: "linked artifact not found" }, { status: 500 });
      }
      if (linked[0].artifact_hash === hash) {
        return NextResponse.json({ artifact_id: linked[0].id, artifact_hash: hash, existing: true });
      }
      return NextResponse.json({ error: "work item already has a different artifact" }, { status: 409 });
    }
    const sameHash = (await postgrestGet(
      cfg,
      `factory_artifacts?work_item_id=eq.${encodeURIComponent(workItem.id)}&artifact_hash=eq.${encodeURIComponent(hash)}&select=id&limit=1`,
    )) as ArtifactRow[];
    if (sameHash.length > 0) {
      const linked = await linkArtifact(cfg, workItem.id, sameHash[0].id);
      if (linked) {
        return NextResponse.json({ artifact_id: sameHash[0].id, artifact_hash: hash, existing: true });
      }
      return NextResponse.json({ error: "artifact link raced and no winner found" }, { status: 409 });
    }
    if (!canSubmitArtifact(workItem.status as never)) {
      return NextResponse.json(
        { error: `work item cannot submit artifact in status ${workItem.status}` },
        { status: 409 },
      );
    }
    const docs = (await postgrestGet(
      cfg,
      `content_documents?id=eq.${encodeURIComponent(workItem.content_id)}&select=*`,
    )) as DocumentRow[];
    if (docs.length === 0) {
      return NextResponse.json({ error: "content document not found" }, { status: 404 });
    }
    const document = docs[0];
    if (document.published_version_id) {
      return NextResponse.json({ error: "از مسیر به‌روزرسانی استفاده کن" }, { status: 409 });
    }
    if ((payload as PublishPayload).slug !== document.slug) {
      return NextResponse.json({ error: "payload slug does not match content document slug" }, { status: 400 });
    }
    const inserted = (await postgrestWrite(cfg, "POST", "factory_artifacts", {
      work_item_id: workItem.id,
      artifact_type: "guide_edit",
      schema_version: "publish_payload_v1",
      payload,
      artifact_hash: hash,
    })) as ArtifactRow[];
    if (inserted.length === 0 || !inserted[0].id) {
      return NextResponse.json({ error: "artifact was not created" }, { status: 500 });
    }
    const linked = await linkArtifact(cfg, workItem.id, inserted[0].id);
    if (!linked) {
      return NextResponse.json({ error: "artifact link raced and no winner found" }, { status: 409 });
    }
    return NextResponse.json({ artifact_id: inserted[0].id, artifact_hash: hash, existing: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * پیوند Artifact به Work Item با گارد result_artifact_id تهی، تا دو
 * فراخوان هم‌زمان فقط یکی پیوند را بگیرد. true یعنی همین فراخوان
 * پیوند را گرفت؛ false یعنی مسابقه را باخت.
 */
async function linkArtifact(
  cfg: DbCfg,
  workItemId: string,
  artifactId: string,
): Promise<boolean> {
  const patched = (await postgrestWrite(
    cfg,
    "PATCH",
    `factory_work_items?id=eq.${encodeURIComponent(workItemId)}&result_artifact_id=is.null`,
    {
      result_artifact_id: artifactId,
      status: "awaiting_approval",
      updated_at: new Date().toISOString(),
    },
  )) as WorkItemRow[];
  return patched.length > 0;
}
