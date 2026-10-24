import { getPool } from '../db';
import { newId } from '../ids';
import {
  OutreachPolicySchema,
  ProspectSchema,
  type OutreachContext,
  type OutreachPlan,
  type OutreachPolicy,
  type Prospect,
} from './contracts';

interface ProspectRow {
  id: string;
  domain: string;
  url: string;
  contact_email: string | null;
  relevance: number;
  status: string;
  last_contacted_at: Date | string | null;
  notes: string | null;
}

function mapProspect(row: ProspectRow): Prospect {
  return ProspectSchema.parse({
    id: row.id,
    domain: row.domain,
    url: row.url,
    contactEmail: row.contact_email,
    relevance: row.relevance,
    status: row.status,
    lastContactedAt: row.last_contacted_at
      ? new Date(row.last_contacted_at).toISOString()
      : null,
    notes: row.notes,
  });
}

export async function listProspects(options?: {
  status?: string;
  limit?: number;
}): Promise<Prospect[]> {
  const result = await getPool().query<ProspectRow>(
    `SELECT id, domain, url, contact_email, relevance, status,
            last_contacted_at, notes
       FROM outreach_prospects
      WHERE ($1::text IS NULL OR status = $1)
      ORDER BY relevance DESC, domain ASC
      LIMIT $2`,
    [options?.status ?? null, options?.limit ?? 100],
  );
  return result.rows.map(mapProspect);
}

export async function addProspect(input: {
  domain: string;
  url: string;
  contactEmail?: string | null;
  relevance?: number;
  notes?: string | null;
}): Promise<Prospect> {
  const result = await getPool().query<ProspectRow>(
    `INSERT INTO outreach_prospects
      (id, domain, url, contact_email, relevance, notes)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (domain) DO UPDATE SET
       url = EXCLUDED.url,
       contact_email = EXCLUDED.contact_email,
       relevance = EXCLUDED.relevance,
       notes = EXCLUDED.notes,
       updated_at = now()
     RETURNING id, domain, url, contact_email, relevance, status,
               last_contacted_at, notes`,
    [
      newId(),
      input.domain,
      input.url,
      input.contactEmail ?? null,
      input.relevance ?? 50,
      input.notes ?? null,
    ],
  );
  return mapProspect(result.rows[0]);
}

export async function addSuppression(
  email: string,
  reason: string,
): Promise<void> {
  await getPool().query(
    `INSERT INTO outreach_suppressions (email, reason)
     VALUES ($1, $2)
     ON CONFLICT (email) DO UPDATE SET reason = EXCLUDED.reason`,
    [email.toLowerCase(), reason],
  );
}

export async function listSuppressions(): Promise<string[]> {
  const result = await getPool().query<{ email: string }>(
    'SELECT email FROM outreach_suppressions ORDER BY email',
  );
  return result.rows.map((row) => row.email);
}

export async function getOutreachContext(options?: {
  now?: Date;
  policy?: Partial<OutreachPolicy>;
}): Promise<OutreachContext> {
  const now = options?.now ?? new Date();
  const policy = OutreachPolicySchema.parse(options?.policy ?? {});
  const since = new Date(now.getTime() - 86_400_000).toISOString();

  const [suppressions, history] = await Promise.all([
    listSuppressions(),
    getPool().query<{
      prospect_id: string;
      last_sent: Date | string | null;
      sent_24h: string;
    }>(
      `SELECT prospect_id,
              max(sent_at) FILTER (WHERE status = 'sent') AS last_sent,
              count(*) FILTER (
                WHERE status = 'sent' AND sent_at >= $1::timestamptz
              ) AS sent_24h
         FROM outreach_messages
        GROUP BY prospect_id`,
      [since],
    ),
  ]);

  const map = new Map<
    string,
    { lastContactedAt: string | null; sentLast24h: number }
  >();
  let sentLast24h = 0;
  for (const row of history.rows) {
    const count = Number(row.sent_24h);
    sentLast24h += count;
    map.set(row.prospect_id, {
      lastContactedAt: row.last_sent
        ? new Date(row.last_sent).toISOString()
        : null,
      sentLast24h: count,
    });
  }

  return {
    now,
    policy,
    suppressions: new Set(suppressions.map((email) => email.toLowerCase())),
    sentLast24h,
    history: map,
  };
}

export async function insertOutreachPlan(
  plan: OutreachPlan,
): Promise<{ inserted: number; skipped: number }> {
  const pool = getPool();
  let inserted = 0;
  let skipped = 0;

  for (const item of plan.planned) {
    for (const step of item.steps) {
      const result = await pool.query(
        `INSERT INTO outreach_messages
          (id, prospect_id, step, subject, body, status, scheduled_at)
         VALUES ($1, $2, $3, $4, $5, 'queued', $6)
         ON CONFLICT (prospect_id, step) DO NOTHING`,
        [
          newId(),
          item.prospectId,
          step.step,
          step.subject,
          step.body,
          step.scheduledAt,
        ],
      );
      inserted += result.rowCount ?? 0;
      skipped += result.rowCount ? 0 : 1;
    }
  }

  return { inserted, skipped };
}

export interface DueOutreachMessage {
  id: string;
  prospectId: string;
  domain: string;
  email: string | null;
  step: number;
  subject: string;
  body: string;
}

export async function listDueOutreachMessages(
  limit = 20,
  now = new Date(),
  statuses: Array<'queued' | 'dry_run'> = ['queued'],
): Promise<DueOutreachMessage[]> {
  const result = await getPool().query<{
    id: string;
    prospect_id: string;
    domain: string;
    contact_email: string | null;
    step: number;
    subject: string;
    body: string;
  }>(
    `SELECT m.id, m.prospect_id, p.domain, p.contact_email, m.step,
            m.subject, m.body
       FROM outreach_messages m
       JOIN outreach_prospects p ON p.id = m.prospect_id
      WHERE m.status = ANY($3::text[])
        AND m.scheduled_at <= $1::timestamptz
      ORDER BY m.scheduled_at ASC
      LIMIT $2`,
    [now.toISOString(), limit, statuses],
  );
  return result.rows.map((row) => ({
    id: row.id,
    prospectId: row.prospect_id,
    domain: row.domain,
    email: row.contact_email,
    step: row.step,
    subject: row.subject,
    body: row.body,
  }));
}

export async function markOutreachMessage(
  id: string,
  status: 'dry_run' | 'sent' | 'failed' | 'canceled',
  options?: { providerId?: string; error?: string; sentAt?: Date },
): Promise<void> {
  await getPool().query(
    `UPDATE outreach_messages
        SET status = $2,
            provider_id = COALESCE($3, provider_id),
            error = COALESCE($4, error),
            sent_at = COALESCE($5, sent_at)
      WHERE id = $1`,
    [
      id,
      status,
      options?.providerId ?? null,
      options?.error ?? null,
      options?.sentAt?.toISOString() ?? null,
    ],
  );
}

export async function markProspectContacted(
  prospectId: string,
  at = new Date(),
): Promise<void> {
  await getPool().query(
    `UPDATE outreach_prospects
        SET last_contacted_at = $2, status = 'contacted', updated_at = now()
      WHERE id = $1`,
    [prospectId, at.toISOString()],
  );
}
