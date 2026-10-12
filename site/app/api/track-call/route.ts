import { NextRequest, NextResponse } from "next/server";
import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

/**
 * ردیاب تماس (قفل ۵ موتور رشد): دریافت کلیک‌های tel: از کلاینت.
 * قرارداد: همیشه ۲۰۰؛ ردیابی هرگز UX را نمی‌شکند.
 * ذخیره: سوپابیس (جدول call_clicks، با service_role)؛ اگر env نبود، JSONL محلی.
 * فیلد source: سه‌بخشی «کانال|صفحه|کمپین» طبق SOURCE-TRACKING.md (یافتهٔ ۳۶ تحلیل).
 * فیلد context: تگ data-call-context روی لینک‌های tel: (پیشنهاد ۱ لید)؛ فعلاً ستون
 * در جدول نیست پس در insert سوپابیس نادیده گرفته می‌شود و در JSONL محلی نگه‌داری
 * می‌شود تا بعد از مایگریشن زنده شود؛ هرگز ۴۰۰/۵۰۰ نمی‌دهد.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(req: NextRequest) {
  let href = "";
  let page = "";
  let source = "";
  let context = "";
  try {
    const body = await req.json();
    if (typeof body.href === "string") href = body.href.slice(0, 64);
    if (typeof body.page === "string") page = body.page.slice(0, 128);
    if (typeof body.source === "string") source = body.source.slice(0, 128);
    if (typeof body.context === "string") context = body.context.slice(0, 32);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (!href.startsWith("tel:") || !page.startsWith("/")) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // row: شکل کامل برای JSONL محلی؛ dbRow: بدون context تا ستون ناموجود
  // خطای 42703 ندهد (مایگریشن ستون با مسعود است).
  const row = { href, page, source, context, created_at: new Date().toISOString() };
  const dbRow = { href, page, source, created_at: row.created_at };

  try {
    if (SUPABASE_URL && SERVICE_KEY) {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/call_clicks`, {
        method: "POST",
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify(dbRow),
      });
      if (!res.ok) throw new Error(`supabase insert failed: ${res.status}`);
    } else {
      const dir = join(process.cwd(), "data");
      await mkdir(dir, { recursive: true });
      await appendFile(join(dir, "call-clicks.jsonl"), JSON.stringify(row) + "\n", "utf8");
    }
  } catch (e) {
    /* ردیابی هرگز UX را نمی‌شکند؛ ولی علت را در لاگ سرور می‌نویسیم تا
       خرابی خاموش (مثل نبود env در دیپلوی) قابل‌تشخیص بماند. */
    console.error(`[track-call] ذخیره‌سازی ناموفق: ${e instanceof Error ? e.message : "نامشخص"}`);
  }

  return NextResponse.json({ ok: true });
}
