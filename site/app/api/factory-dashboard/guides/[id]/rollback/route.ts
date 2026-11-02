/**
 * درخواست Rollback برای یک انتشار راهنما. شناسهٔ مسیر، شناسهٔ سند است
 * و شناسهٔ Publication مرجع و دلیل، در بدنه می‌آیند؛ تعلق Publication
 * به همین سند، سمت سرور بررسی می‌شود. فقط با نشست ادمین معتبر.
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  guideAdminErrorResponse,
  guideAdminOrigin,
  requestGuideRollback,
} from "@/lib/factory-dashboard/guide-admin";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const origin = await guideAdminOrigin(req);
  if (origin === null) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "بدنهٔ JSON معتبر نیست." }, { status: 400 });
  }
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "بدنه باید یک آبجکت باشد." }, { status: 400 });
  }
  const input = body as Record<string, unknown>;
  const publicationId = typeof input.publication_id === "string" ? input.publication_id : "";
  const reason = typeof input.reason === "string" ? input.reason.trim() : "";
  if (publicationId.length === 0) {
    return NextResponse.json({ error: "publication_id لازم است." }, { status: 400 });
  }
  if (reason.length === 0 || reason.length > 500) {
    return NextResponse.json({ error: "دلیل Rollback باید ۱ تا ۵۰۰ نویسه باشد." }, { status: 400 });
  }
  try {
    const result = await requestGuideRollback(origin, publicationId, reason, id);
    return NextResponse.json(result);
  } catch (err) {
    return guideAdminErrorResponse(err);
  }
}
