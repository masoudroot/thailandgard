import { describe, expect, it } from 'vitest';
import {
  assertTaskTransition,
  assertWorkItemTransition,
  TaskOutputSchema,
  WorkItemSchema,
} from '@/lib/factory/contracts';
import { newId } from '@/lib/factory/ids';

const now = new Date().toISOString();

const item = {
  id: newId(),
  domain: 'content',
  ownerRole: 'content',
  title: 'Update the Phuket October guide',
  risk: 'R1',
  status: 'planned',
  playbookVersion: 'content@1',
  policyVersion: 'policy@1',
  kpiTarget: 'organic_sessions_phuket_october',
  outcomeWindow: '28d',
  budget: { tokens: 50_000, costUsd: 2, wallClockMinutes: 120 },
  createdAt: now,
  updatedAt: now,
};

describe('WorkItemSchema', () => {
  it('accepts a valid work item', () => {
    expect(WorkItemSchema.parse(item).id).toBe(item.id);
  });

  it('rejects an unknown risk', () => {
    expect(() => WorkItemSchema.parse({ ...item, risk: 'R5' })).toThrow();
  });
});

describe('work item transitions', () => {
  it('allows running to verifying', () => {
    expect(() => assertWorkItemTransition('running', 'verifying')).not.toThrow();
  });

  it('rejects done to running', () => {
    expect(() => assertWorkItemTransition('done', 'running')).toThrow(
      /done -> running/,
    );
  });

  it('requires planned items to become ready before running', () => {
    expect(() => assertWorkItemTransition('planned', 'running')).toThrow(
      /planned -> running/,
    );
  });
});

describe('task transitions', () => {
  it('allows ready to running', () => {
    expect(() => assertTaskTransition('ready', 'running')).not.toThrow();
  });
});

describe('TaskOutputSchema', () => {
  it('requires evidence or an artifact for an ok output', () => {
    expect(() =>
      TaskOutputSchema.parse({
        status: 'ok',
        artifacts: [],
        evidence: [],
        confidence: 0.9,
        cost: { tokens: 100, usd: 0.01 },
        reason: 'looks good',
        nextActions: [],
      }),
    ).toThrow(/artifact or evidence/);
  });
});
