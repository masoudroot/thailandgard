import { beforeEach, describe, expect, it, vi } from 'vitest';

const postgrestGet = vi.fn();

vi.mock('@/lib/factory/tick/internal-api', () => ({
  dbConfig: () => ({ url: 'https://staging.example.test', serviceKey: 'service-role-key' }),
  postgrestGet: (...args: unknown[]) => postgrestGet(...args),
}));

async function load() {
  return import('@/lib/factory/tick/health');
}

describe('checkTickHealth', () => {
  beforeEach(() => {
    postgrestGet.mockReset();
  });

  it('reports settings, step counts, open outbox and the latest run', async () => {
    postgrestGet
      .mockResolvedValueOnce([
        { key: 'factory_paused', value: 'false' },
        { key: 'data_publishing_enabled', value: 'true' },
      ])
      .mockResolvedValueOnce([
        { status: 'queued' },
        { status: 'queued' },
        { status: 'claimed' },
        { status: 'succeeded' },
      ])
      .mockResolvedValueOnce([{ status: 'pending' }, { status: 'succeeded' }, { status: 'failed' }])
      .mockResolvedValueOnce([{ run_status: 'completed', finished_at: '2026-10-30T10:00:00Z' }]);

    const { checkTickHealth } = await load();
    const health = await checkTickHealth({ url: 'https://staging.example.test', serviceKey: 'service-role-key' });

    expect(health.configured).toBe(true);
    expect(health.paused).toBe(false);
    expect(health.publishingEnabled).toBe(true);
    expect(health.stepsQueued).toBe(2);
    expect(health.stepsClaimed).toBe(1);
    expect(health.outboxOpen).toBe(1);
    expect(health.lastRun).toEqual({ status: 'completed', finishedAt: '2026-10-30T10:00:00Z' });
  });

  it('fails closed when settings are missing', async () => {
    postgrestGet.mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    const { checkTickHealth } = await load();
    const health = await checkTickHealth({ url: 'https://staging.example.test', serviceKey: 'service-role-key' });

    expect(health.paused).toBe(true);
    expect(health.publishingEnabled).toBe(false);
    expect(health.lastRun).toBe(null);
  });

  it('throws when a read fails so the route can answer 503', async () => {
    postgrestGet.mockRejectedValueOnce(new Error('postgrest get failed with 500'));

    const { checkTickHealth } = await load();
    await expect(
      checkTickHealth({ url: 'https://staging.example.test', serviceKey: 'service-role-key' }),
    ).rejects.toThrow();
  });

  it('queries real factory_runs columns (started_at, not created_at)', async () => {
    postgrestGet
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const { checkTickHealth } = await load();
    await checkTickHealth({ url: 'https://staging.example.test', serviceKey: 'service-role-key' });

    const paths = postgrestGet.mock.calls.map((call) => call[1] as string);
    expect(paths).toContain('factory_settings?select=key,value');
    expect(paths).toContain('factory_work_steps?select=status');
    expect(paths).toContain('factory_outbox_events?select=status');
    expect(paths).toContain('factory_runs?order=started_at.desc&limit=1&select=run_status,finished_at');
  });

  it('never returns secrets or error text', async () => {
    postgrestGet
      .mockResolvedValueOnce([{ key: 'factory_paused', value: 'false' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const { checkTickHealth } = await load();
    const health = await checkTickHealth({ url: 'https://staging.example.test', serviceKey: 'service-role-key' });
    const raw = JSON.stringify(health);
    expect(raw).not.toContain('service-role-key');
    expect(raw).not.toContain('staging.example.test');
  });
});
