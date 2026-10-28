/**
 * Q3-02: copy checklist for customer-facing Persian text.
 *
 * The rules come from `agents/branding/UX-WRITING.md` (the brand's binding
 * wording decision), not from an improvised list:
 *
 *  - §ممنوعه‌ها: «بهترین»، «اولین»، «از صفر تا صد»، «باکیفیت‌ترین»،
 *    «بزرگ‌ترین»، «رتبهٔ یک»، «معتبرترین» are unsupported claims.
 *  - §ممنوعه‌ها: «می‌باشد»، «گردید»، «کلیه»، «جهت»، «حاصل فرمایید» are
 *    office fossils.
 *  - §ممنوعه‌ها: em dash (U+2014) and en dash (U+2013) are banned outright.
 *  - §واژه‌های استاندارد: «ماه‌عسل» must carry the ZWNJ.
 *  - PLAN Q3-02: intro sentences stay at or under 25 words.
 *
 * The module is pure so the checklist can be tested without the network.
 */

export interface CopyIssue {
  rule: string;
  found: string;
  context: string;
  /**
   * `blocking` rules are mechanically decidable (ZWNJ, dashes, fossils, length)
   * and gate the run. `advisory` rules need human judgement — a regex cannot
   * tell an unsupported claim from editorial copy like «بهترین زمان سفر».
   */
  severity: "blocking" | "advisory";
}

export type CopyRule =
  | "unsupported_claim"
  | "office_fossil"
  | "long_dash"
  | "split_verb"
  | "zwnj_mah_asal"
  | "sentence_length";

/** Claims that need a citation the site cannot produce. */
const UNSUPPORTED_CLAIMS = [
  "بهترین",
  "اولین",
  "از صفر تا صد",
  "باکیفیت‌ترین",
  "بزرگ‌ترین",
  "رتبهٔ یک",
  "معتبرترین",
];

/** Administrative fossils that read as a form letter. */
const OFFICE_FOSSILS = ["می باشد", "گردید", "کلیه", "جهت", "حاصل فرمایید"];

/**
 * Persian writes "می‌شود" as one word joined by ZWNJ. A plain space there is the
 * classic ZWNJ mistake, so the raw text is checked for it separately.
 *
 * No trailing `\b`: JavaScript's word boundary is ASCII-based, so it never
 * matches after a Persian letter and silently disables the whole rule.
 */
const SPLIT_VERB =
  /(?:^|[\s(«"'])(می)\s+(شود|شوند|کند|کنند|کنیم|کنید|باشد|باشند|دهد|دهیم|گیرد|گیریم|گردد|خورد|آید|آورد|تواند|توانیم)(?![\u0621-\u063A\u0641-\u064A])/g;

const MAX_SENTENCE_WORDS = 25;

/** ZWNJ → space, so «می‌باشد» and «می باشد» are both caught as fossils. */
function flatten(text: string): string {
  return text.replace(/\u200c/g, " ");
}

function snippet(text: string, at: number, length: number): string {
  const start = Math.max(0, at - 24);
  const end = Math.min(text.length, at + length + 24);
  return `${start > 0 ? "…" : ""}${text.slice(start, end).replace(/\s+/g, " ").trim()}${
    end < text.length ? "…" : ""
  }`;
}

function findAll(text: string, needle: string): number[] {
  const hits: number[] = [];
  let at = 0;
  for (;;) {
    const index = text.indexOf(needle, at);
    if (index === -1) return hits;
    hits.push(index);
    at = index + needle.length;
  }
}

/** Persian word characters, used to reject matches inside a longer word. */
const FA_LETTER = /[\u0621-\u063A\u0641-\u064A\u0671-\u06D3\u200c]/;

/**
 * Finds `needle` only when it stands alone. Without this «گردید» matched
 * «نگردید» and «برگردید», which are different words and perfectly fine.
 * Combining marks (the ٔ in «کلیهٔ») are deliberately not letters here: the
 * word still ends at «کلیه».
 */
function findAllWholeWord(text: string, needle: string): number[] {
  return findAll(text, needle).filter((at) => {
    const before = text[at - 1];
    const after = text[at + needle.length];
    return !(before && FA_LETTER.test(before)) && !(after && FA_LETTER.test(after));
  });
}

function sentenceWordCounts(paragraph: string): { sentence: string; words: number }[] {
  return paragraph
    .split(/[.!؟?]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .map((sentence) => ({ sentence, words: sentence.split(/\s+/).filter(Boolean).length }));
}

export interface CopyCheckOptions {
  /** Longest allowed sentence in the intro paragraph; PLAN Q3-02 says 25. */
  maxSentenceWords?: number;
  /** Off for whole-page text, on for the intro paragraph only. */
  checkSentenceLength?: boolean;
}

/** Runs every checklist rule against one page's visible text. */
export function checkCopy(
  text: string,
  options: CopyCheckOptions = {},
): CopyIssue[] {
  const issues: CopyIssue[] = [];
  const flat = flatten(text);

  for (const claim of UNSUPPORTED_CLAIMS) {
    for (const at of findAllWholeWord(flat, claim)) {
      issues.push({
        rule: "unsupported_claim",
        found: claim,
        context: snippet(flat, at, claim.length),
        severity: "advisory",
      });
    }
  }

  for (const fossil of OFFICE_FOSSILS) {
    for (const at of findAllWholeWord(flat, fossil)) {
      issues.push({
        rule: "office_fossil",
        found: fossil,
        context: snippet(flat, at, fossil.length),
        severity: "blocking",
      });
    }
  }

  for (const dash of ["\u2014", "\u2013"]) {
    for (const at of findAll(text, dash)) {
      issues.push({
        rule: "long_dash",
        found: dash === "\u2014" ? "em dash (U+2014)" : "en dash (U+2013)",
        context: snippet(text, at, 1),
        severity: "blocking",
      });
    }
  }

  for (const match of text.matchAll(SPLIT_VERB)) {
    const at = match.index ?? 0;
    issues.push({
      rule: "split_verb",
      found: `${match[1]} ${match[2]}`,
      context: snippet(text, at, match[0].length),
      severity: "blocking",
    });
  }

  // Checked on the raw text: flattening ZWNJ would turn the correct «ماه‌عسل»
  // into «ماه عسل» and flag every right spelling.
  for (const at of findAllWholeWord(text, "ماه عسل")) {
    issues.push({
      rule: "zwnj_mah_asal",
      found: "ماه عسل",
      context: snippet(flat, at, "ماه عسل".length),
      severity: "blocking",
    });
  }

  const limit = options.maxSentenceWords ?? MAX_SENTENCE_WORDS;
  if (options.checkSentenceLength !== false) {
    for (const { sentence, words } of sentenceWordCounts(text)) {
      if (words > limit) {
        issues.push({
          rule: "sentence_length",
          found: `${words} words (max ${limit})`,
          context: sentence.slice(0, 100),
          severity: "blocking",
        });
      }
    }
  }

  return issues;
}

/** Strips script/style/tags and decodes the entities Next.js emits in text. */
export function visibleText(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&zwnj;/g, "\u200c")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&hellip;/g, "…")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Picks the intro paragraph: the first reasonably long `<p>` on the page. Short
 * paragraphs are usually nav labels or legal one-liners, not the intro the
 * sentence-length rule targets.
 */
export function introParagraph(html: string, minLength = 80): string {
  for (const match of html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)) {
    const text = visibleText(match[1]);
    if (text.length >= minLength) return text;
  }
  return "";
}
