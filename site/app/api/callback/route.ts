import { NextRequest, NextResponse } from "next/server";
import { callbackStore } from "@/lib/callback-store";
import { en } from "@/lib/utils";

interface CallbackBody {
  name?: unknown;
  mobile?: unknown;
  tourSlug?: unknown;
  source?: unknown;
  preferredCallTime?: unknown;
  message?: unknown;
}

/**
 * نرمالایز سخت: همان پیشوندهای معتبر (۰ / ۹۸ / 0098) را می‌پذیرد ولی برش
 * خاموش ندارد؛ ارقام خام پس از جداکردن پیشوند باید دقیقاً «9 + ۹ رقم» باشند.
 * هر رقم اضافه (مثل «09123456789012») سازگار نیست و null می‌دهد.
 */
function strictMobile(input: string): string | null {
  let d = en(input).replace(/\D/g, "");
  if (d.startsWith("0098")) d = d.slice(4);
  else if (d.startsWith("98") && d.length > 10) d = d.slice(2);
  if (d.startsWith("0")) d = d.slice(1);
  return /^9\d{9}$/.test(d) ? d : null;
}

export async function POST(req: NextRequest) {
  let body: CallbackBody;
  try {
    body = await req.json();
  } catch {
    // یافتهٔ ۲ لید (کارت ۰۵): «بدنهٔ درخواست معتبر نیست.» زبان فنی بود و کاربر
    // را مقصر می‌دانست (خلاف محور ۶ لحن: راه‌حل جلوتر از عذرخواهی، زبان فنی ممنوع).
    return NextResponse.json({ ok: false, error: "فرم درست ارسال نشد؛ لطفاً یک بار دیگر تلاش کنید." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  // سخت‌سازی سرورساید (فیکس یافتهٔ ۱، ۲۰ مهر): نرمالایز lib با برش خاموش
  // ورودی‌های ۱۱ تا ۱۴ رقمی را به ۱۰ رقم می‌برد و isIranMobile قبول می‌کرد.
  // پس اینجا ارقام خام باید دقیقاً با شمارهٔ نهایی سازگار باشند: پیشوند مجاز
  // (۰ / ۹۸ / 0098) جدا می‌شود و بعد باید دقیقاً ۱۰ رقم 9xxxxxxxxx بماند؛
  // هر رقم اضافه یعنی «برش خاموش» و ۴۰۰ برمی‌گرداند. سقف ۱۴ هم لازم نیست.
  const rawMobile = typeof body.mobile === "string" ? body.mobile : "";
  const mobile = strictMobile(rawMobile);
  const tourSlug = typeof body.tourSlug === "string" ? body.tourSlug : undefined;
  const rawSource = typeof body.source === "string" ? body.source : "";
  // قاعدهٔ «خالی نماندن» قرارداد ثبت منبع: اگر کلاینت قدیمی یا دستی مقداری
  // خارج از قالب «کانال|صفحه|کمپین» فرستاد، unknown ثبت می‌شود نه رشتهٔ بی‌قالب.
  const source = rawSource.includes("|") ? rawSource : "unknown|unknown|none";

  if (name.length < 2) {
    return NextResponse.json({ ok: false, error: "نام را کامل وارد کنید." }, { status: 400 });
  }
  if (!mobile) {
    // یافتهٔ ۳ لید (کارت ۰۵): پیام سرور با پیام کلاینت یکی شد (قاعدهٔ «یک مفهوم،
    // یک واژه»): «شمارهٔ موبایل را کامل و درست وارد کنید.»
    return NextResponse.json({ ok: false, error: "شمارهٔ موبایل را کامل و درست وارد کنید." }, { status: 400 });
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
      // پیام کاربر («چه می‌خواهید بدانید؟»، ۲۵ مهر ۱۴۰۵): اختیاری؛
      // در ستون message جدول leads می‌نشیند.
      message:
        typeof body.message === "string" && body.message.trim().length > 0
          ? body.message.trim().slice(0, 2000)
          : undefined,
      createdAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ ok: false, error: "ثبت درخواست ناموفق بود؛ لطفاً مستقیم تماس بگیرید." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
