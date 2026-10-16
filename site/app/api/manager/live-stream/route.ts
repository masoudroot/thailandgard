/**
 * GET /api/manager/live-stream: استریم زنده‌ی رویدادهای عملیاتی (جدول operation_events).
 *
 * دو حالت دارد:
 *   ۱) JSON (پیش‌فرض): تاریخچه‌ی رویدادهای یک چرخه (اختیاری: فقط یک تیم)؛
 *      پارامترها: cycle_id (اختیاری؛ پیش‌فرض چرخه‌ی فعال)، team (اختیاری)،
 *      limit (پیش‌فرض ۳۰۰، سقف ۱۰۰۰)، since_ts / since_id (کرسر برای تازه‌ها).
 *   ۲) SSE (با `stream=1` یا Accept: text/event-stream): اتصال زنده؛
 *      هر ۲ ثانیه رویدادهای جدید همان چرخه/تیم فرستاده می‌شود،
 *      هر ۱۵ ثانیه heartbeat، و حداکثر عمر اتصال ۵ دقیقه است.
 *
 * احراز: اول توکن مدیریتی (هدر Authorization: Bearer <token>)؛
 * برای مرورگر (EventSource هدر سفارشی نمی‌فرستد) سشن ادمین داشبورد
 * (کوکی tg-admin) هم پذیرفته می‌شود. بدون هیچ‌کدام: ۴۰۱.
 * پرامپت‌ها و پاسخ‌های مدل فقط از همین مسیرِ احرازشده برمی‌گردند.
 */

import type { NextRequest } from 'next/server';
import { fail, getSupabase, ok } from '../../../../lib/dashboard/api';
import { requireManagerAuth } from '../../../../lib/dashboard/manager-auth';
import { isAuthenticated } from '../../../../lib/dashboard/auth';
import { ACTIVE_CYCLE_STATUSES } from '../../../../lib/dashboard/types';

export const dynamic = 'force-dynamic';

export interface OperationEvent {
  id: string;
  cycle_id: string;
  team: string | null;
  event_type: string;
  payload: unknown;
  created_at: string;
}

const EVENT_COLS = 'id, cycle_id, team, event_type, payload, created_at';

const POLL_MS = 2000;
const HEARTBEAT_MS = 15000;
const MAX_AGE_MS = 5 * 60 * 1000;
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

/** کوئری پایه‌ی رویدادها با فیلتر چرخه/تیم. */
function baseQuery(filter: EventFilter) {
  let q = getSupabase().from('operation_events').select(EVENT_COLS).eq('cycle_id', filter.cycleId);
  if (filter.team) q = q.eq('team', filter.team);
  return q;
}

/**
 * رویدادهای تازه‌تر از کرسر (created_at, id): کرسر ترکیبی چون دو رویداد
 * می‌توانند دقیقاً یک created_at داشته باشند.
 */
async function fetchNewEvents(
  filter: EventFilter,
  sinceTs: string | null,
  sinceId: string | null,
): Promise<{ events: OperationEvent[]; error: string | null }> {
  try {
    let q = baseQuery(filter).order('created_at', { ascending: true }).order('id', { ascending: true }).limit(500);
    if (sinceTs) q = q.gt('created_at', sinceTs);
    const { data, error } = await q;
    if (error) return { events: [], error: error.message };
    let rows = (data ?? []) as OperationEvent[];
    // جبران تساوی created_at: فقط ردیف‌های بعد از کرسرِ id در همان لحظه
    if (sinceTs && sinceId) {
      rows = rows.filter((r) => r.created_at > sinceTs || (r.created_at === sinceTs && r.id > sinceId));
    }
    return { events: rows, error: null };
  } catch (err) {
    return { events: [], error: err instanceof Error ? err.message : 'خطای ناشناخته' };
  }
}

/** تاریخچه‌ی رویدادها: جدیدترین اول، تا سقف limit. */
async function fetchHistory(
  filter: EventFilter,
  limit: number,
): Promise<{ events: OperationEvent[]; error: string | null }> {
  try {
    const { data, error } = await baseQuery(filter)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit);
    if (error) return { events: [], error: error.message };
    return { events: ((data ?? []) as OperationEvent[]), error: null };
  } catch (err) {
    return { events: [], error: err instanceof Error ? err.message : 'خطای ناشناخته' };
  }
}

/** GET /api/manager/live-stream */
export async function GET(request: NextRequest): Promise<Response> {
  const denied = await authorize(request);
  if (denied) return denied;

  let sb;
  try {
    sb = getSupabase();
  } catch {
    return fail('اتصال به دیتابیس برقرار نیست. اتصال را در بخش تنظیمات بررسی کنید.', 503);
  }
  void sb;

  const params = request.nextUrl.searchParams;
  const team = params.get('team')?.trim() || null;
  const limitRaw = Number(params.get('limit') ?? DEFAULT_LIMIT);
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(MAX_LIMIT, Math.floor(limitRaw))) : DEFAULT_LIMIT;
  const sinceTs = params.get('since_ts');
  const sinceId = params.get('since_id');

  let cycleId = params.get('cycle_id')?.trim() || null;
  if (!cycleId) {
    cycleId = await getActiveCycleId();
    if (!cycleId) return fail('در حال حاضر چرخه‌ای در حال اجرا نیست.', 404);
  }
  const filter: EventFilter = { cycleId, team };

  const wantsStream =
    params.get('stream') === '1' || (request.headers.get('accept') ?? '').includes('text/event-stream');

  // ---- حالت JSON: تاریخچه ----
  if (!wantsStream) {
    const { events, error } = await fetchHistory(filter, limit);
    if (error) {
      // جدول هنوز ساخته نشده؟ مثل بقیه‌ی لایه‌ی زنده، صادقانه ۵۰۳ بده.
      if (/does not exist|relation/i.test(error)) {
        return fail('جدول operation_events هنوز در پایگاه داده ساخته نشده است.', 503);
      }
      return fail(`خطا در خواندن رویدادها: ${error}`);
    }
    return ok({ cycle_id: cycleId, events });
  }

  // ---- حالت SSE ----
  const encoder = new TextEncoder();
  let closed = false;
  const startedAt = Date.now();
  let cursorTs: string | null = sinceTs;
  let cursorId: string | null = sinceId;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          closed = true;
        }
      };

      send('ready', { cycle_id: cycleId, team, server_time: new Date().toISOString() });

      let lastHeartbeat = Date.now();
      while (!closed && !request.signal.aborted) {
        // پایان عمر اتصال: ۵ دقیقه؛ کلاینت با کرسر reconnect می‌کند
        if (Date.now() - startedAt >= MAX_AGE_MS) {
          send('close', { reason: 'max-age', since_ts: cursorTs, since_id: cursorId });
          break;
        }

        const { events, error } = await fetchNewEvents(filter, cursorTs, cursorId);
        if (error) {
          send('error', { message: error });
          break;
        }
        for (const ev of events) {
          send('event', ev);
          cursorTs = ev.created_at;
          cursorId = ev.id;
        }

        if (Date.now() - lastHeartbeat >= HEARTBEAT_MS) {
          send('ping', { ts: new Date().toISOString() });
          lastHeartbeat = Date.now();
        }

        await new Promise<void>((resolve) => {
          const t = setTimeout(resolve, POLL_MS);
          request.signal.addEventListener('abort', () => {
            clearTimeout(t);
            resolve();
          });
        });
      }
      closed = true;
      try {
        controller.close();
      } catch {
        /* قبلاً بسته شده */
      }
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
