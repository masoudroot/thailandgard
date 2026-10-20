import { Client, Connection } from '@temporalio/client';
import { WorkflowIdReusePolicy } from '@temporalio/common';
import { loadFactoryConfig, type FactoryConfig } from '../config';
import type { WorkItemWorkflowInput } from './workflows';

let client: Client | null = null;

export function temporalConnectionOptions(config: FactoryConfig) {
  return {
    address: config.temporalAddress,
    ...(config.temporalTls ? { tls: true as const } : {}),
    ...(config.temporalApiKey ? { apiKey: config.temporalApiKey } : {}),
  };
}

export async function getTemporalClient(): Promise<Client> {
  if (!client) {
    const config = loadFactoryConfig();
    const connection = await Connection.connect(
      temporalConnectionOptions(config),
    );
    client = new Client({
      connection,
      namespace: config.temporalNamespace,
    });
  }
  return client;
}

export async function startWorkItemWorkflow(
  input: WorkItemWorkflowInput,
): Promise<string> {
  const config = loadFactoryConfig();
  const temporal = await getTemporalClient();
  const handle = await temporal.workflow.start('workItemWorkflow', {
    taskQueue: config.taskQueue,
    workflowId: `work-item-${input.workItemId}`,
    workflowIdReusePolicy: WorkflowIdReusePolicy.ALLOW_DUPLICATE_FAILED_ONLY,
    args: [input],
  });
  return handle.workflowId;
}
