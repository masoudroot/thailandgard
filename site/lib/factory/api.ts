import { z } from 'zod';
import { BudgetSchema, DomainSchema, RiskSchema } from './contracts';

export const CreateWorkItemRequestSchema = z.object({
  domain: DomainSchema,
  ownerRole: DomainSchema,
  title: z.string().min(3).max(200),
  risk: RiskSchema,
  kpiTarget: z.string().min(1),
  outcomeWindow: z.string().min(1),
  budget: BudgetSchema,
  actor: z.string().min(1).max(120),
});

export type CreateWorkItemRequest = z.infer<
  typeof CreateWorkItemRequestSchema
>;
