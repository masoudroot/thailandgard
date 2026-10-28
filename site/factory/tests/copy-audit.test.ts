import { describe, expect, it } from 'vitest';
import {
  checkCopy,
  introParagraph,
  visibleText,
} from '@/lib/factory/copy-audit';
import { summarizeCopy, type PageCopyReport } from '@/factory/scripts/copy-audit';

const ZWNJ = '\u200c';

function rules(text: string, options?: Parameters<typeof checkCopy>[1]) {
  return checkCopy(text, options).map((issue) => issue.rule);
}

/**
 * Q3-02 regression test for the copy checklist.
 *
 * Two classes of mistake are locked here, because both happened while building
 * it: a substring match flagging «نگردید» as the office fossil «گردید», and a
 * blanket «بهترین» rule flagging the editorial phrase «بهترین زمان سفر».
 */

describe('copy checklist: office fossils', () => {
  it('flags a standalone fossil, in both ZWNJ and space spellings', () => {
    expect(rules('برای رزرو، کلیهٔ اطلاعات را کامل کنید.')).toContain('office_fossil');
    expect(rules(`اطلاعات ${ZWNJ}می${ZWNJ}باشد کافی.`)).toContain('office_fossil');
  });

  it('does not flag a fossil hidden inside a longer word', () => {
    const issues = checkCopy('لطفاً برنگردید و دوباره نگردید.');
    expect(issues.filter((issue) => issue.rule === 'office_fossil')).toEqual([]);
  });
});

describe('copy checklist: claims need a human, not a regex', () => {
  it('reports unsupported claims as advisory only', () => {
    const issues = checkCopy('ما بهترین و معتبرترین آژانس هستیم.');
    const claims = issues.filter((issue) => issue.rule === 'unsupported_claim');
    expect(claims.length).toBeGreaterThan(0);
    expect(claims.every((issue) => issue.severity === 'advisory')).toBe(true);
  });

  it('never makes the run fail on advisory findings alone', () => {
    const report: PageCopyReport = {
      url: 'https://www.thailandgard.ir/tours',
      issues: checkCopy('بهترین زمان سفر به تایلند، آذر تا بهمن است.'),
    };
    const summary = summarizeCopy([report]);
    expect(summary.advisory).toBeGreaterThan(0);
    expect(summary.blocking).toBe(0);
  });
});

describe('copy checklist: ZWNJ', () => {
  it('flags a split verb written with a plain space', () => {
    expect(rules('این تور در بهار برگزار می شود.')).toContain('split_verb');
  });

  it('accepts the joined spelling', () => {
    expect(rules(`این تور در بهار برگزار ${ZWNJ}می${ZWNJ}شود.`)).not.toContain('split_verb');
  });

  it('wants ماه‌عسل joined and flags the split form', () => {
    expect(rules(`سفر مناسب ${ZWNJ}ماه${ZWNJ}عسل است.`)).not.toContain('zwnj_mah_asal');
    expect(rules('سفر مناسب ماه عسل است.')).toContain('zwnj_mah_asal');
  });
});

describe('copy checklist: banned dashes', () => {
  it('flags em and en dashes', () => {
    expect(rules('تور پوکت \u2014 هفت روز')).toContain('long_dash');
    expect(rules('تور پوکت \u2013 هفت روز')).toContain('long_dash');
  });

  it('accepts ordinary Persian punctuation', () => {
    expect(rules('تور پوکت؛ هفت روز.')).not.toContain('long_dash');
  });
});

describe('copy checklist: intro sentence length', () => {
  const words = (count: number) => Array.from({ length: count }, (_, i) => `واژه${i + 1}`).join(' ');

  it('flags a sentence above the 25-word limit', () => {
    expect(rules(`${words(26)}.`)).toContain('sentence_length');
  });

  it('accepts a sentence exactly at the limit', () => {
    expect(rules(`${words(25)}.`)).not.toContain('sentence_length');
  });

  it('skips the rule when the caller only wants page-wide checks', () => {
    expect(rules(`${words(40)}.`, { checkSentenceLength: false })).not.toContain(
      'sentence_length',
    );
  });
});

describe('copy checklist: html to text', () => {
  it('drops scripts, styles and tags but keeps the words', () => {
    const html = `<html><head><style>.a{color:red}</style>
      <script>var x = "بهترین";</script></head>
      <body><h1>تور پوکت</h1><p>هفت شب در پوکت.</p></body></html>`;
    const text = visibleText(html);
    expect(text).toBe('تور پوکت هفت شب در پوکت.');
    expect(text).not.toContain('بهترین');
  });

  it('decodes the entities that matter for Persian copy', () => {
    const text = visibleText(`<p>ماه&zwnj;عسل &amp; سفر</p>`);
    expect(text).toBe(`ماه${ZWNJ}عسل & سفر`);
  });

  it('picks the first long paragraph as the intro', () => {
    const html = `<p>کوتاه</p><p>${'این پاراگراف معرفی است و به اندازهٔ کافی بلند است تا به‌عنوان متن معرفی انتخاب شود.'}</p>`;
    expect(introParagraph(html)).toContain('این پاراگراف معرفی است');
  });

  it('returns an empty intro when no paragraph is long enough', () => {
    expect(introParagraph('<p>کوتاه</p>')).toBe('');
  });
});
