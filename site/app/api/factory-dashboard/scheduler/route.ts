/**
 * مسیر API ساعت داخلی داشبورد (THG-SCHED-02).
 * GET: کارها، اجراهای اخیر و وضعیت نگهبانی. PATCH: روشن/خاموش، فاصله
 * یا ساعت روزانهٔ یک کار. هر دو فقط با نشست ادمین معتبر؛ توکن سروری
 * این‌جا نیست و متن خام خطای دیتابیس هرگز برنمی‌گردد.
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { guideAdminOrigin } from "@/lib/factory-dashboard/guide-admin";
import {
  getSchedulerOverview,
  updateSchedulerJob,
  type SchedulerJobPatch,
} from "@/lib/factory-dashboard/scheduler";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const origin = await guideAdminOrigin(req);
  if (origin === null) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }
  const result = await getSchedulerOverview();
  if (!result.ok) {
    return NextResponse.json({ ok: false, reason: result.reason }, { status: 503 });
  }
  return NextResponse.json({ ok: true, data: result.data });
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const origin = await guideAdminOrigin(req);
  if (origin === null) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }
  let body: unknown;
  try {
    body = (await req.json()) as unknown;
  } catch {
    return NextResponse.json({ ok: false, reason: "بدنهٔ نامعتبر." }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ ok: false, reason: "بدنهٔ نامعتبر." }, { status: 400 });
  }
  const input = body as Record<string, unknown>;
  if (typeof input.job_key !== "string" || input.job_key.length === 0) {
    return NextResponse.json({ ok: false, reason: "job_key لازم است." }, { status: 400 });
  }
  const patch: SchedulerJobPatch = {};
  if (typeof input.enabled === "boolean") patch.enabled = input.enabled;
  if (typeof input.interval_minutes === "number") patch.interval_minutes = input.interval_minutes;
  if (typeof input.daily_utc_time === "string") patch.daily_utc_time = input.daily_utc_time;
  const result = await updateSchedulerJob(input.job_key, patch);
  if (!result.ok) {
    return NextResponse.json({ ok: false, reason: result.reason }, { status: 400 });
  }
  return NextResponse.json({ ok: true, job: result.job });
}
