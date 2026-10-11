/**
 * ذخیره‌سازی درخواست‌های تماس.
 *
 * قرارداد: هر پیاده‌سازی باید یک متد `save` داشته باشد.
 * الان: سوپابیس (جدول `leads`)؛ اگر متغیرهای محیطی نباشند، JSONL محلی.
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
  createdAt: string;
}

export interface CallbackStore {
  save(request: CallbackRequest): Promise<void>;
}

import { appendFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { writeLeadAlertSummary } from "./lead-alert";
import { getTour } from "./tours";

const DATA_DIR = join(process.cwd(), "data");
const FILE_PATH = join(DATA_DIR, "callbacks.jsonl");

class JsonlCallbackStore implements CallbackStore {
  async save(request: CallbackRequest): Promise<void> {
    await mkdir(DATA_DIR, { recursive: true });
    await appendFile(FILE_PATH, JSON.stringify(request) + "\n", "utf8");
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
  console.warn("[callback-store] SUPABASE env missing; falling back to JSONL");
  return new JsonlCallbackStore();
}

export const callbackStore: CallbackStore = pickStore();
