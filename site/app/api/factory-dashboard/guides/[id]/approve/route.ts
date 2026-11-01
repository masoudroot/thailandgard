/**
 * تأیید یا رد پیش‌نویس راهنما. شناسهٔ مسیر، شناسهٔ Work Item است.
 * فقط با نشست ادمین معتبر. دلیل تأیید، پیش‌فرض دارد؛ دلیل رد، ورودی
 * اجباری است. Hash از دیتابیس خوانده می‌شود، نه از ورودی مرورگر.
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  decideGuideDraft,
  guideAdminErrorResponse,
  guideAdminOrigin,
} from "@/lib/factory-dashboard/guide-admin";

const DEFAULT_APPROVE_REASON = "تأیید مدیر پروژه برای انتشار راهنما";

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
  const decision = input.decision;
  if (decision !== "approved" && decision !== "rejected") {
    return NextResponse.json({ error: "decision باید approved یا rejected باشد." }, { status: 400 });
  }
  const rawReason = typeof input.reason === "string" ? input.reason.trim() : "";
  if (decision === "rejected" && rawReason.length === 0) {
    return NextResponse.json({ error: "دلیل رد لازم است." }, { status: 400 });
  }
  const reason = decision === "approved" && rawReason.length === 0 ? DEFAULT_APPROVE_REASON : rawReason;
  try {
    const result = await decideGuideDraft(origin, id, decision, reason || null);
    return NextResponse.json(result);
  } catch (err) {
    return guideAdminErrorResponse(err);
  }
}
