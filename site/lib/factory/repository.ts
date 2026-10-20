import {
  assertWorkItemTransition,
  type Domain,
  type Risk,
  type WorkItem,
  WorkItemSchema,
  type WorkItemStatus,
} from './contracts';
import { getPool } from './db';
import { appendEvent, readEvents } from './event-store';
import { newId } from './ids';
import { reduceWorkItem } from './projections';

export interface CreateWorkItemInput {
  domain: Domain;
  ownerRole: Domain;
  title: string;
  risk: Risk;
  kpiTarget: string;
  outcomeWindow: string;
  budget: WorkItem['budget'];
  actor: string;
}

export async function createWorkItem(
  input: CreateWorkItemInput,
): Promise<WorkItem> {
  const now = new Date().toISOString();
  const item = WorkItemSchema.parse({
    id: newId(),
    domain: input.domain,
    ownerRole: input.ownerRole,
    title: input.title,
    risk: input.risk,
    status: 'planned',
    playbookVersion: 'v0',
    policyVersion: 'v0',
    kpiTarget: input.kpiTarget,
    outcomeWindow: input.outcomeWindow,
    budget: input.budget,
    createdAt: now,
    updatedAt: now,
  });

  await appendEvent({
    aggregateType: 'work_item',
    aggregateId: item.id,
    eventType: 'WorkItemCreated',
    payload: item,
    actor: input.actor,
    expectedVersion: 0,
  });

  return item;
}

export async function getWorkItem(id: string): Promise<WorkItem | null> {
  const result = await getPool().query<{ data: WorkItem }>(
    'SELECT data FROM work_items WHERE id = $1',
    [id],
  );
  return result.rowCount ? result.rows[0].data : null;
}

export async function loadWorkItemState(
  id: string,
): Promise<{ item: WorkItem; version: number } | null> {
  const events = await readEvents(id);
  if (events.length === 0) return null;
  const item = events.reduce<WorkItem | null>(
    (state, event) => reduceWorkItem(state, event),
    null,
  );
  if (!item) return null;
  return { item, version: events[events.length - 1].version };
}

export async function loadWorkItemFromEvents(
  id: string,
): Promise<WorkItem | null> {
  return (await loadWorkItemState(id))?.item ?? null;
}

export async function transitionWorkItem(
  id: string,
  to: WorkItemStatus,
  actor: string,
): Promise<WorkItem> {
  const state = await loadWorkItemState(id);
  if (!state) throw new Error(`WorkItem not found: ${id}`);
  assertWorkItemTransition(state.item.status, to);

  const occurredAt = new Date().toISOString();
  await appendEvent({
    aggregateType: 'work_item',
    aggregateId: id,
    eventType: 'WorkItemStatusChanged',
    payload: { from: state.item.status, to },
    actor,
    expectedVersion: state.version,
  });

  return { ...state.item, status: to, updatedAt: occurredAt };
}
