import { NextRequest, NextResponse } from "next/server";
import { checkAuth, dbConfig, postgrestGet, postgrestWrite, type DocumentRow, type WorkItemRow } from "@/lib/factory/tick/internal-api";
import { isValidWorkKey } from "@/lib/factory/tick/work-items";
import { WORKFLOW_VERSION } from "@/lib/factory/tick/factory-tick";

const SLICE_SLUG = "best-time-to-visit-thailand";

/**
 * POST /api/internal/work-items
 * ساخت Work Item در وضعیت queued. فقط با توکن
 * INTERNAL_PUBLISH_TOKEN. هیچ نسخه، Publication یا Outboxی در این مرحله
 * ساخته نمی‌شود و Pointer تغییر نمی‌کند.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
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
  const workKey = input.work_key;
  const workType = typeof input.work_type === "string" ? input.work_type : "";
  const title = typeof input.title === "string" ? input.title : "";
  const description = typeof input.description === "string" ? input.description : null;
  const contentId = typeof input.content_id === "string" ? input.content_id : null;
  const slug = typeof input.slug === "string" ? input.slug : null;
  const criteria = Array.isArray(input.acceptance_criteria) ? input.acceptance_criteria : [];
  if (!isValidWorkKey(workKey) || workType.length === 0 || title.length === 0) {
    return NextResponse.json({ error: "work_key, work_type and title are required" }, { status: 400 });
  }
  // قرارداد M6: execution_mode فقط manual یا tick_managed است و
  // tick_managed بدون workflow_version، همان نسخهٔ پشتیبانی‌شده را می‌گیرد.
  // workflow_version دلخواهِ دیگر، پذیرفته می‌شود تا Tick آن را با
  // وضعیت مشخص رد کند، نه این‌که API با حدس، نسخه را عوض کند.
  const executionModeRaw = typeof input.execution_mode === "string" ? input.execution_mode : "manual";
  if (executionModeRaw !== "manual" && executionModeRaw !== "tick_managed") {
    return NextResponse.json({ error: "execution_mode must be manual or tick_managed" }, { status: 400 });
  }
  const workflowVersionRaw = typeof input.workflow_version === "string" ? input.workflow_version : null;
  if (workflowVersionRaw !== null && (workflowVersionRaw.length === 0 || workflowVersionRaw.length > 128)) {
    return NextResponse.json({ error: "workflow_version must be 1 to 128 characters" }, { status: 400 });
  }
  const workflowVersion = workflowVersionRaw ?? (executionModeRaw === "tick_managed" ? WORKFLOW_VERSION : null);
  if (!contentId && !slug) {
    return NextResponse.json({ error: "content_id or slug is required" }, { status: 400 });
  }
  try {
    const docQuery = contentId
      ? `content_documents?id=eq.${encodeURIComponent(contentId)}&select=*`
      : `content_documents?slug=eq.${encodeURIComponent(slug as string)}&content_type=eq.guide&select=*`;
    const docs = (await postgrestGet(cfg, docQuery)) as DocumentRow[];
    if (docs.length === 0) return NextResponse.json({ error: "content document not found" }, { status: 404 });
    const document = docs[0];
    if (slug && document.slug !== slug) {
      return NextResponse.json({ error: "slug does not match content_id" }, { status: 400 });
    }
    if (document.slug !== SLICE_SLUG || document.content_type !== "guide") {
      return NextResponse.json({ error: "content document is outside the M2 slice" }, { status: 403 });
    }
    if (document.is_test_fixture) {
      return NextResponse.json({ error: "test fixture cannot be published" }, { status: 403 });
    }
    const rows = (await postgrestWrite(cfg, "POST", "factory_work_items", {
      work_key: workKey,
      work_type: workType,
      title,
      description,
      status: "queued",
      content_id: document.id,
      acceptance_criteria: criteria,
      execution_mode: executionModeRaw,
      workflow_version: workflowVersion,
    })) as WorkItemRow[];
    if (rows.length === 0) return NextResponse.json({ error: "work item was not created" }, { status: 500 });
    return NextResponse.json({ work_item: rows[0] });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("duplicate key") || message.includes("already exists")) {
      return NextResponse.json({ error: "work_key already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
