import { after, NextRequest, NextResponse } from "next/server";
import {
  firstParagraphOfPayload,
  PublishV2Error,
  publishUpdateContent,
} from "@/lib/factory/publish-v2";
import { processOutboxBatch } from "@/lib/factory/tick/process-outbox-batch";
import {
  checkAuth,
  dbConfig,
  postgrestGet,
  postgrestRpc,
  postgrestWrite,
  type ApprovalRow,
  type ArtifactRow,
  type DocumentRow,
  type VersionRow,
  type WorkItemRow,
} from "@/lib/factory/tick/internal-api";
import type { PublishPayload } from "@/lib/content-versioning";

/**
 * POST /api/internal/work-items/[id]/publish
 * انتشار نسخهٔ تأییدشدهٔ یک Work Item از مسیر سرویس v2 موجود. فقط با
 * توکن INTERNAL_PUBLISH_TOKEN. تأیید باید دقیقاً به Artifact جاری و
 * Hash آن متصل باشد؛ تغییر Artifact پس از تأیید، مجوز را باطل می‌کند
 * (Approval روی Artifact تازه پیدا نمی‌شود یا Hash نمی‌خواند).
 *
 * ترتیب: گیت وضعیت → گیت Approval → ساخت نسخه با Function موجود
 * (فقط اگر result_version_id نباشد؛ اگر هست همان دوباره استفاده
 * می‌شود) → سرویس publishUpdateContent با همان آبجکت اعتبارسنجی مسیر
 * Tick و کلید Idempotency برابر publish-v2-<workKey> → ثبت
 * publication_id و وضعیت publishing روی Work Item. خطای
 * publish_outcome_unknown بالا داده می‌شود و Work Item هرگز succeeded
 * نمی‌شود؛ موفقیت نهایی فقط وقتی است که Verification رویداد Outbox،
 * صفحهٔ واقعی را دیده باشد (مسیر complete).
 *
 * نکتهٔ گیت وضعیت: Function ساخت نسخه، خودش وضعیت را publishing
 * می‌کند؛ پس گیت، approved را می‌پذیرد و publishing را فقط وقتی
 * می‌پذیرد که result_version_id از پیش باشد (تلاش دوباره پس از شکست
 * انتشار). publishing بدون نسخه، ۴۰۹ است. این همان پذیرش سرویس
 * انتشار است، نه تضعیف تأیید: Approval در هر فراخوان دوباره بررسی
 * می‌شود.
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
  try {
    const workItems = (await postgrestGet(
      cfg,
      `factory_work_items?id=eq.${encodeURIComponent(id)}&select=*`,
    )) as WorkItemRow[];
    if (workItems.length === 0) {
      return NextResponse.json({ error: "work item not found" }, { status: 404 });
    }
    const workItem = workItems[0];
    if (workItem.status !== "approved" && !(workItem.status === "publishing" && workItem.result_version_id)) {
      return NextResponse.json(
        { error: `work item is not approved (status ${workItem.status})` },
        { status: 409 },
      );
    }
    if (!workItem.result_artifact_id) {
      return NextResponse.json({ error: "work item has no artifact" }, { status: 409 });
    }
    const artifacts = (await postgrestGet(
      cfg,
      `factory_artifacts?id=eq.${encodeURIComponent(workItem.result_artifact_id)}&select=*`,
    )) as ArtifactRow[];
    if (artifacts.length === 0) {
      return NextResponse.json({ error: "artifact not found" }, { status: 500 });
    }
    const artifact = artifacts[0];
    const approvals = (await postgrestGet(
      cfg,
      `factory_approvals?work_item_id=eq.${encodeURIComponent(workItem.id)}&artifact_id=eq.${encodeURIComponent(workItem.result_artifact_id)}&decision=eq.approved&order=created_at.desc&select=*`,
    )) as ApprovalRow[];
    if (approvals.length === 0) {
      return NextResponse.json(
        { error: "no approved approval for the work item artifact" },
        { status: 409 },
      );
    }
    const approval = approvals[0];
    if (approval.artifact_hash !== artifact.artifact_hash) {
      return NextResponse.json(
        { error: "approval artifact hash does not match the artifact" },
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
    let versionId = workItem.result_version_id;
    if (!versionId) {
      const created = (await postgrestRpc(cfg, "create_approved_version_v2", {
        p_content_id: workItem.content_id,
        p_payload: artifact.payload,
        p_content_hash: artifact.artifact_hash,
        p_work_item_id: workItem.id,
        p_artifact_id: artifact.id,
      })) as VersionRow | VersionRow[] | null;
      const versionRow = Array.isArray(created) ? created[0] : created;
      if (!versionRow || !versionRow.id) {
        return NextResponse.json({ error: "approved version was not created" }, { status: 500 });
      }
      versionId = versionRow.id;
    }
    const versionRows = (await postgrestGet(
      cfg,
      `content_versions?id=eq.${encodeURIComponent(versionId)}&select=*`,
    )) as VersionRow[];
    if (versionRows.length === 0) {
      return NextResponse.json({ error: "version not found" }, { status: 500 });
    }
    const payload = artifact.payload as PublishPayload;
    let previousUniqueText: string | null = null;
    if (document.published_version_id) {
      const prevVersions = (await postgrestGet(
        cfg,
        `content_versions?id=eq.${encodeURIComponent(document.published_version_id)}&select=*`,
      )) as VersionRow[];
      if (prevVersions.length > 0) {
        const prevFirst = firstParagraphOfPayload(prevVersions[0].payload as PublishPayload);
        const expectedMarker = firstParagraphOfPayload(payload);
        previousUniqueText = prevFirst !== expectedMarker ? prevFirst : null;
      }
    }
    let result;
    try {
      result = await publishUpdateContent(cfg, {
        workItemId: workItem.id,
        workKey: workItem.work_key,
        contentId: document.id,
        versionId,
        approvalId: approval.id,
        expectedMarker: firstParagraphOfPayload(payload),
        previousUniqueText,
        previousVersionId: document.published_version_id,
        validation: {
          workItemStatus: workItem.status,
          workItemArtifactId: workItem.result_artifact_id,
          approvalArtifactId: approval.artifact_id,
          approvalArtifactHash: approval.artifact_hash,
          artifactHash: artifact.artifact_hash,
          approvalDecision: "approved",
          contentType: document.content_type,
          schemaVersion: versionRows[0].schema_version ?? "unknown",
        },
      });
    } catch (err) {
      if (err instanceof PublishV2Error) {
        if (err.code === "publish_outcome_unknown") {
          return NextResponse.json({ error: "publish_outcome_unknown", detail: err.message }, { status: 502 });
        }
        if (err.code === "daily_publish_limit") {
          return NextResponse.json({ error: err.message }, { status: 429 });
        }
        return NextResponse.json({ error: err.message }, { status: 409 });
      }
      throw err;
    }
    await postgrestWrite(cfg, "PATCH", `factory_work_items?id=eq.${encodeURIComponent(workItem.id)}`, {
      publication_id: result.publicationId,
      status: "publishing",
      updated_at: new Date().toISOString(),
    });
    // CUTOVER-FT-02 ماشهٔ (پ): شلیک fire-and-forget پمپ پس از ثبت
    // Publication. after() در درخواست واقعی، پس از ارسال پاسخ اجرا
    // می‌شود. اگر after() در دسترس نباشد (بیرون از درخواست، مثل تست)،
    // هیچ کاری نمی‌شود: پمپ از Job زمان‌بندی یا دکمهٔ داشبورد ادامه
    // می‌دهد و پاسخ انتشار هم به پمپ گره نمی‌خورد.
    const forwardedProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    const host = req.headers.get("host");
    const pumpOrigin = host ? `${forwardedProto ?? "http"}://${host}` : `http://127.0.0.1:${process.env.PORT ?? "3100"}`;
    try {
      after(async () => {
        try {
          await processOutboxBatch(cfg, pumpOrigin, {});
        } catch {
          // خرابی پمپ در ردیف Outbox ثبت می‌شود و Job زمان‌بندی دوباره می‌زند.
        }
      });
    } catch {
      // after() بیرون از درخواست در دسترس نیست؛ پمپ از ماشه‌های دیگر می‌آید.
    }
    return NextResponse.json({
      version_id: result.versionId,
      publication_id: result.publicationId,
      status: "publishing",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
