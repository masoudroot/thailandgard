import { describe, expect, it } from 'vitest';
import { CreateWorkItemRequestSchema } from '@/lib/factory/api';

const valid = {
  domain: 'content',
  ownerRole: 'content',
  title: 'Refresh the Chiang Mai guide',
  risk: 'R1',
  kpiTarget: 'organic_sessions_chiang_mai',
  outcomeWindow: '28d',
  budget: { tokens: 40_000, costUsd: 2, wallClockMinutes: 120 },
  actor: 'masoud',
};

describe('CreateWorkItemRequestSchema', () => {
  it('accepts a valid request', () => {
    expect(CreateWorkItemRequestSchema.parse(valid).title).toContain('Chiang Mai');
  });

  it('rejects a request without a KPI', () => {
    const withoutKpi = Object.fromEntries(
      Object.entries(valid).filter(([key]) => key !== 'kpiTarget'),
    );
    expect(() => CreateWorkItemRequestSchema.parse(withoutKpi)).toThrow();
  });
});
