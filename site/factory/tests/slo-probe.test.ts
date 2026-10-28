import { describe, expect, it } from 'vitest';
import {
  probeSamples,
  runSloProbe,
  formatSloReport,
  latencyP95,
} from '@/factory/scripts/slo-probe';
import { isServerFailure, evaluateSlo } from '@/lib/slo';

/**
 * Q4-05 regression test for the SLO probe.
 *
 * The probe tests the critical paths without waiting for real network delays.
 * Passing delayMs: 0 keeps the tests fast and deterministic.
 */

function makeFetcher(...states: number[]) {
  const calls: string[] = [];
  let index = 0;
  const impl = async (url: string): Promise<Response> => {
    calls.push(url);
    if (index >= states.length) throw new Error('unexpected extra call');
    const status = states[index++];
    return new Response('ok', { status });
  };
  return { fetch: impl, calls };
}

describe('probe samples', () => {
  it('fires each attempt and records status and elapsed time', async () => {
    const { fetch } = makeFetcher(200, 503, 500);
    const samples = await probeSamples(
      'https://thailandgard.ir/api/health',
      { fetchImpl: fetch as unknown as typeof globalThis.fetch, attempts: 3, delayMs: 0 },
    );

    expect(samples.length).toBe(3);
    expect(samples.map((s) => s.status)).toEqual([200, 503, 500]);
    expect(samples.every((s) => s.ms >= 0)).toBe(true);
  });

  it('records a network failure as status 0', async () => {
    const failing = async (): Promise<Response> => {
      throw new Error('net down');
    };

    const samples = await probeSamples(
      'https://thailandgard.ir/api/health',
      { fetchImpl: failing as unknown as typeof globalThis.fetch, attempts: 1, delayMs: 0 },
    );

    expect(samples).toEqual([
      { url: 'https://thailandgard.ir/api/health', status: 0, ms: expect.any(Number) },
    ]);
  });

  it('counts failures across attempts, not only on the last one', async () => {
    const { fetch } = makeFetcher(200, 500, 200);
    const samples = await probeSamples(
      'https://thailandgard.ir/api/health',
      { fetchImpl: fetch as unknown as typeof globalThis.fetch, attempts: 3, delayMs: 0 },
    );

    const failures = samples.filter((s) => isServerFailure(s.status));
    expect(failures).toHaveLength(1);
    expect(samples.filter((s) => s.status === 200)).toHaveLength(2);
  });
});

describe('running the probe', () => {
  it('folds samples from all paths into one verdict', async () => {
    // 4 targets * 3 attempts = 12 responses
    const states = Array.from({ length: 12 }, () => 200);
    const { fetch } = makeFetcher(...states);

    const report = await runSloProbe({
      fetchImpl: fetch as unknown as typeof globalThis.fetch,
      delayMs: 0,
    });

    expect(report.total).toBe(12);
    expect(report.failures).toBe(0);
    expect(report.status).toBe('ok');
  });

  it('moves to breached when failures exceed the error budget', async () => {
    // 1 failure in 12 samples is ~8.3% error rate, far above the 0.5% ceiling
    const states = [200, 200, 500, ...Array.from({ length: 9 }, () => 200)];
    const { fetch } = makeFetcher(...states);

    const report = await runSloProbe({
      fetchImpl: fetch as unknown as typeof globalThis.fetch,
      delayMs: 0,
    });

    expect(report.failures).toBe(1);
    expect(report.status).toBe('breached');
  });
});

describe('latency p95', () => {
  it('returns null for no samples instead of a fake zero', () => {
    expect(latencyP95([])).toBeNull();
  });

  it('takes the slowest of three samples, which is what p95 means at that size', () => {
    expect(
      latencyP95([
        { url: 'https://thailandgard.ir/api/health', status: 200, ms: 45 },
        { url: 'https://thailandgard.ir/api/health', status: 200, ms: 90 },
        { url: 'https://thailandgard.ir/api/health', status: 200, ms: 120 },
      ]),
    ).toBe(120);
  });
});

describe('format slo report', () => {
  it('formats a readable report with total samples and slowest target', () => {
    const report = evaluateSlo([
      { url: 'https://thailandgard.ir/', status: 200, ms: 120 },
      { url: 'https://thailandgard.ir/api/health', status: 200, ms: 45 },
    ]);

    const formatted = formatSloReport(report);
    expect(formatted).toContain('در بودجه');
    expect(formatted).toContain('نمونه‌ها: 2');
    expect(formatted).toContain('120ms');
  });
});
