import { describe, expect, it } from 'vitest';
import type { FactoryEvent } from '@/lib/factory/events';
import type { WorkItem } from '@/lib/factory/contracts';
import { newId } from '@/lib/factory/ids';
import { projectBatch, type ProjectorStore } from '@/lib/factory/projector';
import type { WorkItemProjection } from '@/lib/factory/projections';

const now = new Date().toISOString();
const id = newId();

const created: WorkItem = {
  id,
  domain: 'design',
  ownerRole: 'design',
  title: 'Improve the tour card hierarchy',
  risk: 'R1',
  status: 'planned',
  playbookVersion: 'design@1',
  policyVersion: 'policy@1',
  kpiTarget: 'tour_card_ctr',
  outcomeWindow: '7d',
  budget: { tokens: 10_000, costUsd: 1, wallClockMinutes: 30 },
  createdAt: now,
  updatedAt: now,
};

const events: FactoryEvent[] = [
  {
    sequence: 1,
    id: newId(),
    aggregateType: 'work_item',
    aggregateId: id,
    eventType: 'WorkItemCreated',
    payload: created,
    actor: 'test',
    occurredAt: now,
    version: 1,
  },
  {
    sequence: 2,
    id: newId(),
    aggregateType: 'work_item',
    aggregateId: id,
    eventType: 'WorkItemStatusChanged',
    payload: { from: 'planned', to: 'ready' },
    actor: 'test',
    occurredAt: now,
    version: 2,
  },
  {
    sequence: 3,
    id: newId(),
    aggregateType: 'work_item',
    aggregateId: id,
    eventType: 'WorkItemStatusChanged',
    payload: { from: 'ready', to: 'running' },
    actor: 'test',
    occurredAt: now,
    version: 3,
  },
];

class MemoryStore implements ProjectorStore {
  checkpoint = 0;
  checkpointName = '';
  item: WorkItemProjection | null = null;

  async loadCheckpoint(): Promise<number> {
    return this.checkpoint;
  }

  async loadEvents(afterSequence: number, limit: number): Promise<FactoryEvent[]> {
    return events.filter((event) => event.sequence > afterSequence).slice(0, limit);
  }

  async getWorkItem(): Promise<WorkItemProjection | null> {
    return this.item;
  }

  async saveWorkItem(item: WorkItemProjection): Promise<void> {
    this.item = item;
  }

  async saveCheckpoint(name: string, sequence: number): Promise<void> {
    this.checkpointName = name;
    this.checkpoint = sequence;
  }
}

describe('projectBatch', () => {
  it('applies events and advances the checkpoint', async () => {
    const store = new MemoryStore();
    const applied = await projectBatch(store);
    expect(applied).toBe(3);
    expect(store.checkpointName).toBe('default');
    expect(store.checkpoint).toBe(3);
    expect(store.item?.status).toBe('running');
  });
});
