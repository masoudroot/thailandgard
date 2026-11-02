/**
 * اجرای دستی تیک از داشبورد (THG-AUTO-01، حالت پیشرفته).
 * فقط با نشست ادمین معتبر؛ فراخوان تیک، سروری و با توکن سروری
 * موجود انجام می‌شود و توکن هرگز به مرورگر نمی‌رسد. نتیجهٔ تیک
 * (وضعیت و قدم) همان‌طور که هست برگردانده می‌شود.
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { guideAdminOrigin } from "@/lib/factory-dashboard/guide-admin";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const origin = await guideAdminOrigin(req);
  if (origin === null) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const token = process.env.INTERNAL_PUBLISH_TOKEN ?? "";
  if (!token) {
    return NextResponse.json({ error: "factory tick not configured" }, { status: 503 });
  }
  const res = await fetch(`${origin}/api/factory/tick`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-publish-token": token,
    },
    body: "{}",
    cache: "no-store",
  });
  const text = await res.text();
  return NextResponse.json(text ? JSON.parse(text) : null, { status: res.status });
}
