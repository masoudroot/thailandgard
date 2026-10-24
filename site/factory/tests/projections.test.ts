import { describe, expect, it } from 'vitest';
import type { FactoryEvent } from '@/lib/factory/events';
import type { WorkItem } from '@/lib/factory/contracts';
import { reduceWorkItem } from '@/lib/factory/projections';
import { newId } from '@/lib/factory/ids';

const now = new Date().toISOString();
const item: WorkItem = {
  id: newId(),
  domain: 'seo',
  ownerRole: 'seo',
  title: 'Refresh the Bangkok guide',
  risk: 'R1',
  status: 'planned',
  playbookVersion: 'seo@1',
  policyVersion: 'policy@1',
  kpiTarget: 'organic_sessions_bangkok',
  outcomeWindow: '7d',
  budget: { tokens: 10_000, costUsd: 1, wallClockMinutes: 30 },
  createdAt: now,
  updatedAt: now,
};

function event(
  eventType: string,
  payload: Record<string, unknown>,
  version: number,
): FactoryEvent {
  return {
    sequence: version,
    id: newId(),
    aggregateType: 'work_item',
    aggregateId: item.id,
    eventType,
    payload,
    actor: 'test',
    occurredAt: now,
    version,
  };
}

describe('reduceWorkItem', () => {
  it('creates a work item', () => {
    const state = reduceWorkItem(null, event('WorkItemCreated', item, 1));
    expect(state?.status).toBe('planned');
    expect(state?.id).toBe(item.id);
  });

  it('applies a valid status change', () => {
    const created = reduceWorkItem(null, event('WorkItemCreated', item, 1));
    const ready = reduceWorkItem(
      created,
      event('WorkItemStatusChanged', { from: 'planned', to: 'ready' }, 2),
    );
    expect(ready?.status).toBe('ready');
  });

  it('rejects an invalid status change', () => {
    const created = reduceWorkItem(null, event('WorkItemCreated', item, 1));
    expect(() =>
      reduceWorkItem(
        created,
        event('WorkItemStatusChanged', { from: 'planned', to: 'done' }, 2),
      ),
    ).toThrow(/planned -> done/);
  });
});
