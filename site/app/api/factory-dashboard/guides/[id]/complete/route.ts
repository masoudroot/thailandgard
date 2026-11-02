/**
 * بررسی وضعیت و تکمیل کار در حال انتشار. شناسهٔ مسیر، شناسهٔ Work Item است.
 * فقط با نشست ادمین معتبر. اگر Publication هنوز verified نشده باشد،
 * مسیر داخلی complete با 409 رد می‌کند و همان پیام برگردانده می‌شود؛
 * مدیر بعداً دوباره همین کنش را می‌زند.
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  completeGuideDraft,
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
  try {
    const result = await completeGuideDraft(origin, id);
    return NextResponse.json(result);
  } catch (err) {
    return guideAdminErrorResponse(err);
  }
}
