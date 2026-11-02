/**
 * جزئیات یک سند راهنما برای داشبورد. شناسهٔ مسیر، شناسهٔ سند است.
 * فقط با نشست ادمین معتبر؛ کاربر غیرمجاز 401 می‌گیرد.
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  getGuideDetail,
  guideAdminErrorResponse,
  guideAdminOrigin,
} from "@/lib/factory-dashboard/guide-admin";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const origin = await guideAdminOrigin(req);
  if (origin === null) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  try {
    const detail = await getGuideDetail(id);
    return NextResponse.json({ detail });
  } catch (err) {
    return guideAdminErrorResponse(err);
  }
}
