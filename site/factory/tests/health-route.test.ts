import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Q4-03 regression test for /api/health.
 *
 * The bug this locks down: the endpoint used to answer 200 `{status:"ok"}`
 * without touching anything. The uptime probe therefore stayed green while the
 * database was asleep, and the first sign of trouble was a 500 on the lead
 * forms. A health endpoint that cannot fail is a monitor that lies.
 */

const readConfig = vi.fn();
const fetchRows = vi.fn();

vi.mock('@/lib/factory/supabase-rest', () => ({
  readSupabaseRestConfig: () => readConfig(),
  fetchSupabaseRows: (...args: unknown[]) => fetchRows(...args),
}));

async function get() {
  const { GET } = await import('@/app/api/health/route');
  return GET();
}

const CONFIG = { url: 'https://db.example.test', key: 'service-role-key' };

describe('GET /api/health', () => {
  beforeEach(() => {
    readConfig.mockReset();
    fetchRows.mockReset();
  });

  it('answers 200 and reports the database as ok when a read succeeds', async () => {
    readConfig.mockReturnValue(CONFIG);
    fetchRows.mockResolvedValue([{ key: 'x' }]);

    const res = await get();
    const body = (await res.json()) as { status: string; database: string };

    expect(res.status).toBe(200);
    expect(body.status).toBe('ok');
    expect(body.database).toBe('ok');
  });

  it('reads a real table, not just a constant', async () => {
    readConfig.mockReturnValue(CONFIG);
    fetchRows.mockResolvedValue([]);

    await get();

    expect(fetchRows).toHaveBeenCalledTimes(1);
    expect(fetchRows.mock.calls[0][0]).toBe('site_settings');
  });

  it('answers 503 when the database rejects the read', async () => {
    readConfig.mockReturnValue(CONFIG);
    fetchRows.mockRejectedValue(new Error('SUPABASE_REQUEST_FAILED site_settings 500'));

    const res = await get();
    const body = (await res.json()) as { status: string; database: string };

    expect(res.status).toBe(503);
    expect(body.status).toBe('degraded');
    expect(body.database).toBe('down');
  });

  it('never leaks the database error text or the key in the response', async () => {
    readConfig.mockReturnValue(CONFIG);
    fetchRows.mockRejectedValue(
      new Error('SUPABASE_REQUEST_FAILED site_settings 401 key=service-role-key'),
    );

    const res = await get();
    const raw = JSON.stringify(await res.json());

    expect(raw).not.toContain('service-role-key');
    expect(raw).not.toContain('SUPABASE_REQUEST_FAILED');
    expect(raw).not.toContain('db.example.test');
  });

  it('stays green without credentials, so local and CI builds do not page anyone', async () => {
    readConfig.mockReturnValue(null);

    const res = await get();
    const body = (await res.json()) as { status: string; database: string };

    expect(res.status).toBe(200);
    expect(body.status).toBe('ok');
    expect(body.database).toBe('unconfigured');
    expect(fetchRows).not.toHaveBeenCalled();
  });

  it('still answers JSON if reading the config itself throws', async () => {
    readConfig.mockImplementation(() => {
      throw new Error('unexpected');
    });

    const res = await get();

    expect([500, 503]).toContain(res.status);
    expect(res.headers.get('content-type')).toContain('application/json');
  });
});