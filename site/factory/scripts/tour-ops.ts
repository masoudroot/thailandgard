import { closePool, getPool } from '../../lib/factory/db';
import { loadFactoryEnvFile } from '../../lib/factory/local-env';
import { projectBatch } from '../../lib/factory/projector';
import { PgProjectorStore } from '../../lib/factory/projector-pg';
import { createWorkItem, getWorkItem } from '../../lib/factory/repository';
import { startTourOpsWorkflow } from '../../lib/factory/temporal/client';

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
}

async function waitForStatus(
  id: string,
  expected: string[],
  timeoutMs = 120_000,
): Promise<string> {
  const store = new PgProjectorStore(getPool());
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await projectBatch(store);
    const item = await getWorkItem(id);
    if (item && expected.includes(item.status)) return item.status;
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error(`Timed out waiting for ${id} to reach ${expected.join(', ')}`);
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

  const allowFallback = process.argv.includes('--allow-fallback');
  const workflowId = await startTourOpsWorkflow({
    workItemId: item.id,
    actor: 'tour-ops',
    requireFreshPrices: !process.argv.includes('--no-require-fresh'),
    requireSupabase: !process.argv.includes('--no-require-supabase'),
    allowFallback,
  });

  const status = process.argv.includes('--no-wait')
    ? 'started'
    : await waitForStatus(item.id, [
        'awaiting_approval',
        'blocked',
        'failed',
        'done',
      ]);

  console.log(
    JSON.stringify(
      { workItemId: item.id, workflowId, status },
      null,
      2,
    ),
  );
  if (status === 'blocked' || status === 'failed') process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(
      '[tour-ops]',
      error instanceof Error ? error.message : String(error),
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
