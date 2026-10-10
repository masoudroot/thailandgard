import { NextRequest, NextResponse } from "next/server";
import { callbackStore } from "@/lib/callback-store";
import { isIranMobile, normalizeIranMobile } from "@/lib/persian";

interface CallbackBody {
  name?: unknown;
  mobile?: unknown;
  tourSlug?: unknown;
  source?: unknown;
}

export async function POST(req: NextRequest) {
  let body: CallbackBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "بدنهٔ درخواست معتبر نیست." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const mobile = normalizeIranMobile(typeof body.mobile === "string" ? body.mobile : "");
  const tourSlug = typeof body.tourSlug === "string" ? body.tourSlug : undefined;
  const source = typeof body.source === "string" ? body.source : "site-form";

  if (name.length < 2) {
    return NextResponse.json({ ok: false, error: "نام را کامل وارد کن." }, { status: 400 });
  }
  if (!isIranMobile(mobile)) {
    return NextResponse.json({ ok: false, error: "شمارهٔ موبایل معتبر نیست." }, { status: 400 });
  }

  try {
    await callbackStore.save({
      name,
      mobile,
      tourSlug,
      source,
      createdAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ ok: false, error: "ثبت درخواست ناموفق بود؛ لطفاً مستقیم تماس بگیر." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
