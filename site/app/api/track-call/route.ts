import { NextRequest, NextResponse } from "next/server";
import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

/**
 * ردیاب تماس (قفل ۵ موتور رشد): دریافت کلیک‌های tel: از کلاینت.
 * قرارداد: همیشه ۲۰۰؛ ردیابی هرگز UX را نمی‌شکند.
 * ذخیره: سوپابیس (جدول call_clicks، با service_role)؛ اگر env نبود، JSONL محلی.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(req: NextRequest) {
  let href = "";
  let page = "";
  try {
    const body = await req.json();
    if (typeof body.href === "string") href = body.href.slice(0, 64);
    if (typeof body.page === "string") page = body.page.slice(0, 128);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (!href.startsWith("tel:") || !page.startsWith("/")) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const row = { href, page, created_at: new Date().toISOString() };

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
        body: JSON.stringify(row),
      });
      if (!res.ok) throw new Error(`supabase insert failed: ${res.status}`);
    } else {
      const dir = join(process.cwd(), "data");
      await mkdir(dir, { recursive: true });
      await appendFile(join(dir, "call-clicks.jsonl"), JSON.stringify(row) + "\n", "utf8");
    }
  } catch {
    /* سکوت عمدی: ردیابی خراب، تماس را خراب نمی‌کند */
  }

  return NextResponse.json({ ok: true });
}
