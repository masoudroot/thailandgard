/**
 * GET /api/manager/live-stream: تاریخچه‌ی رویدادهای عملیاتی (جدول operation_events).
 *
 * پارامترها: cycle_id (اختیاری؛ پیش‌فرض چرخه‌ی فعال)، team (اختیاری)،
 * limit (پیش‌فرض ۳۰۰، سقف ۱۰۰۰). کلاینت با پولینگ هر ۵ ثانیه تازه‌ها را می‌گیرد.
 *
 * احراز: اول توکن مدیریتی (هدر Authorization: Bearer <token>)؛
 * برای مرورگر سشن ادمین داشبورد (کوکی tg-admin) هم پذیرفته می‌شود.
 * پرامپت‌ها و پاسخ‌های مدل فقط از همین مسیرِ احرازشده برمی‌گردند.
 */

import type { NextRequest } from 'next/server';
import { fail, getSupabase, ok } from '../../../../lib/dashboard/api';
import { requireManagerAuth } from '../../../../lib/dashboard/manager-auth';
import { isAuthenticated } from '../../../../lib/dashboard/auth';
import { ACTIVE_CYCLE_STATUSES } from '../../../../lib/dashboard/types';

export interface OperationEvent {
  id: string;
  cycle_id: string;
  team: string | null;
  event_type: string;
  payload: unknown;
  created_at: string;
}

const EVENT_COLS = 'id, cycle_id, team, event_type, payload, created_at';
const DEFAULT_LIMIT = 300;
const MAX_LIMIT = 1000;

/**
 * احراز دوگانه: توکن مدیریتی برای عامل‌ها/اسکریپت‌ها، سشن ادمین برای مرورگر.
 * null یعنی احراز موفق؛ در غیر این صورت همان پاسخ ۴۰۱ requireManagerAuth.
 */
async function authorize(request: NextRequest): Promise<Response | null> {
  const viaToken = await requireManagerAuth(request);
  if (!(viaToken instanceof Response)) return null;
  if (await isAuthenticated(request)) return null;
  return viaToken;
}

/** جدیدترین چرخه‌ی فعال، یا null اگر چرخه‌ای در حال اجرا نباشد. */
async function getActiveCycleId(): Promise<string | null> {
  const { data, error } = await getSupabase()
    .from('cycles')
    .select('id')
    .in('status', ACTIVE_CYCLE_STATUSES)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return (data as { id: string }).id;
}

interface EventFilter {
  cycleId: string;
  team: string | null;
}

/** تاریخچه‌ی رویدادها: جدیدترین اول، تا سقف limit. */
async function fetchHistory(
  filter: EventFilter,
  limit: number,
): Promise<{ events: OperationEvent[]; error: string | null }> {
  try {
    let q = getSupabase()
      .from('operation_events')
      .select(EVENT_COLS)
      .eq('cycle_id', filter.cycleId);
    if (filter.team) q = q.eq('team', filter.team);
    const { data, error } = await q
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit);
    if (error) return { events: [], error: error.message };
    return { events: (data ?? []) as OperationEvent[], error: null };
  } catch (err) {
    return { events: [], error: err instanceof Error ? err.message : 'خطای ناشناخته' };
  }
}

/** GET /api/manager/live-stream */
export async function GET(request: NextRequest): Promise<Response> {
  const denied = await authorize(request);
  if (denied) return denied;

  try {
    getSupabase();
  } catch {
    return fail('اتصال به دیتابیس برقرار نیست. اتصال را در بخش تنظیمات بررسی کنید.', 503);
  }

  const params = request.nextUrl.searchParams;
  const team = params.get('team')?.trim() || null;
  const limitRaw = Number(params.get('limit') ?? DEFAULT_LIMIT);
  const limit = Number.isFinite(limitRaw)
    ? Math.max(1, Math.min(MAX_LIMIT, Math.floor(limitRaw)))
    : DEFAULT_LIMIT;

  let cycleId = params.get('cycle_id')?.trim() || null;
  if (!cycleId) {
    cycleId = await getActiveCycleId();
    if (!cycleId) return fail('در حال حاضر چرخه‌ای در حال اجرا نیست.', 404);
  }

  const { events, error } = await fetchHistory({ cycleId, team }, limit);
  if (error) {
    if (/does not exist|relation/i.test(error)) {
      return fail('جدول operation_events هنوز در پایگاه داده ساخته نشده است.', 503);
    }
    return fail(`خطا در خواندن رویدادها: ${error}`);
  }
  return ok({ cycle_id: cycleId, events });
}
