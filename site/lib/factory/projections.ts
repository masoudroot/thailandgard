import {
  assertWorkItemTransition,
  WorkItemSchema,
  WorkItemStatusSchema,
  type WorkItem,
} from './contracts';
import type { FactoryEvent } from './events';

export type WorkItemProjection = WorkItem;

export function reduceWorkItem(
  state: WorkItemProjection | null,
  event: FactoryEvent,
): WorkItemProjection | null {
  switch (event.eventType) {
    case 'WorkItemCreated': {
      return WorkItemSchema.parse(event.payload);
    }
    case 'WorkItemStatusChanged': {
      if (!state) {
        throw new Error(`Cannot change status before creation: ${event.aggregateId}`);
      }
      const next = WorkItemStatusSchema.parse(event.payload.to);
      assertWorkItemTransition(state.status, next);
      return {
        ...state,
        status: next,
        updatedAt: event.occurredAt,
      };
    }
    default:
      return state;
  }
}
