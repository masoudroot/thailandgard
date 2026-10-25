/**
 * Phase-1 exit gate: a synthetic work item travels the full path
 * control API -> runner -> event log -> projector -> read model.
 *
 * Runs when TEST_DATABASE_URL is present (CI with the Postgres service, or a
 * local Postgres). Touches nothing production: everything stays inside the
 * operational factory database.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/factory/work-items/route';
import type { ContentBrief } from '@/lib/factory/content/contracts';
import { closePool, getPool } from '@/lib/factory/db';
import { drainProjections } from '@/lib/factory/projector';
import { PgProjectorStore } from '@/lib/factory/projector-pg';
import { getWorkItem } from '@/lib/factory/repository';
import { runWorkItem } from '@/lib/factory/runner';

vi.mock('@/lib/dashboard/auth', () => ({
  isAuthenticated: async () => false,
}));

const databaseUrl = process.env.TEST_DATABASE_URL;
const hasDatabase = Boolean(databaseUrl);

if (databaseUrl) {
  process.env.FACTORY_DATABASE_URL = databaseUrl;
  process.env.FACTORY_CONTROL_TOKEN = process.env.FACTORY_CONTROL_TOKEN ?? 'x'.repeat(32);
  process.env.FACTORY_EVIDENCE_SECRET = process.env.FACTORY_EVIDENCE_SECRET ?? 'y'.repeat(32);
  process.env.FACTORY_ARTIFACT_DIR = process.env.FACTORY_ARTIFACT_DIR ?? 'factory/.artifacts-test';
}

function postWorkItem(body: unknown, token?: string): Promise<Response> {
  const request = new NextRequest('http://factory.test/api/factory/work-items', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  return POST(request);
}

describe.skipIf(!hasDatabase)('phase-1 exit: control API to projection', () => {
  beforeAll(async () => {
    await getPool().query('SELECT 1');
  });

  afterAll(async () => {
    await closePool();
  });

  it('rejects unauthenticated requests', async () => {
    const response = await postWorkItem({ domain: 'content' });
    expect(response.status).toBe(401);
  });

  it('rejects invalid payloads for authenticated callers', async () => {
    const response = await postWorkItem(
      { domain: 'content' },
      process.env.FACTORY_CONTROL_TOKEN,
    );
    expect(response.status).toBe(400);
  });

  it(
    'runs a synthetic work item from the API all the way to the projection',
    async () => {
      const token = process.env.FACTORY_CONTROL_TOKEN as string;
      const response = await postWorkItem(
        {
          domain: 'content',
          ownerRole: 'content',
          title: `Phase-1 exit ${new Date().toISOString()}`,
          risk: 'R0',
          kpiTarget: 'phase1_exit',
          outcomeWindow: '28d',
          budget: { tokens: 12_000, costUsd: 0.25, wallClockMinutes: 20 },
          actor: 'phase1-exit',
        },
        token,
      );
      expect(response.status).toBe(202);
      const payload = (await response.json()) as {
        workItem: { id: string; status: string };
      };
      const id = payload.workItem.id;
      expect(id.length).toBeGreaterThanOrEqual(8);
      expect(payload.workItem.status).toBe('planned');

      const brief: ContentBrief = {
        workItemId: id,
        title: 'راهنمای کامل سفر به تایلند در آبان ۱۴۰۵',
        slug: `phase1-exit-${id.slice(0, 8)}`,
        targetKeyword: 'سفر به تایلند',
        audience: 'مسافران فارسی‌زبان',
        intent: 'informational',
        sourceFacts: [
          {
            claim: 'تایلند یکی از محبوب‌ترین مقاصد سفر در آسیای جنوب‌شرقی است.',
            source: 'https://thailandgard.ir/',
          },
        ],
        cta: 'برای دیدن تورهای فعال، صفحهٔ تورهای تایلند را ببینید.',
      };

      const result = await runWorkItem({
        workItemId: id,
        actor: 'phase1-exit',
        mode: 'walking_skeleton',
        contentBrief: brief,
      });
      expect(result.status, JSON.stringify(result.reasons ?? [])).toBe('done');

      const applied = await drainProjections(new PgProjectorStore(getPool()));
      expect(applied).toBeGreaterThan(0);

      const projected = await getPool().query<{
        status: string;
        data: { status: string };
      }>('SELECT status, data FROM work_items WHERE id = $1', [id]);
      expect(projected.rowCount).toBe(1);
      expect(projected.rows[0].status).toBe('done');
      expect(projected.rows[0].data.status).toBe('done');

      const stored = await getWorkItem(id);
      expect(stored?.status).toBe('done');

      const events = await getPool().query<{ count: string }>(
        'SELECT count(*) AS count FROM events WHERE aggregate_id = $1',
        [id],
      );
      expect(Number(events.rows[0].count)).toBeGreaterThanOrEqual(3);

      console.log(
        JSON.stringify({
          phase1Exit: { workItemId: id, status: result.status, projected: true },
        }),
      );
    },
    120_000,
  );
});