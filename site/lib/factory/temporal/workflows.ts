import { log, proxyActivities } from '@temporalio/workflow';
import type * as activities from './activities';

const {
  loadWorkItem,
  markWorkItemRunning,
  markWorkItemAwaitingApproval,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '2 minutes',
  retry: {
    maximumAttempts: 3,
    initialInterval: '1 second',
    backoffCoefficient: 2,
  },
});

export interface WorkItemWorkflowInput {
  workItemId: string;
  actor: string;
}

export interface WorkItemWorkflowResult {
  status: 'awaiting_approval';
}

export async function workItemWorkflow(
  input: WorkItemWorkflowInput,
): Promise<WorkItemWorkflowResult> {
  await loadWorkItem(input);
  await markWorkItemRunning(input);
  await markWorkItemAwaitingApproval(input);
  log.info('work item prepared for approval', {
    workItemId: input.workItemId,
  });
  return { status: 'awaiting_approval' };
}
