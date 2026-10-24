import { artifactKey, createArtifactStore } from '../../lib/factory/artifacts';
import { closePool, getPool } from '../../lib/factory/db';
import { loadFactoryEnvFile } from '../../lib/factory/local-env';
import { drainProjections } from '../../lib/factory/projector';
import { PgProjectorStore } from '../../lib/factory/projector-pg';
import { createWorkItem, getWorkItem } from '../../lib/factory/repository';
import { runWorkItem } from '../../lib/factory/runner';

async function main(): Promise<void> {
  loadFactoryEnvFile();
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

  const result = await runWorkItem({
    workItemId: item.id,
    actor: 'factory-smoke',
  });

  const key = artifactKey(item.id, 'smoke.txt');
  await createArtifactStore().put(
    key,
    new TextEncoder().encode('factory-smoke'),
    'text/plain',
  );

  await drainProjections(new PgProjectorStore(getPool()));
  const stored = await getWorkItem(item.id);

  if (
    result.status !== 'awaiting_approval' ||
    stored?.status !== 'awaiting_approval'
  ) {
    throw new Error(
      `Smoke expected awaiting_approval, got run=${result.status} stored=${stored?.status}`,
    );
  }

  console.log(
    JSON.stringify({
      workItemId: item.id,
      artifactKey: key,
      status: stored?.status,
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