import { describe, expect, it } from 'vitest';
import { ContentBriefSchema } from '@/lib/factory/content/contracts';
import { DeterministicContentGenerator } from '@/lib/factory/content/generator';
import {
  buildReleaseManifest,
  releaseKey,
  renderPreviewHtml,
} from '@/lib/factory/release';
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

describe('release manifest', () => {
  it('builds a dry-run manifest scoped to the work item', () => {
    const manifest = buildReleaseManifest({
      workItemId: brief.workItemId,
      risk: 'R0',
      draft,
      policyVersion: 'policy@1',
      gates: [
        { gate: 'content', passed: true, evidenceHash: 'a'.repeat(64) },
        { gate: 'seo', passed: true, evidenceHash: 'b'.repeat(64) },
      ],
      createdAt: '2026-10-21T00:00:00.000Z',
    });
    expect(manifest.mode).toBe('dry_run');
    expect(manifest.workItemId).toBe(brief.workItemId);
    expect(manifest.gates).toHaveLength(2);
  });

  it('creates release keys outside the work-items prefix', () => {
    expect(releaseKey(brief.workItemId, 'preview.html')).toBe(
      `releases/${brief.workItemId}/preview.html`,
    );
  });

  it('escapes HTML in the preview', () => {
    const html = renderPreviewHtml(
      {
        mode: 'dry_run',
        workItemId: brief.workItemId,
        title: '<script>alert(1)</script>',
        slug: draft.slug,
        risk: 'R0',
        policyVersion: 'policy@1',
        contentHash: 'c'.repeat(64),
        gates: [],
        createdAt: '2026-10-21T00:00:00.000Z',
      },
      draft,
    );
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
