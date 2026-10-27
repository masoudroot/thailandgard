import { closePool, getPool } from '../../lib/factory/db';
import { loadFactoryEnvFile } from '../../lib/factory/local-env';
import { projectBatch } from '../../lib/factory/projector';
import { PgProjectorStore } from '../../lib/factory/projector-pg';
import { logger } from '../../lib/logger';

async function main(): Promise<void> {
  loadFactoryEnvFile();
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
  logger.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
