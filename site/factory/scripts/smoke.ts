import {
  artifactKey,
  createS3ArtifactStore,
} from '../../lib/factory/artifacts';
import { closePool, getPool } from '../../lib/factory/db';
import { projectBatch } from '../../lib/factory/projector';
import { PgProjectorStore } from '../../lib/factory/projector-pg';
import { createWorkItem, getWorkItem } from '../../lib/factory/repository';
import { startWorkItemWorkflow } from '../../lib/factory/temporal/client';

async function waitForStatus(
  id: string,
  expected: string,
  timeoutMs = 60_000,
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
  const item = await createWorkItem({
    domain: 'content',
    ownerRole: 'content',
    title: `Foundation smoke ${new Date().toISOString()}`,
    risk: 'R1',
    kpiTarget: 'smoke',
    outcomeWindow: '1d',
    budget: { tokens: 1_000, costUsd: 0.01, wallClockMinutes: 5 },
    actor: 'factory-smoke',
  });

  const workflowId = await startWorkItemWorkflow({
    workItemId: item.id,
    actor: 'factory-smoke',
  });

  const key = artifactKey(item.id, 'smoke.txt');
  await createS3ArtifactStore().put(
    key,
    new TextEncoder().encode('factory-smoke'),
    'text/plain',
  );

  await waitForStatus(item.id, 'awaiting_approval');
  console.log(
    JSON.stringify({
      workItemId: item.id,
      workflowId,
      artifactKey: key,
      status: 'awaiting_approval',
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
