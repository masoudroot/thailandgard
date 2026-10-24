import { Client, Connection } from '@temporalio/client';
import { WorkflowIdReusePolicy } from '@temporalio/common';
import { loadFactoryConfig, type FactoryConfig } from '../config';
import type {
  OutreachWorkflowInput,
  SeoOpsWorkflowInput,
  TourOpsWorkflowInput,
  WorkItemWorkflowInput,
} from './workflows';

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

async function startFactoryWorkflow(
  workflowType: string,
  workflowId: string,
  input: unknown,
): Promise<string> {
  const config = loadFactoryConfig();
  const temporal = await getTemporalClient();
  const handle = await temporal.workflow.start(workflowType, {
    taskQueue: config.taskQueue,
    workflowId,
    workflowIdReusePolicy: WorkflowIdReusePolicy.ALLOW_DUPLICATE_FAILED_ONLY,
    args: [input],
  });
  return handle.workflowId;
}

export async function startWorkItemWorkflow(
  input: WorkItemWorkflowInput,
): Promise<string> {
  return startFactoryWorkflow(
    'workItemWorkflow',
    `work-item-${input.workItemId}`,
    input,
  );
}

export async function startSeoOpsWorkflow(
  input: SeoOpsWorkflowInput,
): Promise<string> {
  return startFactoryWorkflow(
    'seoOpsWorkflow',
    `seo-ops-${input.workItemId}`,
    input,
  );
}

export async function startTourOpsWorkflow(
  input: TourOpsWorkflowInput,
): Promise<string> {
  return startFactoryWorkflow(
    'tourOpsWorkflow',
    `tour-ops-${input.workItemId}`,
    input,
  );
}

export async function startOutreachWorkflow(
  input: OutreachWorkflowInput,
): Promise<string> {
  return startFactoryWorkflow(
    'outreachWorkflow',
    `outreach-${input.workItemId}`,
    input,
  );
}
