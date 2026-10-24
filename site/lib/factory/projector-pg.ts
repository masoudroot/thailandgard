import type { Pool } from 'pg';
import type { FactoryEvent } from './events';
import type { ProjectorStore } from './projector';
import type { WorkItemProjection } from './projections';

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

export class PgProjectorStore implements ProjectorStore {
  constructor(private readonly pool: Pool) {}

  async loadCheckpoint(name: string): Promise<number> {
    const result = await this.pool.query<{ last_sequence: string }>(
      'SELECT last_sequence FROM projection_checkpoints WHERE name = $1',
      [name],
    );
    return result.rowCount ? Number(result.rows[0].last_sequence) : 0;
  }

  async loadEvents(afterSequence: number, limit: number): Promise<FactoryEvent[]> {
    const result = await this.pool.query<EventRow>(
      `SELECT sequence, id, aggregate_type, aggregate_id, event_type, payload, actor, occurred_at, version
       FROM events
       WHERE sequence > $1
       ORDER BY sequence ASC
       LIMIT $2`,
      [afterSequence, limit],
    );

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

  async getWorkItem(id: string): Promise<WorkItemProjection | null> {
    const result = await this.pool.query<{ data: WorkItemProjection }>(
      'SELECT data FROM work_items WHERE id = $1',
      [id],
    );
    return result.rowCount ? result.rows[0].data : null;
  }

  async saveWorkItem(item: WorkItemProjection): Promise<void> {
    await this.pool.query(
      `INSERT INTO work_items (id, status, domain, risk, data, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET
         status = EXCLUDED.status,
         domain = EXCLUDED.domain,
         risk = EXCLUDED.risk,
         data = EXCLUDED.data,
         updated_at = EXCLUDED.updated_at`,
      [item.id, item.status, item.domain, item.risk, item, item.updatedAt],
    );
  }

  async saveCheckpoint(name: string, sequence: number): Promise<void> {
    await this.pool.query(
      `INSERT INTO projection_checkpoints (name, last_sequence, updated_at)
       VALUES ($1, $2, now())
       ON CONFLICT (name) DO UPDATE SET
         last_sequence = EXCLUDED.last_sequence,
         updated_at = now()`,
      [name, sequence],
    );
  }
}
