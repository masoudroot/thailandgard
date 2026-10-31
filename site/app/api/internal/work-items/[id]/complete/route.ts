import { NextRequest, NextResponse } from "next/server";
import { checkAuth, dbConfig, postgrestGet, postgrestWrite, type PublicationRow, type WorkItemRow } from "@/lib/factory/tick/internal-api";

/**
 * POST /api/internal/work-items/[id]/complete
 * موفق شدن Work Item، فقط وقتی Publication آن verified شده باشد. فقط
 * localhost و فقط با INTERNAL_PUBLISH_TOKEN. اگر Publication هنوز
 * verified نیست، Work Item در publishing می‌ماند و 409 برمی‌گردد.
 * اگر Work Item از قبل succeeded است، همان وضعیت برگردانده می‌شود و
 * چیزی تازه ساخته نمی‌شود.
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
  try {
    const workItems = (await postgrestGet(
      cfg,
      `factory_work_items?id=eq.${encodeURIComponent(id)}&select=*`,
    )) as WorkItemRow[];
    if (workItems.length === 0) return NextResponse.json({ error: "work item not found" }, { status: 404 });
    const workItem = workItems[0];
    if (workItem.status === "succeeded") {
      return NextResponse.json({ work_item: workItem, replayed: true });
    }
    if (workItem.status !== "publishing" || !workItem.publication_id) {
      return NextResponse.json(
        { error: `work item cannot be completed in status ${workItem.status}` },
        { status: 409 },
      );
    }
    const pubs = (await postgrestGet(
      cfg,
      `factory_publications?id=eq.${encodeURIComponent(workItem.publication_id)}&select=*`,
    )) as PublicationRow[];
    if (pubs.length === 0) return NextResponse.json({ error: "publication not found" }, { status: 404 });
    if (pubs[0].status !== "verified") {
      return NextResponse.json(
        { error: `publication is not verified (status ${pubs[0].status})` },
        { status: 409 },
      );
    }
    const updated = (await postgrestWrite(
      cfg,
      "PATCH",
      `factory_work_items?id=eq.${encodeURIComponent(workItem.id)}`,
      {
        status: "succeeded",
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    )) as WorkItemRow[];
    return NextResponse.json({ work_item: updated[0] ?? workItem, publication: pubs[0] });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
