import { NextResponse } from 'next/server';
import { getPool } from '@/lib/factory/db';
import { checkFactoryHealth } from '@/lib/factory/health';
import { getTemporalClient } from '@/lib/factory/temporal/client';

export async function GET(): Promise<NextResponse> {
  try {
    const health = await checkFactoryHealth({
      dbCheck: async () => {
        await getPool().query('SELECT 1');
      },
      temporalCheck: async () => {
        const client = await getTemporalClient();
        await client.connection.workflowService.getSystemInfo({});
      },
    });

    return NextResponse.json(health, { status: health.ok ? 200 : 503 });
  } catch {
    return NextResponse.json(
      { ok: false, db: 'error', temporal: 'error' },
      { status: 503 },
    );
  }
}
