/**
 * مسیرهای API بخش مدیریت راهنمای داشبورد: فهرست و ایجاد.
 *
 * هر دو مسیر، فقط با نشست ادمین معتبر (کوکی tg-admin) پاسخ می‌دهند؛
 * کاربر غیرمجاز 401 می‌گیرد و هیچ داده‌ای برنمی‌گردد. نوشتن‌ها از
 * لایهٔ سروری guide-admin انجام می‌شوند و توکن انتشار داخلی هرگز به
 * مرورگر نمی‌رسد.
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  createGuideDraft,
  getGuidesList,
  guideAdminErrorResponse,
  guideAdminOrigin,
} from "@/lib/factory-dashboard/guide-admin";

export async function GET(req: NextRequest) {
  const origin = await guideAdminOrigin(req);
  if (origin === null) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const guides = await getGuidesList();
    return NextResponse.json({ guides });
  } catch (err) {
    return guideAdminErrorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  const origin = await guideAdminOrigin(req);
  if (origin === null) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
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
  const slug = typeof input.slug === "string" ? input.slug : "";
  const payload = input.payload;
  if (!slug || payload === undefined) {
    return NextResponse.json({ error: "slug و payload لازم‌اند." }, { status: 400 });
  }
  try {
    const result = await createGuideDraft(origin, { slug, payload });
    return NextResponse.json(result);
  } catch (err) {
    return guideAdminErrorResponse(err);
  }
}
