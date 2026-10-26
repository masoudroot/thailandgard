import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * قرارداد خلاصه‌نویس هشدار لید (باگ #229).
 *
 * این تست چیزی را قفل می‌کند که یک بار خاموش شکسته بود: بدنهٔ درج باید همهٔ
 * ستون‌های اجباری جدول `intel_feed` را داشته باشد، مخصوصاً `source_url`.
 * بدون آن، سوپابیس ۲۳۵۰۲ می‌دهد و کد فقط `console.warn` می‌کند؛ یعنی لید
 * می‌آید و هیچ‌کس خبردار نمی‌شود.
 */

const ENV_KEYS = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] as const;
const saved: Record<string, string | undefined> = {};

async function loadModule(env: Partial<Record<(typeof ENV_KEYS)[number], string>>) {
  vi.resetModules();
  for (const key of ENV_KEYS) {
    if (key in env) process.env[key] = env[key];
    else delete process.env[key];
  }
  return import('@/lib/lead-alert');
}

/** پاسخ ساختگی با متدهای fetch که کد استفاده می‌کند. */
function response(ok: boolean, status: number, body = '') {
  return {
    ok,
    status,
    text: async () => body,
    json: async () => ({}),
  } as unknown as Response;
}

beforeEach(() => {
  for (const key of ENV_KEYS) saved[key] = process.env[key];
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const input = {
  leadId: '7cd2f280-9eac-42ee-9018-8344acb8eda8',
  status: 'new' as const,
  createdAt: '2026-10-26T08:22:42.000Z',
  source: 'direct|tours/phuket-7-days|none',
  tour: 'تور پوکت ۷ روزه',
};

describe('lead alert summary payload', () => {
  it('sends every NOT NULL column the feed table requires', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(true, 201));
    vi.stubGlobal('fetch', fetchMock);
    const { writeLeadAlertSummary, LEAD_ALERT_SOURCE_URL } = await loadModule({
      NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-key',
    });

    const result = await writeLeadAlertSummary(input);
    expect(result).toEqual({ ok: true });

    const body = JSON.parse(String(fetchMock.mock.calls[0][1].body)) as Record<string, unknown>;
    expect(body.source_url).toBe(LEAD_ALERT_SOURCE_URL);
    expect(body.source_name).toBe('lead-alert');
    expect(body.source_url).toBeTruthy();
    expect(body.tags).toEqual(['lead-alert']);
    expect(String(body.title)).toMatch(/^لید تازه #7cd2f$/);
  });

  it('never carries customer name, phone or message', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(true, 201));
    vi.stubGlobal('fetch', fetchMock);
    const { writeLeadAlertSummary } = await loadModule({
      NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-key',
    });
    await writeLeadAlertSummary(input);

    const payload = String(fetchMock.mock.calls[0][1].body);
    for (const banned of ['"phone"', '"mobile"', '"name"', '"message"', '9120', 'تست قیف']) {
      expect(payload).not.toContain(banned);
    }
  });

  it('writes a status change row with its timestamp', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(true, 201));
    vi.stubGlobal('fetch', fetchMock);
    const { writeLeadAlertSummary } = await loadModule({
      NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-key',
    });
    await writeLeadAlertSummary({ ...input, status: 'contacted', changedAt: '2026-10-26T10:00:00.000Z' });

    const body = JSON.parse(String(fetchMock.mock.calls[0][1].body)) as Record<string, unknown>;
    const summary = JSON.parse(String(body.summary)) as Record<string, string>;
    expect(String(body.title)).toMatch(/^تغییر وضعیت لید #7cd2f$/);
    expect(summary.changed_at).toBe('2026-10-26T10:00:00.000Z');
    expect(summary.next_touch).toBeTruthy();
  });
});

describe('lead alert failure handling', () => {
  it('reports not ok on a rejected insert and mentions the status', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(response(false, 400, '{"code":"23502","message":"null value in column"}'));
    vi.stubGlobal('fetch', fetchMock);
    const { writeLeadAlertSummary } = await loadModule({
      NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-key',
    });

    const result = await writeLeadAlertSummary(input);
    expect(result).toEqual({ ok: false });
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('400'));
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('23502'));
  });

  it('skips without a network call when the environment is missing', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { writeLeadAlertSummary } = await loadModule({});

    const result = await writeLeadAlertSummary(input);
    expect(result).toEqual({ ok: false, skipped: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
