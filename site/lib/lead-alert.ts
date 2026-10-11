/**
 * منطق هشدار لید (lead-alert) — سمت سرور.
 *
 * مبنا: حکم چیدمان design ‏(agents/design/SPECS/lead-alert-layout-2026-10-11-17.md)‏
 * و ران‌بوک SLA تیم لید ‏(agents/lead/SLA_RUNBOOK.md)‏.
 *
 * سه مرحلهٔ UI (فقط برای وضعیت new):
 * - تازه: سن زیر ۳۰ دقیقه (اولویت زیر ۱۵ دقیقه)
 * - در مسیر: از ۳۰ دقیقه تا سررسید ۶ ساعته؛ در ۴٫۵ ساعت فقط ساعت باقی‌مانده به‌روز می‌شود
 * - گذشته: سن بیش از ۶ ساعت
 *
 * تغییر ۱۹ مهر ۱۴۰۵ (یافتهٔ تیم lead، دستور هماهنگ‌کننده): بازهٔ ۳۰ دقیقه تا ۳ ساعت
 * دیگر از فهرست نمی‌افتد؛ «در مسیر» همان متن طراحی (تا ساعت سررسید فرصت دارید) را
 * برای کل بازه نشان می‌دهد. انحراف آگاهانه از حکم چیدمان ۱۷ design (ظهور از ۳ ساعت).
 *
 * این ماجول هیچ PIIای لمس نمی‌کند؛ شناسهٔ کوتاه لید تنها شناسهٔ نمایشی است.
 *
 * کادانس شش‌لمسه (KNOWLEDGE تیم لید): لمس بعدی از روی createdAt حساب می‌شود؛
 * ارسال پیام با فروشنده است، نه کد.
 */

import { fa } from "./utils";

/** مهلت پاسخ اول (SLA) به میلی‌ثانیه: ۶ ساعت */
export const LEAD_SLA_MS = 6 * 3600_000;
/** پنجرهٔ «تازه»: ۳۰ دقیقه */
export const LEAD_FRESH_MS = 30 * 60_000;

/**
 * کادانس شش‌لمسهٔ پیگیری (KNOWLEDGE تیم لید): لمس بعدی از روی createdAt حساب می‌شود؛
 * ارسال پیام با فروشنده است، نه کد.
 */
export const TOUCH_OFFSETS_MS = [
  0, // ۱: تماس اول — بلافاصله
  6 * 3600_000, // ۲: تماس دوم — همان روز، حدود ۶ ساعت بعد
  24 * 3600_000, // ۳: تماس سوم — فردا، حدود ۲۴ ساعت بعد
  72 * 3600_000, // ۴: پیامک یا پیام‌رسان — روز سوم، حدود ۷۲ ساعت بعد
  120 * 3600_000, // ۵: تماس پنجم — روز پنجم، حدود ۱۲۰ ساعت بعد
  168 * 3600_000, // ۶: تماس پایانی — روز هفتم، حدود ۱۶۸ ساعت بعد
] as const;
export const TOUCH_TITLES = [
  "تماس اول",
  "تماس دوم",
  "تماس سوم",
  "پیامک یا پیام‌رسان",
  "تماس پنجم",
  "تماس پایانی",
] as const;

/**
 * لمس بعدی از روی زمان ثبت لید و تعداد لمس‌های انجام‌شده.
 * touchesDone از وضعیت می‌آید: new یعنی ۰، contacted یعنی حداقل ۱.
 * اگر هر شش لمس انجام شد، null برمی‌گردد (انتقال به فهرست پرورش).
 * due_at به‌صورت ISO با آفست تهران (+03:30، بدون DST) است؛ بدون PII.
 */
export function nextTouch(
  createdAtISO: string,
  touchesDone: number,
): { touch: number; title: string; dueAt: string } | null {
  const next = touchesDone + 1;
  if (next > TOUCH_OFFSETS_MS.length) return null;
  const dueMs = new Date(createdAtISO).getTime() + TOUCH_OFFSETS_MS[next - 1];
  if (Number.isNaN(dueMs)) return null;
  const tehran = new Date(dueMs + (3 * 60 + 30) * 60_000);
  const dueAt = tehran.toISOString().slice(0, 19) + "+03:30";
  return { touch: next, title: TOUCH_TITLES[next - 1], dueAt };
}

export type LeadAlertStage = "fresh" | "enroute" | "past";
export type LeadStatus = "new" | "contacted" | "done";

/** مرحلهٔ هشدار از روی سن لید؛ فقط برای سن نامعتبر null (ردیفی نیست). */
export function stageForAge(ageMs: number): LeadAlertStage | null {
  if (!Number.isFinite(ageMs) || ageMs < 0) return null;
  if (ageMs < LEAD_FRESH_MS) return "fresh";
  if (ageMs <= LEAD_SLA_MS) return "enroute";
  return "past";
}

/** ۵ کاراکتر اول شناسه (همان قرارداد ران‌بوک). */
export function shortLeadId(id: string): string {
  return id.slice(0, 5);
}

