/**
 * GET /api/manager/status: تصویر لحظه‌ای کامل داشبورد برای «مدیر داشبورد».
 *
 * احراز: هدر Authorization: Bearer <token>
 * خروجی: وضعیت اتصال‌ها، درگاه‌ها و مدل‌ها، آخرین چرخه، صف، خطاهای جاری،
 * آخرین نرخ ارز: همه در یک پاسخ. هیچ مقدار حساسی (کلید/توکن خام) برنمی‌گردد.
 */

import { fail, getSupabase, ok } from '../../../../lib/dashboard/api';
import { requireManagerAuth } from '../../../../lib/dashboard/manager-auth';
import { getSetting } from '../../../../lib/dashboard/settings';
import {
  listEndpointsMasked,
  getDefaultModel,
  getEmbeddingModel,
  getTeamModelMap,
} from '../../../../lib/dashboard/llm-endpoints';
import { getQueueStats } from '../../../../lib/dashboard/queue';
import { getCurrentErrors } from '../../../../lib/dashboard/errors';

/* نکته: `dynamic = 'force-dynamic'` با `cacheComponents` ناسازگار است و بیلد را
   می‌شکند (مثل روت live-stream). این روت ذاتاً داینامیک است (خواندن هدر
   Authorization + کوئری دیتابیس) و نیازی به اعلام صریح ندارد. تازگی داده را
   fetch بدون کش در getSupabase تضمین می‌کند. */

/** بررسی سبک اتصال پایگاه داده. */
async function checkDatabase(): Promise<{ connected: boolean; latencyMs: number | null }> {
  const started = Date.now();
  try {
    const { error } = await getSupabase().from('settings').select('key').limit(1);
    if (error) return { connected: false, latencyMs: null };
    return { connected: true, latencyMs: Date.now() - started };
  } catch {
    return { connected: false, latencyMs: null };
  }
}

/** GET /api/manager/status */
export async function GET(request: Request): Promise<Response> {
  const auth = await requireManagerAuth(request);
  if (auth instanceof Response) return auth;

  try {
    const sb = getSupabase();

    const [
      db,
      telegramToken,
      githubToken,
      endpoints,
      defaultModel,
      embeddingModel,
      teamModels,
      queue,
      errors,
    ] = await Promise.all([
      checkDatabase(),
      getSetting<string | null>('telegram_bot_token', null),
      getSetting<string | { token?: string } | null>('github_token', null),
      listEndpointsMasked().catch(() => []),
      getDefaultModel().catch(() => null),
      getEmbeddingModel().catch(() => null),
      getTeamModelMap().catch(() => ({})),
      getQueueStats().catch(() => null),
      getCurrentErrors().catch(() => []),
    ]);

    // آخرین چرخه
    let latestCycle: unknown = null;
    try {
      const { data: cycle } = await sb
        .from('cycles')
        .select('id, started_at, finished_at, status')
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      latestCycle = cycle ?? null;
    } catch {
      /* نادیده */
    }

    // آخرین نرخ ارز
    let latestRates: unknown = null;
    try {
      const { data } = await sb
        .from('exchange_rates')
        .select('fetched_at, source')
        .order('fetched_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      latestRates = data ?? null;
    } catch {
      /* نادیده */
    }

    const githubConfigured =
      !!githubToken ||
      (typeof githubToken === 'object' && githubToken !== null && !!(githubToken as { token?: string }).token) ||
      !!process.env.GITHUB_TOKEN;

    return ok({
      at: new Date().toISOString(),
      connections: {
        database: db,
        telegram: { configured: !!telegramToken || !!process.env.TELEGRAM_BOT_TOKEN },
        github: { configured: githubConfigured },
      },
      llm: {
        endpoints,
        defaultModel,
        embeddingModel,
        teamModels,
      },
      latestCycle,
      queue,
      errors,
      latestRates,
    });
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'خطای نامشخص در خواندن وضعیت');
  }
}
