/**
 * انتشار کار تأییدشدهٔ راهنما. شناسهٔ مسیر، شناسهٔ Work Item است.
 * فقط با نشست ادمین معتبر. مسیر داخلی انتشار، وضعیت‌های نامجاز را
 * با 409 رد می‌کند و این مسیر، همان پیام را برمی‌گرداند.
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  guideAdminErrorResponse,
  guideAdminOrigin,
  publishGuideDraft,
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
    const result = await publishGuideDraft(origin, id);
    return NextResponse.json(result);
  } catch (err) {
    return guideAdminErrorResponse(err);
  }
}
