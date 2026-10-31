import { describe, expect, it } from 'vitest';
import { summarizeGatewayOperations } from '@/lib/factory-dashboard/data';

describe('R3C dashboard gateway summary', () => {
  it('sums calls and costs and collects distinct cost bases', () => {
    const summary = summarizeGatewayOperations([
      { provider_calls: 1, estimated_cost: 100, actual_cost: 30, cost_basis: 'simulated' },
      { provider_calls: 2, estimated_cost: 50, actual_cost: 50, cost_basis: 'simulated' },
      { provider_calls: 0, estimated_cost: null, actual_cost: null, cost_basis: null },
    ]);
    expect(summary.totalCalls).toBe(3);
    expect(summary.totalEstimated).toBe(150);
    expect(summary.totalActual).toBe(80);
    expect(summary.costBases).toEqual(['simulated']);
  });

  it('returns zeros and no bases for an empty list', () => {
    expect(summarizeGatewayOperations([])).toEqual({
      totalCalls: 0,
      totalEstimated: 0,
      totalActual: 0,
      costBases: [],
    });
  });
});