/** ساعت تهران، قالب ۲۴ساعته با ارقام فارسی: «۱۸:۳۰». */
export function tehranClock(date: Date): string {
  return new Intl.DateTimeFormat("fa-IR", {
    timeZone: "Asia/Tehran",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

export interface LeadAlertTextInput {
  leadId: string;
  stage: LeadAlertStage;
  /** سررسید ۶ ساعته (فقط برای مرحلهٔ «در مسیر») */
  deadline?: Date;
}

/**
 * متن نهایی تک‌خطی ردیف هشدار — کلمه‌به‌کلمه از حکم design (بخش ۲ سند).
 * بافت مثبت؛ هیچ‌یک از واژه‌های ممنوع (نقض، انقضا، بی‌پاسخ، غفلت، ازدست‌رفته، ریسک، خطر) این‌جا نیست.
 */
export function leadAlertText({ leadId, stage, deadline }: LeadAlertTextInput): string {
  const id = `لید #${fa(shortLeadId(leadId))}`;
  switch (stage) {
    case "fresh":
      return `${id}؛ همین حالا تماس بگیرید`;
    case "enroute": {
      const d = deadline ?? new Date(Date.now() + LEAD_SLA_MS);
      return `${id}؛ تا ساعت ${tehranClock(d)} فرصت دارید`;
    }
    case "past":
      return `${id}؛ زمان ایده‌آل گذشت، هنوز منتظر است`;
  }
}

/** برچسب چیپ هر مرحله (همان نام‌های حکم: «تازه»/«در مسیر»/«گذشته»). */
export const LEAD_STAGE_LABEL: Record<LeadAlertStage, string> = {
  fresh: "تازه",
  enroute: "در مسیر",
  past: "گذشته",
};

/* ------------------------------------------------------------------ */
/* خلاصه‌نویس سمت سرور (قلم ۲۱ INFLIGHT مدیر)                              */
/* ------------------------------------------------------------------ */

export interface LeadAlertSummaryInput {
  /** شناسهٔ کامل لید؛ فقط ۵ کاراکتر اول در ردیف می‌آید */
  leadId: string;
  status: LeadStatus;
  /** زمان ثبت لید (ISO) */
  createdAt: string;
  /** زمان تغییر وضعیت (ISO) — فقط برای رویداد تغییر وضعیت */
  changedAt?: string;
  source?: string;
  /** نام تور (نه اسلاگ) */
  tour?: string;
  /** زمان ترجیحی تماس (وقتی فرم آن را گرفت) */
  preferredCallTime?: string;
}

export interface LeadAlertSummaryResult {
  ok: boolean;
  skipped?: boolean;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * به‌ازای ثبت لید و هر تغییر وضعیت، یک ردیف بدون PII با تگ lead-alert
 * در جدول intel_feed می‌نویسد (حکم مدیر، ساعت ۱۰، ۱۹ مهر؛ تکمیل ساعت ۱۱:
 * «هر تغییر وضعیت» هم ردیف می‌گیرد، نه فقط ثبت).
 *
 * قرارداد ران‌بوک: tags=[lead-alert]، title «لید تازه»/«تغییر وضعیت لید» + شناسهٔ کوتاه،
 * و summary آبجکت JSON با کلیدهای lead_id، status، created_at، changed_at، source، tour،
 * preferred_call_time و next_touch (رشتهٔ JSONِ {touch, due_at} یا «nurture» پس از شش لمس).
 *
 * نام و موبایل مشتری هرگز این‌جا نمی‌آید (نه در title، نه در summary).
 * خطا را هرگز به بالا پرتاب نمی‌کند تا ثبت لید نشکند؛ فقط لاگ می‌زند.
 */
export async function writeLeadAlertSummary(
  input: LeadAlertSummaryInput,
): Promise<LeadAlertSummaryResult> {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.warn("[lead-alert] SUPABASE env missing; summary skipped");
    return { ok: false, skipped: true };
  }
  const short = shortLeadId(input.leadId);
  const title =
    input.status === "new" ? `لید تازه #${short}` : `تغییر وضعیت لید #${short}`;
  const summary: Record<string, string> = {
    lead_id: short,
    status: input.status,
    created_at: input.createdAt,
  };
  if (input.changedAt) summary.changed_at = input.changedAt;
  if (input.source) summary.source = input.source;
  if (input.tour) summary.tour = input.tour;
  if (input.preferredCallTime) summary.preferred_call_time = input.preferredCallTime;
  // کادانس شش‌لمسه: لمس بعدی در هر ردیف (ثبت و تغییر وضعیت) می‌آید تا فروشنده فراموش نکند.
  const touchesDone = input.status === "new" ? 0 : input.status === "contacted" ? 1 : 6;
  const nt = nextTouch(input.createdAt, touchesDone);
  summary.next_touch = nt ? JSON.stringify({ touch: nt.touch, due_at: nt.dueAt }) : "nurture";

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/intel_feed`, {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        title,
        summary: JSON.stringify(summary),
        tags: ["lead-alert"],
      }),
    });
    if (!res.ok) {
      console.warn(`[lead-alert] intel_feed insert failed: ${res.status}`);
      return { ok: false };
    }
    return { ok: true };
  } catch (err) {
    console.warn("[lead-alert] intel_feed insert error", err);
    return { ok: false };
  }
}
