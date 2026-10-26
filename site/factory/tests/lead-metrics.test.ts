import { describe, expect, it } from 'vitest';
import {
  change,
  dayKeyTehran,
  inWindow,
  parseSource,
  renderWeeklyReport,
  tallyWeek,
  WEEK_MS,
  weekWindow,
  type CallClickRow,
  type LeadRow,
} from '@/lib/lead-metrics';

const NOW = Date.parse('2026-10-26T09:00:00.000Z');
const iso = (ms: number) => new Date(ms).toISOString();

const click = (created_at: string, page: string, source: string | null = null): CallClickRow => ({
  created_at,
  page,
  source,
});
const lead = (
  created_at: string,
  source: string | null = 'direct|home|none',
  tour_slug: string | null = null,
  status: string | null = 'new',
): LeadRow => ({ created_at, source, tour_slug, status });

describe('lead metrics: window', () => {
  it('builds a rolling seven day, half open window', () => {
    const w = weekWindow(NOW);
    expect(w.endMs).toBe(NOW);
    expect(w.endMs - w.startMs).toBe(WEEK_MS);
  });

  it('shifts back one week for the previous window', () => {
    const current = weekWindow(NOW);
    const previous = weekWindow(NOW, 1);
    expect(previous.endMs).toBe(current.startMs);
    expect(previous.endMs - previous.startMs).toBe(WEEK_MS);
  });

  it('includes the start bound and excludes the end bound', () => {
    const w = weekWindow(NOW);
    expect(inWindow(iso(w.startMs), w)).toBe(true);
    expect(inWindow(iso(w.endMs), w)).toBe(false);
    expect(inWindow(iso(w.endMs - 1), w)).toBe(true);
    expect(inWindow('not-a-date', w)).toBe(false);
  });
});

describe('lead metrics: source parsing', () => {
  it('splits the three part source contract', () => {
    expect(parseSource('organic|tours/phuket-7-days|none')).toEqual({
      channel: 'organic',
      page: 'tours/phuket-7-days',
      campaign: 'none',
    });
  });

  it('falls back to unknown instead of inventing a channel', () => {
    expect(parseSource(null)).toEqual({ channel: 'unknown', page: 'unknown', campaign: 'none' });
    expect(parseSource('')).toEqual({ channel: 'unknown', page: 'unknown', campaign: 'none' });
    expect(parseSource('site-form')).toEqual({
      channel: 'unknown',
      page: 'unknown',
      campaign: 'none',
    });
    expect(parseSource('a|b')).toEqual({ channel: 'unknown', page: 'unknown', campaign: 'none' });
  });
});

describe('lead metrics: Tehran day key', () => {
  it('rolls a UTC evening into the next Tehran day', () => {
    // 2026-10-25T21:00Z = 2026-10-26 00:30 Tehran
    expect(dayKeyTehran('2026-10-25T21:00:00.000Z')).toBe('2026-10-26');
    // 2026-10-25T20:00Z = 2026-10-25 23:30 Tehran
    expect(dayKeyTehran('2026-10-25T20:00:00.000Z')).toBe('2026-10-25');
  });

  it('returns an empty key for an invalid date', () => {
    expect(dayKeyTehran('nope')).toBe('');
  });
});

