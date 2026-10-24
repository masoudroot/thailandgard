import { afterAll, describe, expect, it } from 'vitest';
import { closePool, getPool } from '@/lib/factory/db';
import { insertOutcome, insertRelease } from '@/lib/factory/records';
import { newId } from '@/lib/factory/ids';

const databaseUrl = process.env.TEST_DATABASE_URL;

if (databaseUrl) {
  process.env.FACTORY_DATABASE_URL = databaseUrl;
  process.env.FACTORY_CONTROL_TOKEN =
    process.env.FACTORY_CONTROL_TOKEN ?? 'x'.repeat(32);
}

describe.skipIf(!databaseUrl)('records integration', () => {
  afterAll(async () => {
    await closePool();
  });

  it('inserts a release and an outcome', async () => {
    const workItemId = newId();
    const releaseId = newId();
    const outcomeId = newId();

    await insertRelease({
      id: releaseId,
      workItemId,
      risk: 'R0',
      buildSha: 'dry-run-test',
      status: 'dry_run',
    });
    await insertOutcome({
      id: outcomeId,
      workItemId,
      metric: 'organic_sessions',
      window: '1d',
      baseline: 0,
      value: 0,
      status: 'pending',
    });

    const result = await getPool().query<{
      releases: string;
      outcomes: string;
    }>(
      `SELECT
        (SELECT count(*) FROM releases WHERE id = $1) AS releases,
        (SELECT count(*) FROM outcomes WHERE id = $2) AS outcomes`,
      [releaseId, outcomeId],
    );
    expect(Number(result.rows[0].releases)).toBe(1);
    expect(Number(result.rows[0].outcomes)).toBe(1);
  });
});
