import { describe, expect, it } from 'vitest';
import {
  evaluateSlo,
  formatSloLine,
  isServerFailure,
  monthlyErrorBudgetMinutes,
  percentile,
  SLO,
  type SloSample,
} from '@/lib/slo';

/**
 * Q4-05 regression test for the SLO math.
 *
 * The rule that matters most here is the one that is easy to get wrong: a 4xx
 * is not a service failure. Counting it would let a crawler hitting dead URLs
 * exhaust the error budget and page the owner for nothing.
 */

function sample(status: number, ms = 50, url = 'https://thailandgard.ir/api/health'): SloSample {
  return { url, status, ms };
}

describe('SLO budgets', () => {
  it('turns 99.5% availability into 216 minutes of monthly error budget', () => {
    expect(monthlyErrorBudgetMinutes(0.995, 30)).toBeCloseTo(216, 6);
  });

  it('gives no budget for perfect availability and a whole month for none', () => {
    expect(monthlyErrorBudgetMinutes(1, 30)).toBe(0);
    expect(monthlyErrorBudgetMinutes(0, 30)).toBeCloseTo(30 * 24 * 60, 6);
  });

  it('keeps the K8 ceiling at half a percent', () => {
    expect(SLO.maxServerErrorRate).toBe(0.005);
  });
});

describe('what counts as a failure', () => {
  it('counts 5xx and unanswered requests', () => {
    expect(isServerFailure(500)).toBe(true);
    expect(isServerFailure(503)).toBe(true);
    expect(isServerFailure(0)).toBe(true);
  });

  it('does not count successful or client-side errors', () => {
    expect(isServerFailure(200)).toBe(false);
    expect(isServerFailure(304)).toBe(false);
    expect(isServerFailure(404)).toBe(false);
    expect(isServerFailure(429)).toBe(false);
  });
});

describe('evaluating the SLO', () => {
  it('reports a clean window as ok', () => {
    const report = evaluateSlo([sample(200), sample(200), sample(200)]);

    expect(report.status).toBe('ok');
    expect(report.errorRate).toBe(0);
    expect(report.failures).toBe(0);
  });

  it('says ok when there is nothing to measure, instead of inventing a rate', () => {
    const report = evaluateSlo([]);

    expect(report).toMatchObject({ total: 0, failures: 0, errorRate: 0, status: 'ok' });
  });

  it('treats the exact ceiling as burning, not breached: the ceiling is allowed', () => {
    const report = evaluateSlo(
      [sample(500), ...Array.from({ length: 199 }, () => sample(200))],
    );

    expect(report.errorRate).toBeCloseTo(0.005, 6);
    expect(report.status).toBe('burning');
  });

  it('warns while budget remains but half is spent', () => {
    // 1 در ۱۰۰ = ۱٪ خطا، یعنی دو برابر سقف... پس یک نمونهٔ ۵۰۰ در ۴۰۰ یعنی
    // ۰٫۲۵٪ = نیمی از بودجه.
    const report = evaluateSlo(
      [sample(500), ...Array.from({ length: 399 }, () => sample(200))],
    );

    expect(report.budgetSpentFraction).toBeCloseTo(0.5, 6);
    expect(report.status).toBe('burning');
  });

  it('declares the budget spent only when the rate passes the ceiling', () => {
    const report = evaluateSlo(
      [sample(500), sample(500), ...Array.from({ length: 198 }, () => sample(200))],
    );

    expect(report.errorRate).toBeCloseTo(0.01, 6);
    expect(report.status).toBe('breached');
  });

  it('ignores 4xx so a crawler cannot burn the budget', () => {
    const report = evaluateSlo([sample(404), sample(404), sample(200)]);

    expect(report.failures).toBe(0);
    expect(report.status).toBe('ok');
  });

  it('points at the slowest sample so the report says where it hurts', () => {
    const report = evaluateSlo([
      sample(200, 40, 'https://thailandgard.ir/'),
      sample(200, 1200, 'https://thailandgard.ir/tours'),
    ]);

    expect(report.slowest?.url).toBe('https://thailandgard.ir/tours');
  });
});

describe('percentiles', () => {
  it('returns null for an empty set instead of zero', () => {
    expect(percentile([], 0.95)).toBeNull();
  });

  it('rounds the p95 rank up so it is never kinder than reality', () => {
    // پنج نمونه: رتبهٔ p95 باید پنجمی (کندترین) باشد، نه چهارمی.
    expect(percentile([10, 20, 30, 40, 100], 0.95)).toBe(100);
  });

  it('handles the extremes', () => {
    expect(percentile([5, 1, 3], 0)).toBe(1);
    expect(percentile([5, 1, 3], 1)).toBe(5);
  });
});

describe('report line', () => {
  it('states the rate, the counts and the budget in one line', () => {
    const line = formatSloLine(
      evaluateSlo(
        [sample(500), ...Array.from({ length: 199 }, () => sample(200))],
      ),
    );

    expect(line).toContain('بودجه در حال سوختن');
    expect(line).toContain('0.50%');
    expect(line).toContain('1/200');
  });
});
