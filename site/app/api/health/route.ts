import { NextResponse } from 'next/server';
import { logger } from '../../../lib/logger';
import { handleApiError } from '../../../lib/api-errorHandler';
import {
  fetchSupabaseRows,
  readSupabaseRestConfig,
} from '../../../lib/factory/supabase-rest';

/**
 * سرویس سلامت — Q4-03.
 *
 * نسخهٔ قبلی همیشه `{status:"ok"}` با کد ۲۰۰ برمی‌گرداند و هیچ چیز را نمی‌سنجید.
 * نتیجه: پایش uptime سبز می‌ماند حتی وقتی دیتابیس خوابیده بود و اولین نشانهٔ
 * خرابی، فرم‌های ۵۰۰ بود. اندپوینتی که همیشه ok می‌گوید بدتر از نداشتنش است،
 * چون پایشگر را دروغگو می‌کند.
 *
 * حالا یک خواندن واقعی و کوچک از دیتابیس انجام می‌شود:
 *   - سالم      → ۲۰۰، `db: "ok"`
 *   - خطا        → ۵۰۳، `db: "down"`
 *   - پیکربندی نیست (محیط محلی/CI) → ۲۰۰، `db: "unconfigured"` و `status: "ok"`
 *
 * حالت سوم عمدی است: بدون سکرت، یک ۵۰۳ در هر بیلد محلی هشدار بی‌معنا می‌ساخت.
 * ولی در تولید که سکرت هست، هر خطای دیتابیس واقعاً ۵۰۳ می‌دهد.
 *
 * جدول `site_settings` انتخاب شد چون کوچک است و همیشه وجود دارد.
 */

const DB_TIMEOUT_MS = 2000;

export async function GET(): Promise<NextResponse> {
  const context = { route: '/api/health', method: 'GET' };

  try {
    const config = readSupabaseRestConfig();

    if (!config) {
      logger.info('Health check: database not configured', context);
      return NextResponse.json(
        {
          status: 'ok',
          database: 'unconfigured',
          timestamp: new Date().toISOString(),
        },
        { status: 200 },
      );
    }

    try {
      await fetchSupabaseRows<{ key: string }>(
        'site_settings',
        new URLSearchParams({ select: 'key', limit: '1' }),
        config,
        DB_TIMEOUT_MS,
      );
    } catch (dbError) {
      // متن خطای دیتابیس لاگ می‌شود ولی در پاسخ نمی‌آید: ممکن است آدرس
      // داخلی یا نام جدول را لو بدهد.
      logger.error(
        'Health check: database unreachable',
        context,
        dbError instanceof Error ? dbError.message : String(dbError),
      );
      return NextResponse.json(
        {
          status: 'degraded',
          database: 'down',
          timestamp: new Date().toISOString(),
        },
        { status: 503 },
      );
    }

    logger.info('Health check requested', context);
    return NextResponse.json(
      {
        status: 'ok',
        database: 'ok',
        timestamp: new Date().toISOString(),
      },
      { status: 200 },
    );
  } catch (error) {
    return handleApiError(error, context);
  }
}