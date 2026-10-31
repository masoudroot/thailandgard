import { describe, expect, it } from 'vitest';
import {
  GatewayOperationError,
  gatewayLogicalOperationId,
} from '@/lib/factory/tick/gateway-operation-run';

describe('R3C shared gateway operation core', () => {
  it('derives the logical operation id from the step key, not the step id', () => {
    const a = gatewayLogicalOperationId('11111111-1111-4111-8111-111111111111', 'generate_draft_mock', 'generate_draft_mock');
    const b = gatewayLogicalOperationId('11111111-1111-4111-8111-111111111111', 'generate_draft_mock', 'generate_draft_mock');
    expect(a).toBe(b);
    expect(a.startsWith('gwop1:')).toBe(true);
  });

  it('changes the logical id when the work item, step key, or operation name changes', () => {
    const base = gatewayLogicalOperationId('11111111-1111-4111-8111-111111111111', 'generate_draft_mock', 'generate_draft_mock');
    expect(
      gatewayLogicalOperationId('22222222-2222-4222-8222-222222222222', 'generate_draft_mock', 'generate_draft_mock'),
    ).not.toBe(base);
    expect(
      gatewayLogicalOperationId('11111111-1111-4111-8111-111111111111', 'prepare_context', 'generate_draft_mock'),
    ).not.toBe(base);
    expect(
      gatewayLogicalOperationId('11111111-1111-4111-8111-111111111111', 'generate_draft_mock', 'other_op'),
    ).not.toBe(base);
  });

  it('keeps the error code on GatewayOperationError', () => {
    const error = new GatewayOperationError('debt_open', 'blocked by open excess');
    expect(error.code).toBe('debt_open');
    expect(error.message).toBe('blocked by open excess');
    expect(error instanceof Error).toBe(true);
  });
});
