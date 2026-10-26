import { describe, expect, it, vi } from 'vitest';
import { buildReport, parseArgs, readConfig } from '../scripts/lead-weekly';

const NOW = Date.parse('2026-10-26T09:00:00.000Z');

function fakeFetch(rows: Record<string, unknown[]>) {
  return vi.fn(async (url: string) => {
    const table = String(url).match(/rest\/v1\/([a-z_]+)/)?.[1] ?? '';
    return {
      ok: true,
      status: 200,
      json: async () => rows[table] ?? [],
    } as unknown as Response;
  });
}

describe('lead-weekly: arguments', () => {
  it('defaults to now and no output file', () => {
    expect(parseArgs([], NOW)).toEqual({ nowMs: NOW });
  });

  it('reads --out and --now', () => {
    const args = parseArgs(['--out', 'docs/ops/report.md', '--now', '2026-10-26T09:00:00Z'], NOW);
    expect(args.out).toBe('docs/ops/report.md');
    expect(args.nowMs).toBe(NOW);
  });

  it('rejects an unknown flag or a broken date', () => {
    expect(() => parseArgs(['--weird'], NOW)).toThrow(/ناشناخته/);
    expect(() => parseArgs(['--now', 'دیروز'], NOW)).toThrow(/ISO/);
    expect(() => parseArgs(['--out'], NOW)).toThrow(/مسیر/);
  });
});

describe('lead-weekly: config', () => {
  it('accepts SUPABASE_URL and falls back to the public variable', () => {
    expect(readConfig({ SUPABASE_URL: 'https://a.test', SUPABASE_SERVICE_ROLE_KEY: 'k' })).toEqual({
      url: 'https://a.test',
      key: 'k',
    });
    expect(readConfig({ NEXT_PUBLIC_SUPABASE_URL: 'https://b.test/', SUPABASE_SERVICE_ROLE_KEY: 'k' })).toEqual({
      url: 'https://b.test',
      key: 'k',
    });
  });

  it('returns null when either half is missing', () => {
    expect(readConfig({ SUPABASE_URL: 'https://a.test' })).toBeNull();
    expect(readConfig({ SUPABASE_SERVICE_ROLE_KEY: 'k' })).toBeNull();
    expect(readConfig({ SUPABASE_URL: ' ', SUPABASE_SERVICE_ROLE_KEY: 'k' })).toBeNull();
  });
});

describe('lead-weekly: report build', () => {
  const config = { url: 'https://a.test', key: 'service-key' };

  it('asks only for aggregate columns, never personal fields', async () => {
    const fetchImpl = fakeFetch({ leads: [], call_clicks: [] });
    await buildReport(config, NOW, fetchImpl as unknown as typeof fetch);
    const urls = fetchImpl.mock.calls.map((call) => String(call[0]));
    const leadsUrl = urls.find((url) => url.includes('/leads?')) ?? '';
    expect(leadsUrl).toContain('select=created_at,source,tour_slug,status');
    for (const banned of ['name', 'phone', 'mobile', 'message']) {
      expect(leadsUrl).not.toContain(banned);
    }
  });

  it('reads fourteen days so the previous week can be compared', async () => {
    const fetchImpl = fakeFetch({ leads: [], call_clicks: [] });
    await buildReport(config, NOW, fetchImpl as unknown as typeof fetch);
    const url = String(fetchImpl.mock.calls[0][0]);
    const from = url.match(/created_at=gte\.([^&]+)/)?.[1] ?? '';
    expect(Date.parse(from)).toBe(NOW - 14 * 86_400_000);
  });

  it('renders real counts from the fetched rows', async () => {
    const inside = new Date(NOW - 2 * 86_400_000).toISOString();
    const fetchImpl = fakeFetch({
      leads: [{ created_at: inside, source: 'organic|tour/phuket-7-days|none', tour_slug: 'phuket-7-days', status: 'new' }],
      call_clicks: [
        { created_at: inside, page: '/tours/phuket-7-days', source: 'organic|tours/phuket-7-days|none' },
      ],
    });
    const report = await buildReport(config, NOW, fetchImpl as unknown as typeof fetch);
    expect(report).toContain('کلیک تماس (K1): ۱');
    expect(report).toContain('لید ثبت‌شده (K3): ۱');
    expect(report).toContain('| organic | ۱ | ۱ |');
  });

  it('fails loudly when the database answers with an error', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 401, json: async () => [] }) as unknown as Response);
    await expect(buildReport(config, NOW, fetchImpl as unknown as typeof fetch)).rejects.toThrow(/HTTP 401/);
  });
});
