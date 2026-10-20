import path from 'node:path';
import { NativeConnection, Worker } from '@temporalio/worker';
import { loadFactoryConfig } from '../../lib/factory/config';
import * as activities from '../../lib/factory/temporal/activities';
import { temporalConnectionOptions } from '../../lib/factory/temporal/client';
import {
  startFactoryTelemetry,
  stopFactoryTelemetry,
} from '../../lib/factory/telemetry';

async function main(): Promise<void> {
  startFactoryTelemetry();
  const config = loadFactoryConfig();
  const connection = await NativeConnection.connect(
    temporalConnectionOptions(config),
  );

  const worker = await Worker.create({
    connection,
    namespace: config.temporalNamespace,
    taskQueue: config.taskQueue,
    workflowsPath: path.join(__dirname, '../../lib/factory/temporal/workflows.ts'),
    activities,
  });

  const shutdown = async () => {
    await worker.shutdown();
    await connection.close();
    await stopFactoryTelemetry();
  };

  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());

  await worker.run();
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
