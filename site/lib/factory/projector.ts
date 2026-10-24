import type { FactoryEvent } from './events';
import { reduceWorkItem, type WorkItemProjection } from './projections';

export interface ProjectorStore {
  loadCheckpoint(name: string): Promise<number>;
  loadEvents(afterSequence: number, limit: number): Promise<FactoryEvent[]>;
  getWorkItem(id: string): Promise<WorkItemProjection | null>;
  saveWorkItem(item: WorkItemProjection): Promise<void>;
  saveCheckpoint(name: string, sequence: number): Promise<void>;
}

export async function projectBatch(
  store: ProjectorStore,
  name = 'default',
  limit = 100,
): Promise<number> {
  let lastSequence = await store.loadCheckpoint(name);
  const events = await store.loadEvents(lastSequence, limit);
  let applied = 0;

  for (const event of events) {
    if (event.aggregateType === 'work_item') {
      const current = await store.getWorkItem(event.aggregateId);
      const next = reduceWorkItem(current, event);
      if (next) await store.saveWorkItem(next);
    }
    lastSequence = event.sequence;
    applied += 1;
  }

  if (applied > 0) {
    await store.saveCheckpoint(name, lastSequence);
  }

  return applied;
}

/**
 * Projects events until the checkpoint catches up with the event log.
 * Used by scripts and the runner host to read up-to-date projections right
 * after a synchronous run (no separate projector process required).
 */
export async function drainProjections(
  store: ProjectorStore,
  name = 'default',
): Promise<number> {
  let total = 0;
  for (;;) {
    const applied = await projectBatch(store, name);
    total += applied;
    if (applied === 0) return total;
  }
}
