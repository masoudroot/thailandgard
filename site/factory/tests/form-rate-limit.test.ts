import { beforeEach, describe, expect, it } from 'vitest';
import {
  allowSubmission,
  FORM_LIMIT,
  resetRateLimits,
  type RateLimitPolicy,
} from '@/lib/form-rate-limit';

/**
 * Q4-04 regression test for the public form rate limiter.
 *
 * The bug this guards against is a form endpoint with no ceiling at all: a
 * single loop could fill the lead store and the team's alerts. `now` is
 * injected so the window can be tested without waiting.
 */

const POLICY: RateLimitPolicy = { max: 3, windowMs: 60_000 };

describe('form rate limit', () => {
  beforeEach(() => resetRateLimits());

  it('allows submissions up to the policy ceiling', () => {
    const base = 1_000_000;
    for (let i = 0; i < POLICY.max; i += 1) {
      expect(allowSubmission('callback:1.1.1.1', base + i, POLICY).allowed).toBe(true);
    }
  });

  it('rejects the submission after the ceiling and reports how long to wait', () => {
    const base = 1_000_000;
    for (let i = 0; i < POLICY.max; i += 1) {
      allowSubmission('callback:1.1.1.1', base + i, POLICY);
    }

    const verdict = allowSubmission('callback:1.1.1.1', base + 10_000, POLICY);

    expect(verdict.allowed).toBe(false);
    expect(verdict.remaining).toBe(0);
    // Oldest hit was at base, so the window frees up at base + 60s.
    expect(verdict.retryAfterSeconds).toBe(50);
  });

  it('frees the slot once the window has slid past the oldest hit', () => {
    const base = 1_000_000;
    for (let i = 0; i < POLICY.max; i += 1) {
      allowSubmission('contact:1.1.1.1', base + i, POLICY);
    }

    expect(allowSubmission('contact:1.1.1.1', base + 60_001, POLICY).allowed).toBe(true);
  });

  it('counts each IP and each form separately', () => {
    const base = 1_000_000;
    for (let i = 0; i < POLICY.max; i += 1) {
      allowSubmission('callback:1.1.1.1', base + i, POLICY);
    }

    expect(allowSubmission('callback:2.2.2.2', base + 5, POLICY).allowed).toBe(true);
    expect(allowSubmission('contact:1.1.1.1', base + 5, POLICY).allowed).toBe(true);
  });

  it('reports the remaining allowance so callers can surface it', () => {
    const verdict = allowSubmission('callback:3.3.3.3', 1_000_000, POLICY);
    expect(verdict.remaining).toBe(POLICY.max - 1);
  });

  it('ships a policy that actually protects the public forms', () => {
    expect(FORM_LIMIT.max).toBeGreaterThan(0);
    expect(FORM_LIMIT.max).toBeLessThanOrEqual(10);
    expect(FORM_LIMIT.windowMs).toBeGreaterThanOrEqual(60_000);
  });
});
