import { describe, expect, it } from 'vitest';
import {
  buildTourFactGate,
  loadTourFacts,
  summarizeTourFacts,
  toTourFact,
} from '@/lib/factory/tours/facts';

const now = new Date('2026-10-21T00:00:00.000Z');

const base = {
  slug: 'phuket-7-days',
  title: 'تور پوکت ۷ روزه',
  days: 7,
  nights: 6,
  route: 'تهران | پوکت | تهران',
  priceFrom: 48_500_000,
  active: true,
  touristType: 'گردشگران تفریحی',
};

function fact(priceUpdatedAt: string | null, priceFrom: number | null = base.priceFrom) {
  return toTourFact(
    { ...base, priceFrom, priceUpdatedAt },
    {
      source: 'supabase',
      now,
      fetchedAt: now.toISOString(),
    },
  );
}

describe('tour facts', () => {
  it('marks a price updated today as fresh', () => {
    const value = fact('2026-10-20T00:00:00.000Z');
    expect(value.priceStatus).toBe('fresh');
    expect(value.priceAgeDays).toBe(1);
  });

  it('marks an old price as stale', () => {
    const value = fact('2026-10-01T00:00:00.000Z');
    expect(value.priceStatus).toBe('stale');
    expect(value.priceAgeDays).toBe(20);
  });

  it('marks a price without an update date as missing', () => {
    expect(fact(null).priceStatus).toBe('missing');
  });

  it('marks a null price as contact', () => {
    const value = fact(null, null);
    expect(value.priceStatus).toBe('contact');
    expect(value.priceAgeDays).toBeNull();
  });

  it('loads the checked-in fallback when Supabase is unavailable', async () => {
    const facts = await loadTourFacts({
      source: 'fallback',
      now,
    });
    expect(facts).toHaveLength(4);
    expect(facts.every((item) => item.source === 'fallback')).toBe(true);
    expect(summarizeTourFacts(facts).total).toBe(4);
  });

  it('passes a complete fresh snapshot', () => {
    const result = buildTourFactGate([fact('2026-10-20T00:00:00.000Z')], {
      now,
      requireFreshPrices: true,
      requireSupabase: true,
    });
    expect(result.passed).toBe(true);
    expect(result.gate).toBe('tour_facts');
  });

  it('fails when prices are stale', () => {
    const result = buildTourFactGate([fact('2026-09-01T00:00:00.000Z')], {
      now,
      requireFreshPrices: true,
    });
    expect(result.passed).toBe(false);
    expect(result.checks.find((check) => check.id === 'price_fresh')?.passed).toBe(
      false,
    );
  });

  it('fails when the snapshot is not from Supabase', async () => {
    const facts = await loadTourFacts({ source: 'fallback', now });
    const result = buildTourFactGate(facts, {
      now,
      requireSupabase: true,
    });
    expect(result.passed).toBe(false);
    expect(
      result.checks.find((check) => check.id === 'source_available')?.passed,
    ).toBe(false);
  });
});
