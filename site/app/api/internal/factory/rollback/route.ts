import { NextRequest, NextResponse } from "next/server";
import {
  firstParagraphOfPayload,
  rollbackUpdateContent,
  type PublishPayloadLike,
} from "@/lib/factory/publish-v2";
import { checkAuth, dbConfig, postgrestGet } from "@/lib/factory/tick/internal-api";
import { isValidRollbackReason } from "@/lib/factory/tick/rollback";

/**
 * POST /api/internal/factory/rollback
 * Caller سروری و داخلی برای Rollback نسخهٔ دوم (M5). فقط با
 * INTERNAL_PUBLISH_TOKEN و همان الگوی مسیرهای internal موجود
 * (process-outbox و approvals) احراز می‌شود؛ هیچ دسترسی عمومی تازه‌ای
 * باز نمی‌کند و هیچ جزء کلاینتی ندارد.
 *
 * ورودی، فقط شناسهٔ Publication و دلیل است. بقیهٔ شناسه‌ها از همان
 * سطر Publication خوانده می‌شوند، نه از فراخواننده گرفته می‌شوند:
 * هدف Rollback همیشه نسخهٔ پیشین همان Publication است
 * (previous_version_id) و کلید Idempotency هم از work_key همان
 * Work Item ساخته می‌شود. پس فراخواننده نمی‌تواند نسخهٔ دلخواه
 * دیگری را هدف بگیرد.
 *
 * این مسیر، هیچ SQL آزاد و هیچ فراخوان مستقیم RPC ندارد؛ تنها
 * سرویس موجود rollbackUpdateContent را صدا می‌زند و همان سرویس،
 * Function اتمیک publish_v2_content_atomic را با kind برابر rollback
 * فرا می‌خواند. همهٔ قیدهای نهایی (verified بودن، جاری بودن نسخهٔ
 * مورد نظر، منتشرشده بودن نسخهٔ هدف، تعلق به همان سند و یکتایی
 * کلید Idempotency) در همان Function بررسی می‌شوند و خطای آن، کل
 * تراکنش را برمی‌گرداند. سطرهای Publication و Outbox که همان
 * Function می‌نویسد، Audit مسیرند؛ Dispatch و Verification رویداد
 * Outbox هم از مسیر موجود process-outbox انجام می‌شود، نه از این‌جا.
 *
 * این مسیر، وضعیت Work Item را عوض نمی‌کند و چیزی را «موفق» اعلام
 * نمی‌کند؛ موفقیت Rollback وقتی معلوم می‌شود که Verification رویداد
 * Outbox، صفحهٔ واقعی را با نشان نسخهٔ هدف دیده باشد.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface PublicationRow {
  id: string;
  content_id: string;
  version_id: string;
  previous_version_id: string | null;
  publication_kind: string;
  status: string;
  work_item_id: string | null;
  approval_id: string | null;
}

interface WorkItemRow {
  id: string;
  work_key: string;
}

interface VersionRow {
  id: string;
  payload: unknown;
}

function isPublishPayloadLike(value: unknown): value is PublishPayloadLike {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const sections = (value as Record<string, unknown>).sections;
  if (!Array.isArray(sections)) return false;
  return sections.every(
    (section) =>
      section !== null &&
      typeof section === "object" &&
      !Array.isArray(section) &&
      Array.isArray((section as Record<string, unknown>).paragraphs) &&
      ((section as Record<string, unknown>).paragraphs as unknown[]).every(
        (paragraph) => typeof paragraph === "string",
      ),
  );
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!process.env.INTERNAL_PUBLISH_TOKEN) {
    return NextResponse.json({ error: "rollback not configured" }, { status: 503 });
  }
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const cfg = dbConfig();
  if (!cfg) {
    return NextResponse.json({ error: "rollback not configured" }, { status: 503 });
  }
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
  const publicationId = typeof input.publication_id === "string" ? input.publication_id : "";
  const reason = input.reason;
  if (!UUID_RE.test(publicationId)) {
    return NextResponse.json({ error: "publication_id must be a uuid" }, { status: 400 });
  }
  if (!isValidRollbackReason(reason)) {
    return NextResponse.json(
      { error: "reason must be a non-empty string of at most 500 characters" },
      { status: 400 },
    );
  }
  try {
    const publications = (await postgrestGet(
      cfg,
      `factory_publications?id=eq.${encodeURIComponent(publicationId)}&select=id,content_id,version_id,previous_version_id,publication_kind,status,work_item_id,approval_id`,
    )) as PublicationRow[];
    if (publications.length === 0) {
      return NextResponse.json({ error: "publication not found" }, { status: 404 });
    }
    const publication = publications[0];
    if (publication.publication_kind !== "publish") {
      return NextResponse.json(
        { error: "only a forward publication can be rolled back" },
        { status: 409 },
      );
    }
    if (publication.status !== "verified") {
      return NextResponse.json(
        { error: `publication is not verified (status ${publication.status})` },
        { status: 409 },
      );
    }
    if (publication.previous_version_id === null) {
      return NextResponse.json(
        { error: "publication has no previous version to restore" },
        { status: 409 },
      );
    }
    if (publication.work_item_id === null) {
      return NextResponse.json({ error: "publication has no work item" }, { status: 409 });
    }
    const workItems = (await postgrestGet(
      cfg,
      `factory_work_items?id=eq.${encodeURIComponent(publication.work_item_id)}&select=id,work_key`,
    )) as WorkItemRow[];
    if (workItems.length === 0) {
      return NextResponse.json({ error: "work item not found" }, { status: 404 });
    }
    const workKey = workItems[0].work_key;
    const targetVersions = (await postgrestGet(
      cfg,
      `content_versions?id=eq.${encodeURIComponent(publication.previous_version_id)}&select=id,payload`,
    )) as VersionRow[];
    if (targetVersions.length === 0) {
      return NextResponse.json({ error: "target version not found" }, { status: 404 });
    }
    if (!isPublishPayloadLike(targetVersions[0].payload)) {
      return NextResponse.json(
        { error: "target version payload is not a publish payload" },
        { status: 500 },
      );
    }
    const expectedMarker = firstParagraphOfPayload(targetVersions[0].payload);
    const currentVersions = (await postgrestGet(
      cfg,
      `content_versions?id=eq.${encodeURIComponent(publication.version_id)}&select=id,payload`,
    )) as VersionRow[];
    if (currentVersions.length === 0) {
      return NextResponse.json({ error: "current version not found" }, { status: 404 });
    }
    if (!isPublishPayloadLike(currentVersions[0].payload)) {
      return NextResponse.json(
        { error: "current version payload is not a publish payload" },
        { status: 500 },
      );
    }
    const previousUniqueText = firstParagraphOfPayload(currentVersions[0].payload);
    const result = await rollbackUpdateContent(cfg, {
      workItemId: publication.work_item_id,
      workKey,
      contentId: publication.content_id,
      targetVersionId: publication.previous_version_id,
      rollbackOfPublicationId: publication.id,
      reason,
      approvalId: publication.approval_id ?? "",
      expectedMarker,
      previousUniqueText,
    });
    return NextResponse.json({
      publication_id: result.publicationId,
      outbox_id: result.outboxId,
      previous_version_id: result.previousVersionId,
      version_id: result.versionId,
      replayed: result.replayed,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
