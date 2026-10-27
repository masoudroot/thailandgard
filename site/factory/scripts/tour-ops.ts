import { closePool, getPool } from '../../lib/factory/db';
import { loadFactoryEnvFile } from '../../lib/factory/local-env';
import { drainProjections } from '../../lib/factory/projector';
import { PgProjectorStore } from '../../lib/factory/projector-pg';
import { createWorkItem, getWorkItem } from '../../lib/factory/repository';
import { runTourOps } from '../../lib/factory/runner';
import { logger } from '../../lib/logger';

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
}

async function main(): Promise<void> {
  loadFactoryEnvFile();
  const requestedId = option('--work-item');
  const item =
    requestedId !== undefined
      ? await getWorkItem(requestedId)
      : await createWorkItem({
          domain: 'tour-manager',
          ownerRole: 'tour-manager',
          title: `Tour Ops ${new Date().toISOString()}`,
          risk: 'R1',
          kpiTarget: 'tour_fact_accuracy',
          outcomeWindow: '7d',
          budget: { tokens: 8_000, costUsd: 0.2, wallClockMinutes: 15 },
          actor: 'tour-ops',
        });

  if (!item) throw new Error(`WorkItem not found: ${requestedId}`);

  const result = await runTourOps({
    workItemId: item.id,
    actor: 'tour-ops',
    requireFreshPrices: !process.argv.includes('--no-require-fresh'),
    requireSupabase: !process.argv.includes('--no-require-supabase'),
    allowFallback: process.argv.includes('--allow-fallback'),
  });

  await drainProjections(new PgProjectorStore(getPool()));
  const stored = await getWorkItem(item.id);

  logger.info(
    JSON.stringify(
      {
        workItemId: item.id,
        status: result.status,
        projectionStatus: stored?.status,
        planArtifactId: result.planArtifactId,
        reasons: result.reasons,
      },
      null,
      2,
    ),
  );
  if (result.status === 'blocked') process.exitCode = 1;
}

main()
  .catch((error) => {
    logger.error(
      '[tour-ops]',
      undefined,
      error instanceof Error ? error.message : String(error),
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });