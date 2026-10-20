import { closePool, getPool } from '../../lib/factory/db';
import { projectBatch } from '../../lib/factory/projector';
import { PgProjectorStore } from '../../lib/factory/projector-pg';

async function main(): Promise<void> {
  const store = new PgProjectorStore(getPool());
  let running = true;

  process.on('SIGINT', () => {
    running = false;
  });
  process.on('SIGTERM', () => {
    running = false;
  });

  while (running) {
    const applied = await projectBatch(store);
    if (applied === 0) {
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
  }

  await closePool();
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
