import { z } from 'zod';

export const ContentBriefSchema = z.object({
  workItemId: z.string().uuid(),
  title: z.string().min(10).max(200),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  targetKeyword: z.string().min(2).max(80),
  audience: z.string().min(3).max(200),
  intent: z.enum([
    'informational',
    'commercial',
    'transactional',
    'navigational',
  ]),
  sourceFacts: z
    .array(
      z.object({
        claim: z.string().min(5),
        source: z.string().url(),
      }),
    )
    .min(1),
  cta: z.string().min(5).max(160),
});

export const ContentDraftSchema = z.object({
  brief: ContentBriefSchema,
  title: z.string().min(10).max(120),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  metaDescription: z.string().min(70).max(160),
  bodyMarkdown: z.string().min(500),
  faq: z
    .array(
      z.object({
        question: z.string().min(5),
        answer: z.string().min(10),
      }),
    )
    .min(2),
  internalLinks: z
    .array(
      z.object({
        label: z.string().min(2),
        href: z.string().startsWith('/'),
      }),
    )
    .min(2),
  cta: z.string().min(5),
  claims: z
    .array(
      z.object({
        claim: z.string().min(5),
        source: z.string().url(),
      }),
    )
    .min(1),
  wordCount: z.number().int().positive(),
});

export type ContentBrief = z.infer<typeof ContentBriefSchema>;
export type ContentDraft = z.infer<typeof ContentDraftSchema>;
