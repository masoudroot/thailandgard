import { NextRequest, NextResponse } from "next/server";
import { callbackStore } from "@/lib/callback-store";
import { isIranMobile, normalizeIranMobile } from "@/lib/persian";

interface CallbackBody {
  name?: unknown;
  mobile?: unknown;
  tourSlug?: unknown;
  source?: unknown;
  preferredCallTime?: unknown;
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
    return NextResponse.json({ ok: false, error: "نام را کامل وارد کنید." }, { status: 400 });
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
      // زمان ترجیحی تماس: اختیاری است (فیلدش در صف نوبت عصر محتواست)؛
      // اگر آمد، خلاصه‌نویس lead-alert آن را بدون PII در intel_feed می‌نویسد.
      preferredCallTime:
        typeof body.preferredCallTime === "string" && body.preferredCallTime.trim().length > 0
          ? body.preferredCallTime.trim().slice(0, 120)
          : undefined,
      createdAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ ok: false, error: "ثبت درخواست ناموفق بود؛ لطفاً مستقیم تماس بگیرید." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
