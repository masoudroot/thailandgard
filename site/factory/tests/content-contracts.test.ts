import { describe, expect, it } from 'vitest';
import {
  ContentBriefSchema,
  ContentDraftSchema,
} from '@/lib/factory/content/contracts';
import { newId } from '@/lib/factory/ids';

const brief = {
  workItemId: newId(),
  title: 'راهنمای کامل سفر به پوکت در آبان ۱۴۰۵',
  slug: 'phuket-october-guide',
  targetKeyword: 'سفر به پوکت',
  audience: 'مسافران فارسی‌زبان',
  intent: 'informational' as const,
  sourceFacts: [
    {
      claim: 'آبان یکی از ماه‌های محبوب سفر به جنوب تایلند است.',
      source: 'https://thailandgard.ir/',
    },
  ],
  cta: 'برای مشاهدهٔ تورهای فعال، صفحهٔ تورهای تایلند را ببینید.',
};

describe('content contracts', () => {
  it('accepts a valid brief', () => {
    expect(ContentBriefSchema.parse(brief).slug).toBe('phuket-october-guide');
  });

  it('rejects a brief without source facts', () => {
    expect(() =>
      ContentBriefSchema.parse({ ...brief, sourceFacts: [] }),
    ).toThrow();
  });

  it('rejects a draft without a body', () => {
    expect(() =>
      ContentDraftSchema.parse({
        brief,
        title: brief.title,
        slug: brief.slug,
        metaDescription: 'x'.repeat(80),
        bodyMarkdown: '',
        faq: [],
        internalLinks: [],
        cta: brief.cta,
        claims: brief.sourceFacts,
        wordCount: 0,
      }),
    ).toThrow();
  });
});
