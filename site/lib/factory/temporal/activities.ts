import { ApplicationFailure } from '@temporalio/activity';
import {
  loadWorkItemFromEvents,
  transitionWorkItem,
} from '../repository';
import type { WorkItemWorkflowInput } from './workflows';

export async function loadWorkItem(input: WorkItemWorkflowInput) {
  const item = await loadWorkItemFromEvents(input.workItemId);
  if (!item) {
    throw ApplicationFailure.nonRetryable(
      `WorkItem not found: ${input.workItemId}`,
      'WORK_ITEM_NOT_FOUND',
    );
  }
  return item;
}

export async function markWorkItemRunning(
  input: WorkItemWorkflowInput,
): Promise<void> {
  const current = await loadWorkItemFromEvents(input.workItemId);
  if (!current) {
    throw ApplicationFailure.nonRetryable(
      `WorkItem not found: ${input.workItemId}`,
      'WORK_ITEM_NOT_FOUND',
    );
  }
  if (current.status === 'running') return;
  if (current.status === 'planned') {
    await transitionWorkItem(input.workItemId, 'ready', input.actor);
  }
  if (current.status !== 'planned' && current.status !== 'ready') {
    throw ApplicationFailure.nonRetryable(
      `Unexpected WorkItem status: ${current.status}`,
      'UNEXPECTED_STATUS',
    );
  }
  await transitionWorkItem(input.workItemId, 'running', input.actor);
}

export async function markWorkItemAwaitingApproval(
  input: WorkItemWorkflowInput,
): Promise<void> {
  const current = await loadWorkItemFromEvents(input.workItemId);
  if (!current) {
    throw ApplicationFailure.nonRetryable(
      `WorkItem not found: ${input.workItemId}`,
      'WORK_ITEM_NOT_FOUND',
    );
  }

  if (current.status === 'running') {
    await transitionWorkItem(input.workItemId, 'verifying', input.actor);
  }

  const verifying = await loadWorkItemFromEvents(input.workItemId);
  if (verifying?.status === 'awaiting_approval') return;
  if (verifying?.status !== 'verifying') {
    throw ApplicationFailure.nonRetryable(
      `Unexpected WorkItem status: ${verifying?.status ?? 'missing'}`,
      'UNEXPECTED_STATUS',
    );
  }

  await transitionWorkItem(
    input.workItemId,
    'awaiting_approval',
    input.actor,
  );
}
