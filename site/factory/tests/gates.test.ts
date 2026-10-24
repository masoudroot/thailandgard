import { describe, expect, it } from 'vitest';
import { ContentBriefSchema } from '@/lib/factory/content/contracts';
import { DeterministicContentGenerator } from '@/lib/factory/content/generator';
import { runContentGate } from '@/lib/factory/gates/content';
import { runSeoGate } from '@/lib/factory/gates/seo';
import { newId } from '@/lib/factory/ids';

const brief = ContentBriefSchema.parse({
  workItemId: newId(),
  title: 'راهنمای کامل سفر به پوکت در آبان ۱۴۰۵',
  slug: 'phuket-october-guide',
  targetKeyword: 'سفر به پوکت',
  audience: 'مسافران فارسی‌زبان',
  intent: 'informational',
  sourceFacts: [
    {
      claim: 'آبان یکی از ماه‌های محبوب سفر به جنوب تایلند است.',
      source: 'https://thailandgard.ir/',
    },
  ],
  cta: 'برای مشاهدهٔ تورهای فعال، صفحهٔ تورهای تایلند را ببینید.',
});

const draft = new DeterministicContentGenerator().generate(brief);

describe('content gate', () => {
  it('passes a generated draft', () => {
    const result = runContentGate(draft);
    expect(result.passed).toBe(true);
    expect(result.gate).toBe('content');
  });

  it('fails a short title', () => {
    const result = runContentGate({ ...draft, title: 'کوتاه' });
    expect(result.passed).toBe(false);
    expect(
      result.checks.find((check) => check.id === 'title_length')?.passed,
    ).toBe(false);
  });

  it('fails placeholder text', () => {
    const result = runContentGate({
      ...draft,
      bodyMarkdown: `${draft.bodyMarkdown}\nTODO`,
    });
    expect(result.passed).toBe(false);
  });
});

describe('seo gate', () => {
  it('passes a generated draft', () => {
    const result = runSeoGate(draft);
    expect(result.passed).toBe(true);
    expect(result.gate).toBe('seo');
  });

  it('fails when the keyword is missing from the title', () => {
    const result = runSeoGate({ ...draft, title: 'راهنمای کامل سفر در آبان' });
    expect(result.passed).toBe(false);
  });
});
