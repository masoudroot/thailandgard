export interface FactoryEvent {
  sequence: number;
  id: string;
  aggregateType: 'work_item' | 'task';
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
  actor: string;
  occurredAt: string;
  version: number;
}
