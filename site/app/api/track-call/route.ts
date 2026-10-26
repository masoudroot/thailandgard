import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

/**
 * ردیاب تماس (قفل ۵ موتور رشد): دریافت کلیک‌های tel: از کلاینت.
 * قرارداد: همیشه ۲۰۰؛ ردیابی هرگز UX را نمی‌شکند.
 * ذخیره: سوپابیس (جدول call_clicks، با service_role)؛ اگر env نبود، فقط لاگ خطا.
 * فیلد source: سه‌بخشی «کانال|صفحه|کمپین» طبق SOURCE-TRACKING.md (یافتهٔ ۳۶ تحلیل).
 * فیلد context: تگ data-call-context روی لینک‌های tel: (پیشنهاد ۱ لید)؛ فعلاً ستون
 * در جدول نیست پس در insert سوپابیس نادیده گرفته می‌شود؛ هرگز ۴۰۰/۵۰۰ نمی‌دهد.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(req: NextRequest) {
  let href = "";
  let page = "";
  let source = "";
  try {
    const body = await req.json();
    if (typeof body.href === "string") href = body.href.slice(0, 64);
    if (typeof body.page === "string") page = body.page.slice(0, 128);
    if (typeof body.source === "string") source = body.source.slice(0, 128);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (!href.startsWith("tel:") || !page.startsWith("/")) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const row = { href, page, source, created_at: new Date().toISOString() };

  try {
    if (!SUPABASE_URL || !SERVICE_KEY) {
      throw new Error("SUPABASE env missing");
    }
    const res = await fetch(`${SUPABASE_URL}/rest/v1/call_clicks`, {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(row),
    });
    if (!res.ok) throw new Error(`supabase insert failed: ${res.status}`);
  } catch (e) {
    /* ردیابی هرگز UX را نمی‌شکند؛ ولی علت را در لاگ سرور می‌نویسیم تا
       خرابی خاموش (مثل نبود env در دیپلوی) قابل‌تشخیص بماند. */
    logger.error("track-call: insert failed", { route: "track-call" }, e);
  }

  return NextResponse.json({ ok: true });
}
