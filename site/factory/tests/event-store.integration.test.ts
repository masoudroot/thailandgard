import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closePool, getPool } from '@/lib/factory/db';
import { appendEvent, readEvents } from '@/lib/factory/event-store';
import { newId } from '@/lib/factory/ids';

const databaseUrl = process.env.TEST_DATABASE_URL;
const hasDatabase = Boolean(databaseUrl);

if (databaseUrl) {
  process.env.FACTORY_DATABASE_URL = databaseUrl;
  process.env.FACTORY_CONTROL_TOKEN = process.env.FACTORY_CONTROL_TOKEN ?? 'x'.repeat(32);
}

describe.skipIf(!hasDatabase)('event store integration', () => {
  beforeAll(async () => {
    await getPool().query('SELECT 1');
  });

  afterAll(async () => {
    await closePool();
  });

  it('appends an event and assigns a monotonic version', async () => {
    const aggregateId = newId();
    const first = await appendEvent({
      aggregateType: 'work_item',
      aggregateId,
      eventType: 'WorkItemCreated',
      payload: { id: aggregateId },
      actor: 'integration-test',
    });
    const second = await appendEvent({
      aggregateType: 'work_item',
      aggregateId,
      eventType: 'WorkItemStatusChanged',
      payload: { from: 'planned', to: 'running' },
      actor: 'integration-test',
    });

    expect(first.version).toBe(1);
    expect(second.version).toBe(2);

    const events = await readEvents(aggregateId);
    expect(events.map((event) => event.version)).toEqual([1, 2]);

    await expect(
      appendEvent({
        aggregateType: 'work_item',
        aggregateId,
        eventType: 'WorkItemStatusChanged',
        payload: { from: 'running', to: 'verifying' },
        actor: 'integration-test',
        expectedVersion: 0,
      }),
    ).rejects.toThrow(/Concurrent modification/);
  });
});
