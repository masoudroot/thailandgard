import type { ContentBrief } from '../../lib/factory/content/contracts';
import { closePool, getPool } from '../../lib/factory/db';
import { newId } from '../../lib/factory/ids';
import { loadFactoryEnvFile } from '../../lib/factory/local-env';
import { projectBatch } from '../../lib/factory/projector';
import { PgProjectorStore } from '../../lib/factory/projector-pg';
import { createWorkItem, getWorkItem } from '../../lib/factory/repository';
import { startWorkItemWorkflow } from '../../lib/factory/temporal/client';

async function waitForStatus(
  id: string,
  expected: string,
  timeoutMs = 90_000,
): Promise<void> {
  const store = new PgProjectorStore(getPool());
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await projectBatch(store);
    const item = await getWorkItem(id);
    if (item?.status === expected) return;
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error(`Timed out waiting for ${id} to reach ${expected}`);
}

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

  const workflowId = await startWorkItemWorkflow({
    workItemId: item.id,
    actor: 'walking-skeleton',
    mode: 'walking_skeleton',
    contentBrief,
  });

  await waitForStatus(item.id, 'done');

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

  console.log(
    JSON.stringify({
      workItemId: item.id,
      workflowId,
      status: 'done',
      artifacts: Number(row.artifacts),
      evidence: Number(row.evidence),
      releases: Number(row.releases),
      outcomes: Number(row.outcomes),
      executionId: newId(),
    }),
  );
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