describe('lead metrics: weekly tally', () => {
  const window = weekWindow(NOW);
  const inside = iso(NOW - 2 * 86_400_000);
  const outside = iso(NOW - 8 * 86_400_000);

  it('counts only rows inside the window', () => {
    const metrics = tallyWeek(
      [lead(inside), lead(outside)],
      [click(inside, '/tours/phuket-7-days', 'direct|tours/phuket-7-days|none'), click(outside, '/')],
      window,
    );
    expect(metrics.leads).toBe(1);
    expect(metrics.clicks).toBe(1);
  });

  it('splits channels for clicks and leads separately', () => {
    const metrics = tallyWeek(
      [lead(inside, 'organic|tour/phuket-7-days|none'), lead(inside, 'direct|home|none')],
      [
        click(inside, '/tours/phuket-7-days', 'organic|tours/phuket-7-days|none'),
        click(inside, '/', 'organic|home|none'),
        click(inside, '/', 'direct|home|none'),
      ],
      window,
    );
    expect(metrics.byChannel.organic).toEqual({ clicks: 2, leads: 1 });
    expect(metrics.byChannel.direct).toEqual({ clicks: 1, leads: 1 });
  });

  it('groups clicks by page and leads by tour, biggest first', () => {
    const metrics = tallyWeek(
      [lead(inside, 'direct|tour/phuket-7-days|none', 'phuket-7-days'), lead(inside, 'direct|tour/krabi-6-days|none', 'krabi-6-days')],
      [
        click(inside, '/tours/krabi-6-days', 'direct|tours/krabi-6-days|none'),
        click(inside, '/tours/phuket-7-days', 'direct|tours/phuket-7-days|none'),
        click(inside, '/tours/phuket-7-days', 'direct|tours/phuket-7-days|none'),
      ],
      window,
    );
    expect(metrics.clicksByPage[0]).toEqual({ page: 'tours/phuket-7-days', count: 2 });
    expect(metrics.leadsByTour.map((row) => row.tour).sort()).toEqual(['krabi-6-days', 'phuket-7-days']);
  });

  it('buckets rows per Tehran day and keeps the day list sorted', () => {
    const metrics = tallyWeek(
      [
        lead('2026-10-25T21:00:00.000Z', 'direct|home|none'),
        lead('2026-10-24T10:00:00.000Z', 'direct|home|none'),
      ],
      [click('2026-10-25T21:30:00.000Z', '/', 'direct|home|none')],
      window,
    );
    expect(metrics.daily.map((day) => day.date)).toEqual(['2026-10-24', '2026-10-26']);
    expect(metrics.daily[1]).toEqual({ date: '2026-10-26', clicks: 1, leads: 1 });
  });

  it('labels a lead without a tour instead of dropping it', () => {
    const metrics = tallyWeek([lead(inside, 'direct|home|none', null)], [], window);
    expect(metrics.leadsByTour).toEqual([{ tour: 'بدون تور', count: 1 }]);
  });
});

describe('lead metrics: change', () => {
  it('computes a one decimal percentage', () => {
    expect(change(15, 10)).toEqual({ current: 15, previous: 10, deltaPct: 50 });
    expect(change(4, 10)).toEqual({ current: 4, previous: 10, deltaPct: -60 });
  });

  it('refuses to divide by zero', () => {
    expect(change(3, 0)).toEqual({ current: 3, previous: 0, deltaPct: null });
    expect(change(0, 0)).toEqual({ current: 0, previous: 0, deltaPct: null });
  });
});

describe('lead metrics: weekly report', () => {
  const current = tallyWeek(
    [lead(iso(NOW - 3 * 86_400_000), 'organic|tour/phuket-7-days|none', 'phuket-7-days')],
    [
      click(iso(NOW - 3 * 86_400_000), '/tours/phuket-7-days', 'organic|tours/phuket-7-days|none'),
      click(iso(NOW - 4 * 86_400_000), '/tours/phuket-7-days', 'organic|tours/phuket-7-days|none'),
    ],
    weekWindow(NOW),
  );
  const previous = tallyWeek([], [click(iso(NOW - 9 * 86_400_000), '/', 'direct|home|none')], weekWindow(NOW, 1));

  it('shows real counts in Persian digits', () => {
    const text = renderWeeklyReport({ current, previous, formCompletion: null, generatedAtMs: NOW });
    expect(text).toContain('کلیک تماس (K1): ۲ — هفتهٔ قبل ۱؛ +۱۰۰٪');
    expect(text).toContain('لید ثبت‌شده (K3): ۱ — هفتهٔ قبل ۰');
  });

  it('says out loud that K2 is not measured yet', () => {
    const text = renderWeeklyReport({ current, previous, formCompletion: null, generatedAtMs: NOW });
    expect(text).toContain('نرخ تکمیل فرم (K2): اندازه‌گیری نشده');
  });

  it('never carries personal data fields', () => {
    const text = renderWeeklyReport({ current, previous, formCompletion: null, generatedAtMs: NOW });
    for (const banned of ['phone', 'mobile', 'name:', 'شمارهٔ موبایل', '0912']) {
      expect(text).not.toContain(banned);
    }
  });

  it('handles a completely silent week without fake numbers', () => {
    const empty = tallyWeek([], [], weekWindow(NOW));
    const text = renderWeeklyReport({ current: empty, previous: empty, formCompletion: null, generatedAtMs: NOW });
    expect(text).toContain('هیچ کلیک تماس و هیچ لیدی ثبت نشده است');
    expect(text).toContain('هر دو هفته صفر');
  });
});
