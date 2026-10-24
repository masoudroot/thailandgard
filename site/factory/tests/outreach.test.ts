import { describe, expect, it } from 'vitest';
import { OutreachPolicySchema, type Prospect } from '@/lib/factory/outreach/contracts';
import {
  buildOutreachSteps,
  canContact,
  planOutreach,
} from '@/lib/factory/outreach/planner';

const now = new Date('2026-10-21T00:00:00.000Z');

function prospect(overrides: Partial<Prospect> = {}): Prospect {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    domain: 'example.com',
    url: 'https://example.com/thailand',
    contactEmail: 'editor@example.com',
    relevance: 80,
    status: 'new',
    lastContactedAt: null,
    notes: 'Thailand destination guides',
    ...overrides,
  };
}

function context(overrides: {
  sentLast24h?: number;
  suppressions?: string[];
  history?: Map<string, { lastContactedAt: string | null; sentLast24h: number }>;
  policy?: Record<string, unknown>;
} = {}) {
  return {
    now,
    policy: OutreachPolicySchema.parse(overrides.policy ?? {}),
    suppressions: new Set(overrides.suppressions ?? []),
    sentLast24h: overrides.sentLast24h ?? 0,
    history: overrides.history ?? new Map(),
  };
}

describe('outreach planner', () => {
  it('builds a three-step sequence with spaced dates', () => {
    const steps = buildOutreachSteps(
      prospect(),
      OutreachPolicySchema.parse({}),
      now,
    );
    expect(steps).toHaveLength(3);
    expect(steps[0].scheduledAt).toBe(now.toISOString());
    expect(steps[1].scheduledAt).toBe('2026-10-25T00:00:00.000Z');
    expect(steps[0].body).toContain('{{unsubscribeUrl}}');
  });

  it('allows a relevant prospect with no history', () => {
    expect(canContact(prospect(), context()).allowed).toBe(true);
  });

  it('blocks low-relevance prospects', () => {
    const decision = canContact(prospect({ relevance: 10 }), context());
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe('low_relevance');
  });

  it('blocks suppressed emails', () => {
    const decision = canContact(
      prospect(),
      context({ suppressions: ['editor@example.com'] }),
    );
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe('suppressed_email');
  });

  it('blocks prospects contacted within the cooldown', () => {
    const decision = canContact(
      prospect(),
      context({
        history: new Map([
          [
            prospect().id,
            { lastContactedAt: '2026-10-19T00:00:00.000Z', sentLast24h: 1 },
          ],
        ]),
      }),
    );
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe('contacted_recently');
  });

  it('respects the daily cap', () => {
    const plan = planOutreach([prospect()], context({ sentLast24h: 20 }));
    expect(plan.planned).toHaveLength(0);
    expect(plan.skipped[0].reason).toBe('daily_cap');
  });

  it('respects maxSteps', () => {
    const steps = buildOutreachSteps(
      prospect(),
      OutreachPolicySchema.parse({ maxSteps: 1 }),
      now,
    );
    expect(steps).toHaveLength(1);
  });
});
