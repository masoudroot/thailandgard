import { z } from 'zod';
import { TOURS, type Tour } from '../../tours';
import type { GateCheck, GateResult } from '../gates/types';
import { fetchSupabaseRows, readSupabaseRestConfig } from '../supabase-rest';

export const TourFactSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().min(1),
  days: z.number().int().positive(),
  nights: z.number().int().nonnegative(),
  route: z.string().min(1),
  priceFrom: z.number().int().nonnegative().nullable(),
  priceUpdatedAt: z.string().nullable(),
  priceStatus: z.enum(['fresh', 'stale', 'missing', 'contact']),
  priceAgeDays: z.number().int().nonnegative().nullable(),
  active: z.boolean(),
  touristType: z.string().min(1),
  source: z.enum(['supabase', 'fallback']),
  fetchedAt: z.string().datetime(),
});

export type TourFact = z.infer<typeof TourFactSchema>;

interface TourRow {
  slug: string;
  title: string;
  days: number;
  nights: number;
  route: string;
  price_from: number | string | null;
  price_updated_at: string | null;
  active: boolean;
  tourist_type: string | null;
}

function normalizePrice(value: number | string | null): number | null {
  if (value === null) return null;
  const price = Number(value);
  return Number.isFinite(price) ? Math.round(price) : null;
}

function priceState(
  priceFrom: number | null,
  priceUpdatedAt: string | null,
  now: Date,
): Pick<TourFact, 'priceStatus' | 'priceAgeDays'> {
  if (priceFrom === null) return { priceStatus: 'contact', priceAgeDays: null };
  if (!priceUpdatedAt) return { priceStatus: 'missing', priceAgeDays: null };
  const updated = Date.parse(priceUpdatedAt);
  if (Number.isNaN(updated)) {
    return { priceStatus: 'missing', priceAgeDays: null };
  }
  const ageDays = Math.max(
    0,
    Math.floor((now.getTime() - updated) / 86_400_000),
  );
  return {
    priceStatus: ageDays <= 7 ? 'fresh' : 'stale',
    priceAgeDays: ageDays,
  };
}

export function toTourFact(
  input: {
    slug: string;
    title: string;
    days: number;
    nights: number;
    route: string;
    priceFrom: number | null;
    priceUpdatedAt: string | null;
    active: boolean;
    touristType: string;
  },
  options: {
    source: 'supabase' | 'fallback';
    now: Date;
    fetchedAt: string;
  },
): TourFact {
  return TourFactSchema.parse({
    ...input,
    ...priceState(input.priceFrom, input.priceUpdatedAt, options.now),
    source: options.source,
    fetchedAt: options.fetchedAt,
  });
}

function fromTour(tour: Tour, now: Date, fetchedAt: string): TourFact {
  return toTourFact(
    {
      slug: tour.slug,
      title: tour.title,
      days: tour.days,
      nights: tour.nights,
      route: tour.route,
      priceFrom: tour.priceFrom,
      priceUpdatedAt: tour.priceUpdatedAt ?? null,
      active: tour.active,
      touristType: tour.touristType,
    },
    { source: 'fallback', now, fetchedAt },
  );
}

function fromRow(row: TourRow, now: Date, fetchedAt: string): TourFact {
  return toTourFact(
    {
      slug: row.slug,
      title: row.title,
      days: row.days,
      nights: row.nights,
      route: row.route,
      priceFrom: normalizePrice(row.price_from),
      priceUpdatedAt: row.price_updated_at,
      active: row.active,
      touristType: row.tourist_type ?? 'نامشخص',
    },
    { source: 'supabase', now, fetchedAt },
  );
}

