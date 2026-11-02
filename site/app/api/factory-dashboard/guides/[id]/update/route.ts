/**
 * ساخت پیش‌نویس به‌روزرسانی برای سند منتشرشده از داشبورد.
 * شناسهٔ مسیر، شناسهٔ سند است. فقط با نشست ادمین معتبر؛ کاربر
 * غیرمجاز 401 می‌گیرد. بدنه { payload } می‌گیرد.
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  createGuideUpdateDraft,
  guideAdminErrorResponse,
  guideAdminOrigin,
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
  const payload = (body as Record<string, unknown>).payload;
  if (payload === undefined) {
    return NextResponse.json({ error: "payload لازم است." }, { status: 400 });
  }
  try {
    const result = await createGuideUpdateDraft(origin, id, payload);
    return NextResponse.json(result);
  } catch (err) {
    return guideAdminErrorResponse(err);
  }
}
