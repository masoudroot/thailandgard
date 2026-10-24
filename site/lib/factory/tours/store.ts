import { createHash } from 'node:crypto';
import { getPool } from '../db';
import { newId } from '../ids';
import type { TourFact } from './facts';

function hashFact(fact: TourFact): string {
  return createHash('sha256')
    .update(JSON.stringify(fact))
    .digest('hex');
}

export async function persistTourFacts(
  facts: TourFact[],
): Promise<{ inserted: number; existing: number }> {
  if (facts.length === 0) return { inserted: 0, existing: 0 };
  const pool = getPool();
  let inserted = 0;

  for (const fact of facts) {
    const result = await pool.query(
      `INSERT INTO tour_fact_snapshots
        (id, tour_slug, source, price_status, payload, hash, fetched_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)
       ON CONFLICT (tour_slug, hash) DO NOTHING`,
      [
        newId(),
        fact.slug,
        fact.source,
        fact.priceStatus,
        JSON.stringify(fact),
        hashFact(fact),
        fact.fetchedAt,
      ],
    );
    inserted += result.rowCount ?? 0;
  }

  return { inserted, existing: facts.length - inserted };
}

export async function latestTourFacts(): Promise<TourFact[]> {
  const result = await getPool().query<{ payload: TourFact }>(
    `SELECT DISTINCT ON (tour_slug) payload
       FROM tour_fact_snapshots
      ORDER BY tour_slug, fetched_at DESC`,
  );
  return result.rows.map((row) => row.payload);
}
