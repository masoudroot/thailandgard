import type { ContentDraft } from '../content/contracts';
import type { GateCheck, GateResult } from './types';

const PLACEHOLDERS = ['TODO', 'TBD', 'lorem ipsum', 'XXX', '[ ]'];

function check(id: string, passed: boolean, detail: string): GateCheck {
  return { id, passed, detail };
}

export function runContentGate(draft: ContentDraft): GateResult {
  const headings = draft.bodyMarkdown.match(/^# .+$/gm) ?? [];
  const checks = [
    check(
      'title_length',
      draft.title.length >= 30 && draft.title.length <= 70,
      `${draft.title.length} characters`,
    ),
    check(
      'meta_length',
      draft.metaDescription.length >= 70 &&
        draft.metaDescription.length <= 160,
      `${draft.metaDescription.length} characters`,
    ),
    check('word_count', draft.wordCount >= 250, `${draft.wordCount} words`),
    check(
      'single_h1',
      headings.length === 1,
      `${headings.length} H1 headings`,
    ),
    check(
      'no_placeholders',
      !PLACEHOLDERS.some((value) =>
        draft.bodyMarkdown.toLowerCase().includes(value.toLowerCase()),
      ),
      'no placeholder markers',
    ),
    check(
      'slug_format',
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(draft.slug),
      draft.slug,
    ),
    check(
      'claims_sourced',
      draft.claims.length > 0 &&
        draft.claims.every((claim) => claim.source.startsWith('https://')),
      `${draft.claims.length} sourced claims`,
    ),
    check(
      'cta_present',
      draft.cta.length >= 5 && draft.bodyMarkdown.includes(draft.cta),
      'CTA appears in the body',
    ),
  ];

  return {
    gate: 'content',
    passed: checks.every((item) => item.passed),
    checks,
  };
}
