import { z } from 'zod';

export const DomainSchema = z.enum([
  'leader',
  'tour-manager',
  'content',
  'seo',
  'design',
  'dev',
]);

export const RiskSchema = z.enum(['R0', 'R1', 'R2', 'R3', 'R4']);

export const WorkItemStatusSchema = z.enum([
  'intake',
  'planned',
  'ready',
  'running',
  'verifying',
  'awaiting_approval',
  'releasing',
  'production_verified',
  'done',
  'blocked',
  'failed',
  'canceled',
  'rolled_back',
]);

export const TaskStatusSchema = z.enum([
  'pending',
  'ready',
  'running',
  'verifying',
  'done',
  'blocked',
  'failed',
  'canceled',
]);

export const TaskTypeSchema = z.enum([
  'plan',
  'research',
  'draft',
  'edit',
  'fact_check',
  'seo_review',
  'design_review',
  'implement',
  'test',
  'release',
  'outcome',
]);

export const BudgetSchema = z.object({
  tokens: z.number().int().positive(),
  costUsd: z.number().nonnegative(),
  wallClockMinutes: z.number().int().positive(),
});

export const WorkItemSchema = z.object({
  id: z.string().uuid(),
  domain: DomainSchema,
  ownerRole: DomainSchema,
  title: z.string().min(3).max(200),
  risk: RiskSchema,
  status: WorkItemStatusSchema,
  playbookVersion: z.string().min(1),
  policyVersion: z.string().min(1),
  kpiTarget: z.string().min(1),
  outcomeWindow: z.string().min(1),
  budget: BudgetSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const ArtifactSchema = z.object({
  id: z.string().uuid(),
  workItemId: z.string().uuid(),
  kind: z.string().min(1),
  hash: z.string().min(32),
  uri: z.string().min(1),
  producer: z.string().min(1),
  createdAt: z.string().datetime(),
});

export const EvidenceSchema = z.object({
  id: z.string().uuid(),
  workItemId: z.string().uuid(),
  gate: z.string().min(1),
  hash: z.string().min(32),
  uri: z.string().min(1),
  createdBy: z.string().min(1),
  createdAt: z.string().datetime(),
});

export const TaskOutputSchema = z
  .object({
    status: z.enum(['ok', 'rejected', 'needs_review', 'failed']),
    artifacts: z.array(z.string().min(1)).default([]),
    evidence: z.array(z.string().min(1)).default([]),
    confidence: z.number().min(0).max(1),
    cost: z.object({
      tokens: z.number().int().nonnegative(),
      usd: z.number().nonnegative(),
    }),
    reason: z.string().min(1),
    nextActions: z.array(z.string()).default([]),
  })
  .refine(
    (value) =>
      value.status !== 'ok' ||
      value.artifacts.length > 0 ||
      value.evidence.length > 0,
    {
      message: 'ok output requires at least one artifact or evidence',
      path: ['evidence'],
    },
  );

export type Domain = z.infer<typeof DomainSchema>;
export type Risk = z.infer<typeof RiskSchema>;
export type WorkItemStatus = z.infer<typeof WorkItemStatusSchema>;
export type TaskStatus = z.infer<typeof TaskStatusSchema>;
export type TaskType = z.infer<typeof TaskTypeSchema>;
export type WorkItem = z.infer<typeof WorkItemSchema>;
export type Artifact = z.infer<typeof ArtifactSchema>;
export type Evidence = z.infer<typeof EvidenceSchema>;
export type TaskOutput = z.infer<typeof TaskOutputSchema>;

const WORK_ITEM_TRANSITIONS: Record<WorkItemStatus, readonly WorkItemStatus[]> = {
  intake: ['planned', 'canceled'],
  planned: ['ready', 'blocked', 'canceled'],
  ready: ['running', 'blocked', 'canceled'],
  running: ['verifying', 'failed', 'blocked', 'canceled'],
  verifying: ['awaiting_approval', 'releasing', 'failed', 'blocked'],
  awaiting_approval: ['releasing', 'blocked', 'canceled'],
  releasing: ['production_verified', 'rolled_back', 'failed'],
  production_verified: ['done', 'rolled_back'],
  done: [],
  blocked: ['planned', 'ready', 'canceled'],
  failed: ['planned', 'canceled'],
  canceled: [],
  rolled_back: ['planned', 'canceled'],
};

const TASK_TRANSITIONS: Record<TaskStatus, readonly TaskStatus[]> = {
  pending: ['ready', 'canceled'],
  ready: ['running', 'blocked', 'canceled'],
  running: ['verifying', 'failed', 'blocked', 'canceled'],
  verifying: ['done', 'failed', 'blocked'],
  done: [],
  blocked: ['ready', 'canceled'],
  failed: ['pending', 'canceled'],
  canceled: [],
};

export function assertWorkItemTransition(
  from: WorkItemStatus,
  to: WorkItemStatus,
): void {
  if (!WORK_ITEM_TRANSITIONS[from].includes(to)) {
    throw new Error(`Invalid work item transition: ${from} -> ${to}`);
  }
}

export function assertTaskTransition(from: TaskStatus, to: TaskStatus): void {
  if (!TASK_TRANSITIONS[from].includes(to)) {
    throw new Error(`Invalid task transition: ${from} -> ${to}`);
  }
}
