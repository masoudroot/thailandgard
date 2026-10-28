import { NextRequest, NextResponse } from "next/server";
import { callbackStore } from "@/lib/callback-store";
import { clientIp } from "@/lib/dashboard/rate-limit";
import { allowSubmission } from "@/lib/form-rate-limit";
import { en } from "@/lib/utils";

interface ContactBody {
  name?: unknown;
  mobile?: unknown;
  subject?: unknown;
  message?: unknown;
}

/** موضوع‌های مجاز فرم تماس (وایرفریم صفحهٔ /contact، فاز ۵). */
const SUBJECTS = ["tour", "hotel", "flight", "visa", "other"] as const;
const SUBJECT_LABELS: Record<(typeof SUBJECTS)[number], string> = {
  tour: "تور",
  hotel: "هتل",
  flight: "پرواز",
  visa: "ویزا",
  other: "سؤال دیگر",
};

/**
 * نرمالایز سخت موبایل: همان منطق روت /api/callback (پیشوندهای ۰ / ۹۸ / 0098،
 * بعد دقیقاً «9 + ۹ رقم»؛ بدون برش خاموش).
 */
function strictMobile(input: string): string | null {
  let d = en(input).replace(/\D/g, "");
  if (d.startsWith("0098")) d = d.slice(4);
  else if (d.startsWith("98") && d.length > 10) d = d.slice(2);
  if (d.startsWith("0")) d = d.slice(1);
  return /^9\d{9}$/.test(d) ? d : null;
}

export async function POST(req: NextRequest) {
  let body: ContactBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "فرم درست ارسال نشد؛ لطفاً یک بار دیگر تلاش کنید." }, { status: 400 });
  }

  // Q4-04: همان سقف فرم درخواست تماس؛ کلید شامل نام مسیر است تا سهم هر فرم
  // جدا شمرده شود.
  const limit = allowSubmission(`contact:${clientIp(req)}`);
  if (!limit.allowed) {
    const mins = Math.max(1, Math.ceil(limit.retryAfterSeconds / 60));
    return NextResponse.json(
      { ok: false, error: `تعداد درخواست‌ها زیاد بود. ${mins} دقیقه دیگر دوباره تلاش کنید.` },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const mobile = strictMobile(typeof body.mobile === "string" ? body.mobile : "");
  const subject = typeof body.subject === "string" ? body.subject : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (name.length < 2) {
    return NextResponse.json({ ok: false, error: "نام را کامل وارد کنید." }, { status: 400 });
  }
  if (!mobile) {
    return NextResponse.json({ ok: false, error: "شمارهٔ موبایل را کامل و درست وارد کنید." }, { status: 400 });
  }
  if (!(SUBJECTS as readonly string[]).includes(subject)) {
    return NextResponse.json({ ok: false, error: "موضوع پیام را انتخاب کنید." }, { status: 400 });
  }
  if (message.length < 5) {
    return NextResponse.json({ ok: false, error: "پیام‌تان را بنویسید؛ چند کلمه کافی است." }, { status: 400 });
  }

  try {
    await callbackStore.save({
      name,
      mobile,
      source: "direct|contact|none",
      // جدول leads ستون subject ندارد؛ موضوع اول پیام می‌نشیند تا در صف لید دیده شود.
      message: `[موضوع: ${SUBJECT_LABELS[subject as (typeof SUBJECTS)[number]]}] ${message}`,
      createdAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ ok: false, error: "ثبت پیام ناموفق بود؛ لطفاً مستقیم تماس بگیرید." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