export async function loadTourFacts(options?: {
  source?: 'auto' | 'supabase' | 'fallback';
  allowFallback?: boolean;
  includeInactive?: boolean;
  now?: Date;
}): Promise<TourFact[]> {
  const now = options?.now ?? new Date();
  const fetchedAt = now.toISOString();
  const source = options?.source ?? 'auto';
  const allowFallback =
    options?.allowFallback ?? process.env.NODE_ENV !== 'production';
  const config = readSupabaseRestConfig();

  if (source === 'fallback' || !config) {
    if (!allowFallback) throw new Error('TOUR_FACT_SOURCE_UNAVAILABLE');
    return TOURS.map((tour) => fromTour(tour, now, fetchedAt));
  }

  try {
    const search = new URLSearchParams({
      select:
        'slug,title,days,nights,route,price_from,price_updated_at,active,tourist_type',
      order: 'slug.asc',
    });
    if (!options?.includeInactive) search.set('active', 'eq.true');
    const rows = await fetchSupabaseRows<TourRow>(
      'tours',
      search,
      config,
    );
    return rows.map((row) => fromRow(row, now, fetchedAt));
  } catch (error) {
    if (!allowFallback) throw error;
    return TOURS.map((tour) => fromTour(tour, now, fetchedAt));
  }
}

export interface TourFactGateOptions {
  now?: Date;
  maxPriceAgeDays?: number;
  requireFreshPrices?: boolean;
  requireSupabase?: boolean;
}

export function buildTourFactGate(
  facts: TourFact[],
  options?: TourFactGateOptions,
): GateResult {
  const now = options?.now ?? new Date();
  const maxPriceAgeDays = options?.maxPriceAgeDays ?? 7;
  const checks: GateCheck[] = [];
  const slugs = new Set(facts.map((fact) => fact.slug));

  checks.push({
    id: 'tour_count',
    passed: facts.length > 0,
    detail: `${facts.length} tours`,
  });
  checks.push({
    id: 'unique_slugs',
    passed: slugs.size === facts.length,
    detail: `${slugs.size} unique slugs`,
  });
  checks.push({
    id: 'active_tours',
    passed: facts.every((fact) => fact.active),
    detail: `${facts.filter((fact) => fact.active).length}/${facts.length} active`,
  });
  checks.push({
    id: 'duration_valid',
    passed: facts.every(
      (fact) => fact.days > 0 && fact.nights >= 0 && fact.nights <= fact.days,
    ),
    detail: 'days > 0 and 0 <= nights <= days',
  });
  checks.push({
    id: 'price_state_known',
    passed: facts.every((fact) => fact.priceStatus !== 'missing'),
    detail: `${facts.filter((fact) => fact.priceStatus === 'missing').length} prices without a valid update date`,
  });
  checks.push({
    id: 'price_fresh',
    passed:
      options?.requireFreshPrices !== true ||
      facts.every(
        (fact) =>
          fact.priceFrom === null ||
          (fact.priceAgeDays !== null &&
            fact.priceAgeDays <= maxPriceAgeDays),
      ),
    detail: `${facts.filter((fact) => fact.priceStatus === 'stale').length} stale prices (max ${maxPriceAgeDays}d)`,
  });
  checks.push({
    id: 'tourist_type_present',
    passed: facts.every((fact) => fact.touristType !== 'نامشخص'),
    detail: `${facts.filter((fact) => fact.touristType === 'نامشخص').length} missing tourist types`,
  });
  checks.push({
    id: 'source_available',
    passed:
      options?.requireSupabase !== true ||
      facts.every((fact) => fact.source === 'supabase'),
    detail: `${facts.filter((fact) => fact.source === 'supabase').length}/${facts.length} from Supabase`,
  });
  checks.push({
    id: 'snapshot_recent',
    passed: facts.every(
      (fact) => now.getTime() - Date.parse(fact.fetchedAt) <= 3_600_000,
    ),
    detail: 'snapshot fetched within the last hour',
  });

  return {
    gate: 'tour_facts',
    passed: checks.every((check) => check.passed),
    checks,
  };
}

export function summarizeTourFacts(facts: TourFact[]): {
  total: number;
  fresh: number;
  stale: number;
  missing: number;
  contact: number;
  sources: Record<string, number>;
} {
  return {
    total: facts.length,
    fresh: facts.filter((fact) => fact.priceStatus === 'fresh').length,
    stale: facts.filter((fact) => fact.priceStatus === 'stale').length,
    missing: facts.filter((fact) => fact.priceStatus === 'missing').length,
    contact: facts.filter((fact) => fact.priceStatus === 'contact').length,
    sources: facts.reduce<Record<string, number>>((acc, fact) => {
      acc[fact.source] = (acc[fact.source] ?? 0) + 1;
      return acc;
    }, {}),
  };
}
