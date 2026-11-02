/**
 * پمپ Outbox از داشبورد (CUTOVER-FT-02 ماشهٔ الف): یک دور پردازش
 * Outbox برای کار در حال انتشار. شناسهٔ مسیر، شناسهٔ Work Item است.
 * فقط با نشست ادمین معتبر؛ فراخوان داخلی با توکن سروری موجود انجام
 * می‌شود و نتیجهٔ پمپ (وضعیت Publication پس از پمپ) برگردانده می‌شود.
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  guideAdminErrorResponse,
  guideAdminOrigin,
  pumpGuideDraft,
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
    const result = await pumpGuideDraft(origin, id);
    return NextResponse.json(result);
  } catch (err) {
    return guideAdminErrorResponse(err);
  }
}
