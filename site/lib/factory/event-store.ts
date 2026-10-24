import { withTransaction } from './db';
import type { FactoryEvent } from './events';
import { newId } from './ids';

export interface AppendEventInput {
  aggregateType: 'work_item' | 'task';
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
  actor: string;
  topic?: string;
  expectedVersion?: number;
}

interface EventRow {
  sequence: string;
  id: string;
  aggregate_type: 'work_item' | 'task';
  aggregate_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  actor: string;
  occurred_at: Date;
  version: number;
}

export async function appendEvent(
  input: AppendEventInput,
): Promise<FactoryEvent> {
  return withTransaction(async (client) => {
    await client.query(
      'SELECT pg_advisory_xact_lock(hashtext($1)::bigint)',
      [input.aggregateId],
    );

    const versionResult = await client.query<{ next_version: string }>(
      'SELECT COALESCE(MAX(version), 0) + 1 AS next_version FROM events WHERE aggregate_id = $1',
      [input.aggregateId],
    );
    const version = Number(versionResult.rows[0].next_version);
    if (
      input.expectedVersion !== undefined &&
      version !== input.expectedVersion + 1
    ) {
      throw new Error(
        `Concurrent modification for aggregate ${input.aggregateId}`,
      );
    }
    const id = newId();
    const occurredAt = new Date().toISOString();

    const result = await client.query<{ sequence: string }>(
      `INSERT INTO events
        (id, aggregate_type, aggregate_id, event_type, payload, actor, occurred_at, version)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING sequence`,
      [
        id,
        input.aggregateType,
        input.aggregateId,
        input.eventType,
        input.payload,
        input.actor,
        occurredAt,
        version,
      ],
    );
    const sequence = Number(result.rows[0].sequence);

    await client.query(
      'INSERT INTO outbox (event_sequence, topic) VALUES ($1, $2)',
      [sequence, input.topic ?? 'factory.events'],
    );

    return {
      sequence,
      id,
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      eventType: input.eventType,
      payload: input.payload,
      actor: input.actor,
      occurredAt,
      version,
    };
  });
}

export async function readEvents(
  aggregateId: string,
): Promise<FactoryEvent[]> {
  const result = await withTransaction(async (client) => {
    return client.query<EventRow>(
      `SELECT sequence, id, aggregate_type, aggregate_id, event_type, payload, actor, occurred_at, version
       FROM events
       WHERE aggregate_id = $1
       ORDER BY version ASC`,
      [aggregateId],
    );
  });

  return result.rows.map((row) => ({
    sequence: Number(row.sequence),
    id: String(row.id),
    aggregateType: row.aggregate_type,
    aggregateId: String(row.aggregate_id),
    eventType: String(row.event_type),
    payload: row.payload,
    actor: String(row.actor),
    occurredAt: new Date(row.occurred_at).toISOString(),
    version: Number(row.version),
  }));
}
