import { NextResponse } from 'next/server';
import { getPool } from '@/lib/factory/db';
import { checkFactoryHealth } from '@/lib/factory/health';

export async function GET(): Promise<NextResponse> {
  try {
    const health = await checkFactoryHealth({
      dbCheck: async () => {
        await getPool().query('SELECT 1');
      },
    });

    return NextResponse.json(health, { status: health.ok ? 200 : 503 });
  } catch {
    return NextResponse.json({ ok: false, db: 'error' }, { status: 503 });
  }
}