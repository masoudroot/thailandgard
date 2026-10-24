import { z } from 'zod';

export const ProspectStatusSchema = z.enum([
  'new',
  'qualified',
  'contacted',
  'replied',
  'won',
  'lost',
  'suppressed',
]);

export const ProspectSchema = z.object({
  id: z.string().uuid(),
  domain: z.string().min(3),
  url: z.string().url(),
  contactEmail: z.string().email().nullable(),
  relevance: z.number().int().min(0).max(100),
  status: ProspectStatusSchema,
  lastContactedAt: z.string().datetime().nullable(),
  notes: z.string().nullable(),
});

export type Prospect = z.infer<typeof ProspectSchema>;

export const OutreachPolicySchema = z.object({
  minRelevance: z.number().int().min(0).max(100).default(50),
  maxPerDay: z.number().int().positive().default(20),
  minDaysBetweenSteps: z.number().int().positive().default(4),
  maxSteps: z.number().int().min(1).max(5).default(3),
  requireEmail: z.boolean().default(true),
});

export type OutreachPolicy = z.infer<typeof OutreachPolicySchema>;

export const OutreachStepSchema = z.object({
  step: z.number().int().positive(),
  subject: z.string().min(1),
  body: z.string().min(1),
  scheduledAt: z.string().datetime(),
});

export type OutreachStep = z.infer<typeof OutreachStepSchema>;

export const OutreachMessageSchema = z.object({
  prospectId: z.string().uuid(),
  step: z.number().int().positive(),
  subject: z.string().min(1),
  body: z.string().min(1),
  scheduledAt: z.string().datetime(),
  status: z.enum(['queued', 'dry_run', 'sent', 'failed', 'replied', 'canceled']),
  providerId: z.string().nullable(),
  sentAt: z.string().datetime().nullable(),
});

export type OutreachMessage = z.infer<typeof OutreachMessageSchema>;

export interface OutreachContext {
  now: Date;
  policy: OutreachPolicy;
  suppressions: Set<string>;
  sentLast24h: number;
  history: Map<
    string,
    { lastContactedAt: string | null; sentLast24h: number }
  >;
}

export interface OutreachPlan {
  planned: Array<{
    prospectId: string;
    domain: string;
    steps: OutreachStep[];
  }>;
  skipped: Array<{ domain: string; reason: string }>;
}
