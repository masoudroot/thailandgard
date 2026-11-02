/**
 * POST /api/internal/autonomous-cycle
 *
 * چرخهٔ روزانهٔ خودمختار محتوا (THG-AUTO-01): یک راهنمای تازه و
 * یک بازنویسی را به‌صورت Work Itemهای tick_managed با Workflow
 * خودمختار می‌سازد؛ اجرای آن‌ها با Job پنج‌دقیقه‌ای تیک است، نه
 * با این مسیر. احراز هویت با INTERNAL_PUBLISH_TOKEN؛ نوشتن‌ها از
 * گارد محیط (project ref) می‌گذرند.
 *
 * تکرارپذیری: اگر برای موضوع تازه یا بازنویسی، Work Item با همان
 * work_key از پیش هست، سطر تازه ساخته نمی‌شود و دلیل برگردانده
 * می‌شود؛ پس اجرای دوبارهٔ روزانه، کار تکراری نمی‌سازد. اگر چیزی
 * برای ساختن نیست، پاسخ ۲۰۰ با هر دو مقدار تهی است تا Job سبز
 * بماند؛ فقط ۴۰۱/۵۰۳ Job را قرمز می‌کند.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  checkAuth,
  dbConfig,
  postgrestGet,
  postgrestWrite,
  type DocumentRow,
  type WorkItemRow,
} from "@/lib/factory/tick/internal-api";
import { AUTO_WORKFLOW_VERSION } from "@/lib/factory/tick/factory-tick";
import {
  AUTO_SEED_TOPICS,
  pickFreshTopic,
  pickRewriteCandidate,
  type RewriteCandidate,
} from "@/lib/factory/tick/autonomous-cycle";

const AUTO_BUDGET_LIMIT = 1000000000;

const ACTIVE_STATUSES = "queued,drafting,awaiting_approval,approved,publishing";

interface VersionRow {
  id: string;
  version_no: number;
  payload: {
    title?: unknown;
    sections?: unknown;
    faqs?: unknown;
    updated_fa?: unknown;
  };
}

function payloadCount(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!process.env.INTERNAL_PUBLISH_TOKEN) {
    return NextResponse.json({ error: "autonomous cycle not configured" }, { status: 503 });
  }
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const cfg = dbConfig();
  if (!cfg) {
    return NextResponse.json({ error: "autonomous cycle not configured" }, { status: 503 });
  }

  const reasons: string[] = [];
  let fresh: { work_key: string; slug: string } | null = null;
  let rewrite: { work_key: string; slug: string } | null = null;

  try {
    // موضوع تازه: نخستین موضوع فهرست که سندی با آن slug ندارد.
    const docs = (await postgrestGet(cfg, "content_documents?select=slug")) as DocumentRow[];
    const topic = pickFreshTopic(
      AUTO_SEED_TOPICS,
      new Set(docs.map((doc) => doc.slug)),
    );
    if (!topic) {
      reasons.push("no fresh topic left in the seed list");
    } else {
      const workKey = `guide-auto-${topic.slug}`;
      const existing = (await postgrestGet(
        cfg,
        `factory_work_items?work_key=eq.${encodeURIComponent(workKey)}&select=id&limit=1`,
      )) as WorkItemRow[];
      if (existing.length > 0) {
        reasons.push(`fresh work item already exists: ${workKey}`);
      } else {
        const insertedDocs = (await postgrestWrite(cfg, "POST", "content_documents", {
          slug: topic.slug,
          content_type: "guide",
          canonical_path: `/guide/${topic.slug}`,
          status: "draft",
          is_test_fixture: false,
        })) as DocumentRow[];
        const docId = insertedDocs[0]?.id;
        if (!docId) throw new Error("fresh guide document was not created");
        const insertedWis = (await postgrestWrite(cfg, "POST", "factory_work_items", {
          work_key: workKey,
          work_type: "update_content",
          title: topic.title,
          status: "queued",
          execution_mode: "tick_managed",
          workflow_version: AUTO_WORKFLOW_VERSION,
          budget_limit: AUTO_BUDGET_LIMIT,
          content_id: docId,
        })) as WorkItemRow[];
        if (!insertedWis[0]?.id) throw new Error("fresh work item was not created");
        fresh = { work_key: workKey, slug: topic.slug };
      }
    }

    // بازنویسی: کهنه‌ترین راهنمای منتشرشدهٔ واجد شرایط که کار
    // فعالی ندارد.
    const publishedDocs = (await postgrestGet(
      cfg,
      "content_documents?status=eq.published&published_version_id=not.is.null&select=id,slug,published_version_id",
    )) as (DocumentRow & { published_version_id: string })[];
    if (publishedDocs.length > 0) {
      const versionIds = publishedDocs.map((doc) => doc.published_version_id).join(",");
      const versions = (await postgrestGet(
        cfg,
        `content_versions?id=in.(${versionIds})&select=id,version_no,payload`,
      )) as VersionRow[];
      const versionById = new Map(versions.map((version) => [version.id, version]));
      const docIds = publishedDocs.map((doc) => doc.id).join(",");
      const activeWis = (await postgrestGet(
        cfg,
        `factory_work_items?content_id=in.(${docIds})&status=in.(${ACTIVE_STATUSES})&select=content_id`,
      )) as WorkItemRow[];
      const activeDocIds = new Set(activeWis.map((wi) => wi.content_id));
      const candidates: RewriteCandidate[] = [];
      for (const doc of publishedDocs) {
        if (activeDocIds.has(doc.id)) continue;
        const version = versionById.get(doc.published_version_id);
        if (!version) continue;
        candidates.push({
          slug: doc.slug,
          title:
            typeof version.payload.title === "string" && version.payload.title
              ? version.payload.title
              : doc.slug,
          contentId: doc.id,
          versionNo: version.version_no,
          sections: payloadCount(version.payload.sections),
          faqs: payloadCount(version.payload.faqs),
          updatedFa:
            typeof version.payload.updated_fa === "string" ? version.payload.updated_fa : null,
        });
      }
      const picked = pickRewriteCandidate(candidates);
      if (!picked) {
        reasons.push("no published guide qualifies for rewrite");
      } else {
        const workKey = `guide-auto-rewrite-${picked.slug}-v${picked.versionNo}`;
        const existing = (await postgrestGet(
          cfg,
          `factory_work_items?work_key=eq.${encodeURIComponent(workKey)}&select=id&limit=1`,
        )) as WorkItemRow[];
        if (existing.length > 0) {
          reasons.push(`rewrite work item already exists: ${workKey}`);
        } else {
          const insertedWis = (await postgrestWrite(cfg, "POST", "factory_work_items", {
            work_key: workKey,
            work_type: "update_content",
            title: picked.title,
            status: "queued",
            execution_mode: "tick_managed",
            workflow_version: AUTO_WORKFLOW_VERSION,
            budget_limit: AUTO_BUDGET_LIMIT,
            content_id: picked.contentId,
          })) as WorkItemRow[];
          if (!insertedWis[0]?.id) throw new Error("rewrite work item was not created");
          rewrite = { work_key: workKey, slug: picked.slug };
        }
      }
    } else {
      reasons.push("no published guides found for rewrite");
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }

  return NextResponse.json({ fresh, rewrite, reasons });
}
