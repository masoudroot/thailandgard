/**
 * ذخیره‌سازی درخواست‌های تماس.
 *
 * قرارداد: هر پیاده‌سازی باید یک متد `save` داشته باشد.
 * الان: سوپابیس (جدول `leads`)؛ اگر متغیرهای محیطی نباشند، ثبت با خطا متوقف می‌شود.
 * هیچ تغییری در روت API لازم نیست.
 *
 * پس از هر ثبت موفق در سوپابیس، خلاصه‌نویس lead-alert هم یک ردیف بدون PII
 * در `intel_feed` می‌نویسد ‏(lib/lead-alert.ts)‏؛ خرابی‌اش ثبت لید را نمی‌شکند.
 */

export interface CallbackRequest {
  name: string;
  mobile: string;
  tourSlug?: string;
  source?: string;
  preferredCallTime?: string;
  /** متن پیام فرم تماس (صفحهٔ /contact)؛ در ستون message جدول leads می‌نشیند. */
  message?: string;
  createdAt: string;
}

export interface CallbackStore {
  save(request: CallbackRequest): Promise<void>;
}

import { writeLeadAlertSummary } from "./lead-alert";
import { getTour } from "./tours";

class UnavailableCallbackStore implements CallbackStore {
  async save(): Promise<void> {
    throw new Error("SUPABASE env missing");
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

class SupabaseCallbackStore implements CallbackStore {
  async save(request: CallbackRequest): Promise<void> {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/leads`, {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY as string,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
        // شناسهٔ ردیف تازه برای خلاصه‌نویس lead-alert لازم است
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        name: request.name,
        phone: request.mobile,
        tour_slug: request.tourSlug ?? null,
        source: request.source ?? "site-form",
        // پیام فرم تماس؛ قرارداد منبع: CallbackForm خالی می‌فرستد (null می‌شود)
        message: request.message ?? null,
      }),
    });
    if (!res.ok) {
      throw new Error(`supabase insert failed: ${res.status}`);
    }
    // خلاصه‌نویس lead-alert: ردیف بدون PII در intel_feed (قلم ۲۱ مدیر).
    // نام و موبایل هرگز به خلاصه‌نویس نمی‌رسد؛ خرابی‌اش ثبت لید را نمی‌شکند.
    try {
      const rows: Array<{ id?: unknown }> = await res.json().catch(() => []);
      const id = rows.length > 0 && typeof rows[0].id === "string" ? rows[0].id : undefined;
      if (id) {
        const tourTitle = request.tourSlug ? getTour(request.tourSlug)?.title : undefined;
        await writeLeadAlertSummary({
          leadId: id,
          status: "new",
          createdAt: request.createdAt,
          source: request.source ?? "site-form",
          tour: tourTitle,
          preferredCallTime: request.preferredCallTime,
        });
      } else {
        console.warn("[callback-store] lead id missing; lead-alert summary skipped");
      }
    } catch (err) {
      console.warn("[callback-store] lead-alert summary failed", err);
    }
  }
}

function pickStore(): CallbackStore {
  if (SUPABASE_URL && SERVICE_KEY) return new SupabaseCallbackStore();
  console.error("[callback-store] SUPABASE env missing; lead storage unavailable");
  return new UnavailableCallbackStore();
}

export const callbackStore: CallbackStore = pickStore();
