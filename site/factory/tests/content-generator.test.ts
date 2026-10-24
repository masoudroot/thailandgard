import { readFile } from 'node:fs/promises';
import path from 'node:path';
import Ajv from 'ajv';
import { describe, expect, it } from 'vitest';
import { ContentBriefSchema } from '@/lib/factory/content/contracts';
import { DeterministicContentGenerator } from '@/lib/factory/content/generator';
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

describe('DeterministicContentGenerator', () => {
  it('produces a draft with one H1, sourced claims, and enough words', () => {
    const draft = new DeterministicContentGenerator().generate(brief);
    expect(draft.title).toBe(brief.title);
    expect(draft.slug).toBe(brief.slug);
    expect(draft.bodyMarkdown.match(/^# /gm)).toHaveLength(1);
    expect(draft.wordCount).toBeGreaterThanOrEqual(250);
    expect(draft.faq.length).toBeGreaterThanOrEqual(2);
    expect(draft.internalLinks.length).toBeGreaterThanOrEqual(2);
    expect(draft.claims).toEqual(brief.sourceFacts);
  });

  it('is deterministic', () => {
    const generator = new DeterministicContentGenerator();
    expect(generator.generate(brief)).toEqual(generator.generate(brief));
  });

  it('matches the generated JSON Schema', async () => {
    const schemaPath = path.resolve(
      process.cwd(),
      'factory/contracts/content-draft.schema.json',
    );
    const schema = JSON.parse(await readFile(schemaPath, 'utf8'));
    const validate = new Ajv({
      strict: false,
      validateFormats: false,
    }).compile(schema);
    const draft = new DeterministicContentGenerator().generate(brief);
    expect(validate(draft)).toBe(true);
  });
});
