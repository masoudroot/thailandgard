import { NextResponse } from 'next/server';
import { getPool } from '@/lib/factory/db';
import { checkFactoryHealth } from '@/lib/factory/health';
import { checkTickHealth, tickDbConfig, type TickHealth } from '@/lib/factory/tick/health';

/**
 * GET /api/factory/health در R2.
 * شکل قبلی ({ok, db}) حفظ شده است و وضعیت واقعی Tick از دیتابیس سایت
 * به آن اضافه می‌شود، وقتی Tick در این محیط پیکربندی شده باشد.
 * ترکیب fail-closed است: هر طرف پیکربندی‌شده که خراب باشد، کل health
 * را 503 می‌کند؛ وقتی هیچ طرفی پیکربندی نشده باشد هم 503 برمی‌گردد
 * (رفتار قبلی در محیط بدون پیکربندی). هیچ Secret یا متن خطا در
 * خروجی نیست.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const opsConfigured = Boolean(process.env.FACTORY_DATABASE_URL);
    const opsHealth = opsConfigured
      ? await checkFactoryHealth({
          dbCheck: async () => {
            await getPool().query('SELECT 1');
          },
        })
      : null;

    const tickCfg = tickDbConfig();
    let tick: TickHealth | null = null;
    let tickOk: boolean | null = null;
    if (tickCfg) {
      try {
        tick = await checkTickHealth(tickCfg);
        tickOk = true;
      } catch {
        tickOk = false;
      }
    }

    const opsOk = opsHealth === null ? null : opsHealth.ok;
    const ok =
      (opsOk !== false && tickOk !== false) && (opsOk !== null || tickOk !== null);
    const db = opsOk === true || tickOk === true ? 'ok' : 'error';
    return NextResponse.json({ ok, db, ...(tick ? { tick } : {}) }, { status: ok ? 200 : 503 });
  } catch {
    return NextResponse.json({ ok: false, db: 'error' }, { status: 503 });
  }
}
