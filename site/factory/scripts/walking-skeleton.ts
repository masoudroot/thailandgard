import type { ContentBrief } from '../../lib/factory/content/contracts';
import { closePool, getPool } from '../../lib/factory/db';
import { loadFactoryEnvFile } from '../../lib/factory/local-env';
import { drainProjections } from '../../lib/factory/projector';
import { PgProjectorStore } from '../../lib/factory/projector-pg';
import { createWorkItem, getWorkItem } from '../../lib/factory/repository';
import { runWorkItem } from '../../lib/factory/runner';
import { logger } from '../../lib/logger';

async function main(): Promise<void> {
  loadFactoryEnvFile();
  if (process.env.FACTORY_RUNTIME === 'new') {
    throw new Error('Refusing to run walking skeleton with FACTORY_RUNTIME=new');
  }

  const item = await createWorkItem({
    domain: 'content',
    ownerRole: 'content',
    title: `Walking skeleton ${new Date().toISOString()}`,
    risk: 'R0',
    kpiTarget: 'organic_sessions_phuket_october',
    outcomeWindow: '28d',
    budget: { tokens: 12_000, costUsd: 0.25, wallClockMinutes: 20 },
    actor: 'walking-skeleton',
  });

  const contentBrief: ContentBrief = {
    workItemId: item.id,
    title: 'راهنمای کامل سفر به پوکت در آبان ۱۴۰۵',
    slug: `phuket-october-${item.id.slice(0, 8)}`,
    targetKeyword: 'سفر به پوکت',
    audience: 'مسافران فارسی‌زبان',
    intent: 'informational',
    sourceFacts: [
      {
        claim: 'آبان یکی از ماه‌های محبوب سفر به جنوب تایلند است.',
        source: 'https://thailandgard.ir/',
      },
    ],
    cta: 'برای مشاهدهٔ تورهای فعال، صفحهٔ تورهای تایلند را ببینید.',
  };

  const result = await runWorkItem({
    workItemId: item.id,
    actor: 'walking-skeleton',
    mode: 'walking_skeleton',
    contentBrief,
  });

  await drainProjections(new PgProjectorStore(getPool()));
  const stored = await getWorkItem(item.id);

  const counts = await getPool().query<{
    artifacts: string;
    evidence: string;
    releases: string;
    outcomes: string;
  }>(
    `SELECT
      (SELECT count(*) FROM artifacts WHERE work_item_id = $1) AS artifacts,
      (SELECT count(*) FROM evidence WHERE work_item_id = $1) AS evidence,
      (SELECT count(*) FROM releases WHERE work_item_id = $1) AS releases,
      (SELECT count(*) FROM outcomes WHERE work_item_id = $1) AS outcomes`,
    [item.id],
  );
  const row = counts.rows[0];

  for (const key of ['artifacts', 'evidence', 'releases', 'outcomes'] as const) {
    if (Number(row[key]) < 1) {
      throw new Error(`Expected at least one ${key} for ${item.id}`);
    }
  }
  if (Number(row.evidence) < 2) {
    throw new Error(`Expected two evidence records for ${item.id}`);
  }
  if (result.status !== 'done' || stored?.status !== 'done') {
    throw new Error(
      `Walking skeleton expected done, got run=${result.status} stored=${stored?.status}` +
        (result.reasons ? `: ${result.reasons.join('; ')}` : ''),
    );
  }

  logger.info(
    JSON.stringify({
      workItemId: item.id,
      status: result.status,
      releaseId: result.releaseId,
      artifacts: Number(row.artifacts),
      evidence: Number(row.evidence),
      releases: Number(row.releases),
      outcomes: Number(row.outcomes),
    }),
  );
}

main()
  .catch((error: unknown) => {
    logger.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });