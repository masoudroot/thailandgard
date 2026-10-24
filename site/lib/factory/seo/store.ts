import { getPool } from '../db';
import { newId } from '../ids';
import type { SeoSignal } from './radar';

export async function persistSeoSignals(
  signals: SeoSignal[],
): Promise<{ inserted: number; updated: number }> {
  if (signals.length === 0) return { inserted: 0, updated: 0 };
  const pool = getPool();
  const keys = signals.map((signal) => signal.dedupeKey);
  const existing = await pool.query<{ dedupe_key: string }>(
    'SELECT dedupe_key FROM seo_signals WHERE dedupe_key = ANY($1::text[])',
    [keys],
  );
  const known = new Set(existing.rows.map((row) => row.dedupe_key));

  for (const signal of signals) {
    await pool.query(
      `INSERT INTO seo_signals
        (id, dedupe_key, type, priority, title, detail, subject, metrics, source, observed_at, last_seen_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, now())
       ON CONFLICT (dedupe_key) DO UPDATE SET
         priority = EXCLUDED.priority,
         title = EXCLUDED.title,
         detail = EXCLUDED.detail,
         metrics = EXCLUDED.metrics,
         observed_at = EXCLUDED.observed_at,
         last_seen_at = now()`,
      [
        newId(),
        signal.dedupeKey,
        signal.type,
        signal.priority,
        signal.title,
        signal.detail,
        signal.subject,
        JSON.stringify(signal.metrics),
        signal.source,
        signal.observedAt,
      ],
    );
  }

  return {
    inserted: signals.filter((signal) => !known.has(signal.dedupeKey)).length,
    updated: signals.filter((signal) => known.has(signal.dedupeKey)).length,
  };
}

export interface StoredSeoSignal {
  id: string;
  dedupe_key: string;
  type: string;
  priority: number;
  title: string;
  detail: string;
  subject: string;
  metrics: Record<string, number>;
  source: string;
  status: string;
  observed_at: string;
  last_seen_at: string;
}

export async function listSeoSignals(options?: {
  status?: string;
  limit?: number;
}): Promise<StoredSeoSignal[]> {
  const result = await getPool().query<StoredSeoSignal>(
    `SELECT id, dedupe_key, type, priority, title, detail, subject, metrics,
            source, status, observed_at, last_seen_at
       FROM seo_signals
      WHERE ($1::text IS NULL OR status = $1)
      ORDER BY priority DESC, last_seen_at DESC
      LIMIT $2`,
    [options?.status ?? null, options?.limit ?? 50],
  );
  return result.rows;
}

export async function markSeoSignal(
  id: string,
  status: 'accepted' | 'dismissed' | 'actioned',
): Promise<void> {
  await getPool().query('UPDATE seo_signals SET status = $2 WHERE id = $1', [
    id,
    status,
  ]);
}
