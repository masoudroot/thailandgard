import { afterAll, describe, expect, it } from 'vitest';
import { closePool, getPool } from '@/lib/factory/db';
import { addProspect, addSuppression, getOutreachContext, insertOutreachPlan } from '@/lib/factory/outreach/store';
import { persistSeoSignals } from '@/lib/factory/seo/store';
import { persistTourFacts } from '@/lib/factory/tours/store';
import { toTourFact } from '@/lib/factory/tours/facts';

const databaseUrl = process.env.TEST_DATABASE_URL;

if (databaseUrl) {
  process.env.FACTORY_DATABASE_URL = databaseUrl;
  process.env.FACTORY_CONTROL_TOKEN =
    process.env.FACTORY_CONTROL_TOKEN ?? 'x'.repeat(32);
}

describe.skipIf(!databaseUrl)('P3 persistence integration', () => {
  afterAll(async () => {
    await closePool();
  });

  it('upserts a SEO signal by dedupe key', async () => {
    const key = `test:${Date.now()}`;
    const signal = {
      dedupeKey: key,
      type: 'query_opportunity' as const,
      priority: 70,
      title: 'test signal',
      detail: 'test detail',
      subject: 'test query',
      metrics: { impressions: 100 },
      source: 'gsc' as const,
      observedAt: new Date().toISOString(),
    };

    expect(await persistSeoSignals([signal])).toEqual({
      inserted: 1,
      updated: 0,
    });
    expect(await persistSeoSignals([{ ...signal, priority: 80 }])).toEqual({
      inserted: 0,
      updated: 1,
    });
    const row = await getPool().query<{ priority: number }>(
      'SELECT priority FROM seo_signals WHERE dedupe_key = $1',
      [key],
    );
    expect(row.rows[0].priority).toBe(80);
  });

  it('stores a tour fact snapshot once per hash', async () => {
    const slug = `test-tour-${Date.now()}`;
    const fact = toTourFact(
      {
        slug,
        title: 'Test tour',
        days: 5,
        nights: 4,
        route: 'Tehran | Bangkok | Tehran',
        priceFrom: 10_000_000,
        priceUpdatedAt: new Date().toISOString(),
        active: true,
        touristType: 'test',
      },
      {
        source: 'supabase',
        now: new Date(),
        fetchedAt: new Date().toISOString(),
      },
    );
    expect(await persistTourFacts([fact])).toEqual({
      inserted: 1,
      existing: 0,
    });
    expect(await persistTourFacts([fact])).toEqual({
      inserted: 0,
      existing: 1,
    });
  });

  it('queues an outreach plan and sees suppressions in context', async () => {
    const domain = `test-${Date.now()}.example`;
    const prospect = await addProspect({
      domain,
      url: `https://${domain}/thailand`,
      contactEmail: `editor@${domain}`,
      relevance: 90,
    });
    await addSuppression(`blocked@${domain}`, 'test');
    const context = await getOutreachContext();
    expect(context.suppressions.has(`blocked@${domain}`)).toBe(true);

    const persistence = await insertOutreachPlan({
      planned: [
        {
          prospectId: prospect.id,
          domain,
          steps: [
            {
              step: 1,
              subject: 'hello',
              body: 'body {{unsubscribeUrl}}',
              scheduledAt: new Date().toISOString(),
            },
          ],
        },
      ],
      skipped: [],
    });
    expect(persistence.inserted).toBe(1);
  });
});
