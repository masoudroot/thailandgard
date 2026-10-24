import type { ContentDraft } from '../content/contracts';
import type { GateCheck, GateResult } from './types';

function check(id: string, passed: boolean, detail: string): GateCheck {
  return { id, passed, detail };
}

export function runSeoGate(draft: ContentDraft): GateResult {
  const h2 = draft.bodyMarkdown.match(/^## .+$/gm) ?? [];
  const firstParagraph =
    draft.bodyMarkdown
      .split('\n')
      .find((line) => line.trim() && !line.startsWith('#')) ?? '';
  const keywords = [draft.brief.targetKeyword];

  const checks = [
    check(
      'keyword_in_title',
      keywords.every((keyword) => draft.title.includes(keyword)),
      draft.title,
    ),
    check(
      'keyword_in_meta',
      keywords.every((keyword) => draft.metaDescription.includes(keyword)),
      draft.metaDescription,
    ),
    check(
      'keyword_in_first_paragraph',
      keywords.every((keyword) => firstParagraph.includes(keyword)),
      firstParagraph.slice(0, 120),
    ),
    check('h2_count', h2.length >= 3, `${h2.length} H2 headings`),
    check(
      'internal_links',
      draft.internalLinks.length >= 2,
      `${draft.internalLinks.length} links`,
    ),
    check('faq_count', draft.faq.length >= 2, `${draft.faq.length} questions`),
  ];

  return {
    gate: 'seo',
    passed: checks.every((item) => item.passed),
    checks,
  };
}
