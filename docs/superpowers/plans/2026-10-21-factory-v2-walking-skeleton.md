# Factory v2 Walking Skeleton Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local/dry-run Content R0 pipeline from a WorkItem through draft generation, signed content/SEO gates, policy evaluation, release manifest, and outcome record, orchestrated by Temporal.

**Architecture:** A deterministic Content R0 generator produces a draft from an explicit brief. A pure gate engine evaluates content and SEO checks and signs evidence with HMAC. A policy engine auto-releases R0 only when every required gate passes. The release worker writes a dry-run manifest and preview to the artifact store, never production. Temporal orchestrates the whole path and the projector exposes the final WorkItem state. Outcome v0 records a pending baseline row.

**Tech Stack:** TypeScript, Zod, Temporal, Postgres, S3-compatible artifact storage, Vitest, Next.js API routes.

**Spec:** `docs/factory-v2/ROADMAP.md`, `docs/factory-v2/ARCHITECTURE.md`, `docs/superpowers/plans/2026-10-20-factory-v2-foundation.md`

## Global Constraints

- Do not deploy to production, merge to `main`, or set `FACTORY_RUNTIME=new`.
- Release mode is `dry_run`; no production content or deployment is written.
- Content R0 only. No LLM call is required; the generator must be deterministic and testable.
- Every gate result must produce signed evidence stored in artifact storage and indexed in Postgres.
- A work item may reach `done` only through `running -> verifying -> releasing -> production_verified -> done`.
- R0 auto-release requires both `content` and `seo` gates to pass. R1+ requires approval.
- Artifact keys stay scoped to the WorkItem; release keys stay under `releases/<workItemId>/`.
- Never commit secrets. `FACTORY_EVIDENCE_SECRET` is read from the environment only.
- Use `npm ci --legacy-peer-deps` in this repository.
- Run `npm run lint:factory`, `npm run typecheck`, `npm test`, and `npm run build` before claiming completion.
- Do not commit unless the user explicitly asks.

## Phase Map (Remaining Work)

| Phase | Scope | Execution boundary |
|---|---|---|
| A (this plan) | P2 Walking Skeleton: Content R0, gates, policy, dry-run release, outcome | Local/staging only |
| B | P3 SEO Radar + Tour Fact Contract + R1 gates | Local/staging only |
| C | P4 Design system + Dev workflow + R2 policy | Local/staging only |
| D | P5 Budgets, scorecards, governance | Local/staging only |
| E | P6 Shadow mode, canary, cutover | Requires explicit production approval and credentials |
| F | P7 Decommission old runtime | Requires explicit production approval |

Phase 0 external prerequisites remain: production DB backup, production SHA/URL, top-50 organic pages, staging Postgres, Temporal Cloud namespace, staging S3 bucket, secret manager, and confirmation that the old cycle worker is inactive.

---

### Task 1: Content contracts and JSON Schemas

**Files:**
- Create: `site/lib/factory/content/contracts.ts`
- Create: `site/factory/scripts/export-content-schemas.ts`
- Create: `site/factory/tests/content-contracts.test.ts`
- Modify: `site/package.json`

**Interfaces:**
- Produces: `ContentBriefSchema`, `ContentDraftSchema`, `ContentBrief`, `ContentDraft`.

- [ ] **Step 1: Write the failing contract test**

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- factory/tests/content-contracts.test.ts`
Expected: FAIL because `@/lib/factory/content/contracts` does not exist.

- [ ] **Step 3: Implement the contracts**

```ts
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
```

- [ ] **Step 4: Add the JSON Schema exporter**

```ts
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import {
  ContentBriefSchema,
  ContentDraftSchema,
} from '../../lib/factory/content/contracts';

async function main(): Promise<void> {
  const dir = path.resolve(process.cwd(), 'factory/contracts');
  await mkdir(dir, { recursive: true });

  const schemas = [
    ['content-brief', ContentBriefSchema],
    ['content-draft', ContentDraftSchema],
  ] as const;

  for (const [name, schema] of schemas) {
    const json = z.toJSONSchema(schema, { target: 'draft-7' });
    await writeFile(
      path.join(dir, `${name}.schema.json`),
      `${JSON.stringify(json, null, 2)}\n`,
      'utf8',
    );
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
```

Add to `site/package.json` scripts:

```json
"factory:schemas": "tsx factory/scripts/export-content-schemas.ts"
```

- [ ] **Step 5: Generate and verify**

Run: `npm run factory:schemas`
Expected: `factory/contracts/content-brief.schema.json` and `content-draft.schema.json` exist.

Run: `npm test -- factory/tests/content-contracts.test.ts`
Expected: PASS.

---

### Task 2: Deterministic Content R0 generator

**Files:**
- Create: `site/lib/factory/content/generator.ts`
- Create: `site/factory/tests/content-generator.test.ts`

**Interfaces:**
- Consumes: `ContentBrief`, `ContentDraftSchema`.
- Produces: `ContentGenerator` and `DeterministicContentGenerator`.
  - `generate(brief: ContentBrief): ContentDraft`

- [ ] **Step 1: Write the failing generator test**

```ts
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
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- factory/tests/content-generator.test.ts`
Expected: FAIL because `generator.ts` does not exist.

- [ ] **Step 3: Implement the generator**

```ts
import {
  ContentDraftSchema,
  type ContentBrief,
  type ContentDraft,
} from './contracts';

export interface ContentGenerator {
  generate(brief: ContentBrief): ContentDraft;
}

const DEFAULT_LINKS = [
  { label: 'راهنمای مقاصد تایلند', href: '/destinations' },
  { label: 'تورهای فعال تایلند', href: '/tours' },
];

function countWords(markdown: string): number {
  return markdown
    .replace(/[#>*_`-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;
}

function buildBody(brief: ContentBrief): string {
  const facts = brief.sourceFacts
    .map((fact) => `- ${fact.claim} (منبع: ${fact.source})`)
    .join('\n');

  return `# ${brief.title}

${brief.targetKeyword} یکی از موضوعاتی است که ${brief.audience} پیش از تصمیم‌گیری باید دربارهٔ آن اطلاعات دقیق داشته باشد. این راهنما با تمرکز بر ${brief.targetKeyword} تلاش می‌کند تصویری روشن، کاربردی و بدون اغراق ارائه دهد.

## چرا ${brief.targetKeyword} مهم است

انتخاب زمان مناسب، شناخت هزینه‌ها و توجه به جزئیات محلی می‌تواند تجربهٔ سفر را به‌طور محسوسی بهتر کند. ${brief.audience} معمولاً به دنبال پاسخ روشن برای سه پرسش است: چه زمانی برود، چه چیزی را از قبل آماده کند و از چه اشتباهاتی پرهیز کند. این بخش تلاش می‌کند به همین پرسش‌ها پاسخ دهد.

## نکات کلیدی

${facts}

بررسی منابع رسمی و به‌روز نگه‌داشتن اطلاعات، بخشی جدایی‌ناپذیر از یک برنامهٔ خوب است. بهتر است پیش از رزرو نهایی، شرایط لغو، پوشش بیمه و محدودیت‌های فصلی را دوباره کنترل کنید.

## برنامهٔ پیشنهادی

یک برنامهٔ متعادل باید زمان استراحت، بازدید از جاذبه‌ها و فرصت تجربهٔ غذاهای محلی را کنار هم ببیند. شروع روز با فعالیت‌های اصلی و نگه‌داشتن عصر برای گشت‌وگذار سبک‌تر، خستگی را کم می‌کند. اگر همراه کودک یا سالمند سفر می‌کنید، فاصله‌های انتقال را کوتاه‌تر و زمان استراحت را بیشتر در نظر بگیرید.

## اشتباهات رایج

عجله در رزرو، اعتماد به اطلاعات قدیمی و نادیده گرفتن تفاوت‌های فصلی سه اشتباه پرتکرارند. همچنین بهتر است فقط به منابعی تکیه کنید که تاریخ به‌روزرسانی مشخص دارند. مقایسهٔ چند منبع مستقل، احتمال تصمیم نادرست را کاهش می‌دهد.

## پرسش‌های متداول

### بهترین زمان برای ${brief.targetKeyword} چه موقع است؟
بهترین زمان به سلیقه، بودجه و تحمل آب‌وهوا بستگی دارد. پیش از انتخاب، پیش‌بینی هوا و تقویم رویدادهای محلی را بررسی کنید.

### برای ${brief.targetKeyword} چه چیزی را از قبل آماده کنیم؟
مدارک، بیمه، بودجهٔ اضطراری و برنامهٔ ارتباطی را از قبل مشخص کنید. فهرست کوچکی از شماره‌های ضروری و آدرس اقامتگاه هم مفید است.

### آیا ${brief.targetKeyword} برای سفر خانوادگی مناسب است؟
بله، اما برنامه باید با سن و نیاز اعضای خانواده هماهنگ شود. زمان‌بندی سبک‌تر و گزینه‌های انعطاف‌پذیر، تجربه را راحت‌تر می‌کند.

${brief.cta}
`;
}

export class DeterministicContentGenerator implements ContentGenerator {
  generate(brief: ContentBrief): ContentDraft {
    const bodyMarkdown = buildBody(brief);
    const faq = [
      {
        question: `بهترین زمان برای ${brief.targetKeyword} چه موقع است؟`,
        answer:
          'بهترین زمان به سلیقه، بودجه و تحمل آب‌وهوا بستگی دارد. پیش از انتخاب، پیش‌بینی هوا و تقویم رویدادهای محلی را بررسی کنید.',
      },
      {
        question: `برای ${brief.targetKeyword} چه چیزی را از قبل آماده کنیم؟`,
        answer:
          'مدارک، بیمه، بودجهٔ اضطراری و برنامهٔ ارتباطی را از قبل مشخص کنید. فهرست کوچکی از شماره‌های ضروری و آدرس اقامتگاه هم مفید است.',
      },
      {
        question: `آیا ${brief.targetKeyword} برای سفر خانوادگی مناسب است؟`,
        answer:
          'بله، اما برنامه باید با سن و نیاز اعضای خانواده هماهنگ شود. زمان‌بندی سبک‌تر و گزینه‌های انعطاف‌پذیر، تجربه را راحت‌تر می‌کند.',
      },
    ];

    return ContentDraftSchema.parse({
      brief,
      title: brief.title,
      slug: brief.slug,
      metaDescription: `راهنمای کاربردی ${brief.targetKeyword} برای ${brief.audience}؛ نکات کلیدی، برنامهٔ پیشنهادی، اشتباهات رایج و پاسخ پرسش‌های متداول.`,
      bodyMarkdown,
      faq,
      internalLinks: DEFAULT_LINKS,
      cta: brief.cta,
      claims: brief.sourceFacts,
      wordCount: countWords(bodyMarkdown),
    });
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- factory/tests/content-generator.test.ts`
Expected: PASS.

- [ ] **Step 5: Validate against the generated JSON Schema**

Add to the test:

```ts
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import Ajv from 'ajv';

it('matches the generated JSON Schema', async () => {
  const schemaPath = path.resolve(
    process.cwd(),
    'factory/contracts/content-draft.schema.json',
  );
  const schema = JSON.parse(await readFile(schemaPath, 'utf8'));
  const validate = new Ajv({ strict: false }).compile(schema);
  const draft = new DeterministicContentGenerator().generate(brief);
  expect(validate(draft)).toBe(true);
});
```

Run: `npm run factory:schemas; if ($?) { npm test -- factory/tests/content-generator.test.ts }`
Expected: PASS.

---

### Task 3: Gate engine and signed evidence

**Files:**
- Create: `site/lib/factory/gates/types.ts`
- Create: `site/lib/factory/gates/content.ts`
- Create: `site/lib/factory/gates/seo.ts`
- Create: `site/lib/factory/gates/run.ts`
- Create: `site/lib/factory/evidence.ts`
- Create: `site/factory/tests/gates.test.ts`
- Create: `site/factory/tests/evidence.test.ts`

**Interfaces:**
- Consumes: `ContentDraft`.
- Produces:
  - `GateCheck`, `GateResult`
  - `runContentGate(draft): GateResult`
  - `runSeoGate(draft): GateResult`
  - `runGates(draft): GateResult[]`
  - `signEvidence(payload, secret): { hash, signature }`
  - `verifyEvidence(payload, signature, secret): boolean`

- [ ] **Step 1: Write the failing gate tests**

```ts
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
    expect(result.checks.find((check) => check.id === 'title_length')?.passed).toBe(false);
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- factory/tests/gates.test.ts`
Expected: FAIL because the gate modules do not exist.

- [ ] **Step 3: Implement gate types and checks**

`types.ts`:

```ts
export interface GateCheck {
  id: string;
  passed: boolean;
  detail: string;
}

export interface GateResult {
  gate: 'content' | 'seo';
  passed: boolean;
  checks: GateCheck[];
}
```

`content.ts`:

```ts
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
    check('single_h1', headings.length === 1, `${headings.length} H1 headings`),
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
```

`seo.ts`:

```ts
import type { ContentDraft } from '../content/contracts';
import type { GateCheck, GateResult } from './types';

function check(id: string, passed: boolean, detail: string): GateCheck {
  return { id, passed, detail };
}

export function runSeoGate(draft: ContentDraft): GateResult {
  const h2 = draft.bodyMarkdown.match(/^## .+$/gm) ?? [];
  const firstParagraph = draft.bodyMarkdown
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
```

`run.ts`:

```ts
import type { ContentDraft } from '../content/contracts';
import { runContentGate } from './content';
import { runSeoGate } from './seo';
import type { GateResult } from './types';

export function runGates(draft: ContentDraft): GateResult[] {
  return [runContentGate(draft), runSeoGate(draft)];
}
```

- [ ] **Step 4: Implement signed evidence**

```ts
import { createHash, createHmac } from 'node:crypto';

function canonicalize(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalize(item)}`);
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value);
}

export function signEvidence(
  payload: Record<string, unknown>,
  secret: string,
): { hash: string; signature: string } {
  const canonical = canonicalize(payload);
  return {
    hash: createHash('sha256').update(canonical).digest('hex'),
    signature: createHmac('sha256', secret).update(canonical).digest('hex'),
  };
}

export function verifyEvidence(
  payload: Record<string, unknown>,
  signature: string,
  secret: string,
): boolean {
  const expected = signEvidence(payload, secret).signature;
  return expected.length === signature.length && expected === signature;
}
```

Add `evidence.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { signEvidence, verifyEvidence } from '@/lib/factory/evidence';

describe('evidence signatures', () => {
  it('verifies a matching signature', () => {
    const payload = { gate: 'content', passed: true };
    const signed = signEvidence(payload, 'x'.repeat(32));
    expect(verifyEvidence(payload, signed.signature, 'x'.repeat(32))).toBe(true);
  });

  it('rejects a changed payload', () => {
    const signed = signEvidence({ passed: true }, 'x'.repeat(32));
    expect(verifyEvidence({ passed: false }, signed.signature, 'x'.repeat(32))).toBe(false);
  });
});
```

- [ ] **Step 5: Run the tests**

Run: `npm test -- factory/tests/gates.test.ts factory/tests/evidence.test.ts`
Expected: PASS.

---

### Task 4: Policy Engine v1

**Files:**
- Create: `site/lib/factory/policy.ts`
- Create: `site/factory/tests/policy.test.ts`

**Interfaces:**
- Consumes: `Risk`, `GateResult[]`.
- Produces:
  - `PolicyDecision`
  - `evaluatePolicy(input: { risk: Risk; gates: GateResult[] }): PolicyDecision`

- [ ] **Step 1: Write the failing policy test**

```ts
import { describe, expect, it } from 'vitest';
import { evaluatePolicy } from '@/lib/factory/policy';
import type { GateResult } from '@/lib/factory/gates/types';

const passed: GateResult[] = [
  { gate: 'content', passed: true, checks: [] },
  { gate: 'seo', passed: true, checks: [] },
];

describe('evaluatePolicy', () => {
  it('auto-releases R0 when every gate passes', () => {
    const decision = evaluatePolicy({ risk: 'R0', gates: passed });
    expect(decision.allowed).toBe(true);
    expect(decision.autoRelease).toBe(true);
    expect(decision.requiresApproval).toBe(false);
  });

  it('requires approval for R1', () => {
    const decision = evaluatePolicy({ risk: 'R1', gates: passed });
    expect(decision.allowed).toBe(true);
    expect(decision.autoRelease).toBe(false);
    expect(decision.requiresApproval).toBe(true);
  });

  it('denies release when a gate fails', () => {
    const decision = evaluatePolicy({
      risk: 'R0',
      gates: [
        { gate: 'content', passed: false, checks: [] },
        { gate: 'seo', passed: true, checks: [] },
      ],
    });
    expect(decision.allowed).toBe(false);
    expect(decision.autoRelease).toBe(false);
  });

  it('denies release when a required gate is missing', () => {
    const decision = evaluatePolicy({
      risk: 'R0',
      gates: [{ gate: 'content', passed: true, checks: [] }],
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reasons.join(' ')).toMatch(/seo/);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- factory/tests/policy.test.ts`
Expected: FAIL because `policy.ts` does not exist.

- [ ] **Step 3: Implement the policy**

```ts
import type { Risk } from './contracts';
import type { GateResult } from './gates/types';

export interface PolicyDecision {
  allowed: boolean;
  autoRelease: boolean;
  requiresApproval: boolean;
  reasons: string[];
  policyVersion: string;
}

const REQUIRED_GATES = ['content', 'seo'] as const;
const POLICY_VERSION = 'policy@1';

export function evaluatePolicy(input: {
  risk: Risk;
  gates: GateResult[];
}): PolicyDecision {
  const reasons: string[] = [];
  const byGate = new Map(input.gates.map((gate) => [gate.gate, gate]));

  for (const gate of REQUIRED_GATES) {
    const result = byGate.get(gate);
    if (!result) {
      reasons.push(`Missing required gate: ${gate}`);
    } else if (!result.passed) {
      reasons.push(`Gate failed: ${gate}`);
    }
  }

  if (reasons.length > 0) {
    return {
      allowed: false,
      autoRelease: false,
      requiresApproval: false,
      reasons,
      policyVersion: POLICY_VERSION,
    };
  }

  if (input.risk === 'R0') {
    return {
      allowed: true,
      autoRelease: true,
      requiresApproval: false,
      reasons: ['R0 content with all required gates passed'],
      policyVersion: POLICY_VERSION,
    };
  }

  return {
    allowed: true,
    autoRelease: false,
    requiresApproval: true,
    reasons: [`${input.risk} requires human approval`],
    policyVersion: POLICY_VERSION,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- factory/tests/policy.test.ts`
Expected: PASS.

---

### Task 5: Dry-run release and Outcome v0 persistence

**Files:**
- Create: `site/lib/factory/release.ts`
- Create: `site/lib/factory/records.ts`
- Create: `site/factory/migrations/0002_outcomes.sql`
- Create: `site/factory/tests/release.test.ts`
- Create: `site/factory/tests/records.integration.test.ts`

**Interfaces:**
- Consumes: `ContentDraft`, `GateResult`.
- Produces:
  - `ReleaseManifest`
  - `buildReleaseManifest(input): ReleaseManifest`
  - `releaseKey(workItemId, name): string`
  - `renderPreviewHtml(manifest, draft): string`
  - `insertArtifact`, `insertEvidence`, `insertRelease`, `insertOutcome`

- [ ] **Step 1: Write the failing release tests**

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- factory/tests/release.test.ts`
Expected: FAIL because `release.ts` does not exist.

- [ ] **Step 3: Implement release helpers**

```ts
import { createHash } from 'node:crypto';
import type { Risk } from './contracts';
import type { ContentDraft } from './content/contracts';

export interface ReleaseGateEvidence {
  gate: string;
  passed: boolean;
  evidenceHash: string;
}

export interface ReleaseManifest {
  mode: 'dry_run';
  workItemId: string;
  title: string;
  slug: string;
  risk: Risk;
  policyVersion: string;
  contentHash: string;
  gates: ReleaseGateEvidence[];
  createdAt: string;
}

export function releaseKey(workItemId: string, name: string): string {
  const safe = name
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!safe) throw new Error('Release artifact name is empty');
  return `releases/${workItemId}/${safe}`;
}

export function buildReleaseManifest(input: {
  workItemId: string;
  risk: Risk;
  draft: ContentDraft;
  policyVersion: string;
  gates: ReleaseGateEvidence[];
  createdAt: string;
}): ReleaseManifest {
  return {
    mode: 'dry_run',
    workItemId: input.workItemId,
    title: input.draft.title,
    slug: input.draft.slug,
    risk: input.risk,
    policyVersion: input.policyVersion,
    contentHash: createHash('sha256')
      .update(input.draft.bodyMarkdown)
      .digest('hex'),
    gates: input.gates,
    createdAt: input.createdAt,
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderPreviewHtml(
  manifest: ReleaseManifest,
  draft: ContentDraft,
): string {
  return `<!doctype html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(manifest.title)}</title>
</head>
<body>
  <main>
    <p>Dry-run preview — not published</p>
    ${draft.bodyMarkdown
      .split('\n')
      .map((line) => {
        if (line.startsWith('### ')) return `<h3>${escapeHtml(line.slice(4))}</h3>`;
        if (line.startsWith('## ')) return `<h2>${escapeHtml(line.slice(3))}</h2>`;
        if (line.startsWith('# ')) return `<h1>${escapeHtml(line.slice(2))}</h1>`;
        if (line.startsWith('- ')) return `<li>${escapeHtml(line.slice(2))}</li>`;
        return line.trim() ? `<p>${escapeHtml(line)}</p>` : '';
      })
      .join('\n')}
  </main>
</body>
</html>`;
}
```

- [ ] **Step 4: Add the outcome migration**

```sql
CREATE TABLE IF NOT EXISTS outcomes (
  id uuid PRIMARY KEY,
  work_item_id uuid NOT NULL,
  metric text NOT NULL,
  window text NOT NULL,
  baseline numeric,
  value numeric,
  status text NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS outcomes_work_item_idx
  ON outcomes (work_item_id, recorded_at DESC);
```

- [ ] **Step 5: Implement record inserts**

```ts
import type { Artifact, Evidence } from './contracts';
import { getPool } from './db';

export interface ReleaseRecord {
  id: string;
  workItemId: string;
  risk: string;
  buildSha: string;
  status: string;
}

export interface OutcomeRecord {
  id: string;
  workItemId: string;
  metric: string;
  window: string;
  baseline: number;
  value: number;
  status: string;
}

export async function insertArtifact(artifact: Artifact): Promise<void> {
  await getPool().query(
    `INSERT INTO artifacts (id, work_item_id, kind, hash, uri, producer, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      artifact.id,
      artifact.workItemId,
      artifact.kind,
      artifact.hash,
      artifact.uri,
      artifact.producer,
      artifact.createdAt,
    ],
  );
}

export async function insertEvidence(evidence: Evidence): Promise<void> {
  await getPool().query(
    `INSERT INTO evidence (id, work_item_id, gate, hash, uri, created_by, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      evidence.id,
      evidence.workItemId,
      evidence.gate,
      evidence.hash,
      evidence.uri,
      evidence.createdBy,
      evidence.createdAt,
    ],
  );
}

export async function insertRelease(record: ReleaseRecord): Promise<void> {
  await getPool().query(
    `INSERT INTO releases (id, work_item_id, risk, build_sha, status)
     VALUES ($1, $2, $3, $4, $5)`,
    [record.id, record.workItemId, record.risk, record.buildSha, record.status],
  );
}

export async function insertOutcome(record: OutcomeRecord): Promise<void> {
  await getPool().query(
    `INSERT INTO outcomes (id, work_item_id, metric, window, baseline, value, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      record.id,
      record.workItemId,
      record.metric,
      record.window,
      record.baseline,
      record.value,
      record.status,
    ],
  );
}
```

- [ ] **Step 6: Add an integration test for records**

```ts
import { afterAll, describe, expect, it } from 'vitest';
import { closePool, getPool } from '@/lib/factory/db';
import { insertOutcome, insertRelease } from '@/lib/factory/records';
import { newId } from '@/lib/factory/ids';

const databaseUrl = process.env.TEST_DATABASE_URL;

if (databaseUrl) {
  process.env.FACTORY_DATABASE_URL = databaseUrl;
  process.env.FACTORY_CONTROL_TOKEN =
    process.env.FACTORY_CONTROL_TOKEN ?? 'x'.repeat(32);
}

describe.skipIf(!databaseUrl)('records integration', () => {
  afterAll(async () => {
    await closePool();
  });

  it('inserts a release and an outcome', async () => {
    const workItemId = newId();
    const releaseId = newId();
    const outcomeId = newId();

    await insertRelease({
      id: releaseId,
      workItemId,
      risk: 'R0',
      buildSha: 'dry-run-test',
      status: 'dry_run',
    });
    await insertOutcome({
      id: outcomeId,
      workItemId,
      metric: 'organic_sessions',
      window: '1d',
      baseline: 0,
      value: 0,
      status: 'pending',
    });

    const result = await getPool().query(
      `SELECT
        (SELECT count(*) FROM releases WHERE id = $1) AS releases,
        (SELECT count(*) FROM outcomes WHERE id = $2) AS outcomes`,
      [releaseId, outcomeId],
    );
    expect(Number(result.rows[0].releases)).toBe(1);
    expect(Number(result.rows[0].outcomes)).toBe(1);
  });
});
```

- [ ] **Step 7: Run tests and migration**

Run: `npm run factory:migrate`
Expected: migration `0002_outcomes.sql` applied.

Run: `npm test -- factory/tests/release.test.ts`
Expected: PASS.

Run: `$env:TEST_DATABASE_URL=$env:FACTORY_DATABASE_URL; npm test -- factory/tests/records.integration.test.ts`
Expected: PASS.

---

### Task 6: Temporal walking-skeleton orchestration

**Files:**
- Modify: `site/lib/factory/config.ts`
- Modify: `site/lib/factory/temporal/activities.ts`
- Modify: `site/lib/factory/temporal/workflows.ts`
- Create: `site/factory/tests/config-evidence.test.ts`

**Interfaces:**
- Consumes: generator, gates, evidence, policy, release, records.
- Produces:
  - `WorkItemWorkflowInput` with `mode?: 'approval' | 'walking_skeleton'` and `contentBrief?: ContentBrief`
  - `WorkItemWorkflowResult` with `status: 'awaiting_approval' | 'done' | 'blocked'`

- [ ] **Step 1: Add the optional evidence secret to config**

`EnvSchema`:

```ts
FACTORY_EVIDENCE_SECRET: z.string().min(32).optional(),
```

`FactoryConfig`:

```ts
evidenceSecret?: string;
```

Return:

```ts
evidenceSecret: parsed.data.FACTORY_EVIDENCE_SECRET,
```

Test:

```ts
import { describe, expect, it } from 'vitest';
import { loadFactoryConfig } from '@/lib/factory/config';

const base = {
  FACTORY_ENV: 'local',
  FACTORY_DATABASE_URL: 'postgres://factory:factory@localhost:5433/factory',
  FACTORY_CONTROL_TOKEN: 'x'.repeat(32),
};

describe('evidence secret config', () => {
  it('is optional', () => {
    expect(loadFactoryConfig(base).evidenceSecret).toBeUndefined();
  });

  it('rejects a short secret', () => {
    expect(() =>
      loadFactoryConfig({ ...base, FACTORY_EVIDENCE_SECRET: 'short' }),
    ).toThrow(/FACTORY_EVIDENCE_SECRET/);
  });
});
```

Run: `npm test -- factory/tests/config-evidence.test.ts`
Expected: PASS after the config change.

- [ ] **Step 2: Implement the walking-skeleton activities**

Add imports to `activities.ts`:

```ts
import { createHash } from 'node:crypto';
import { loadFactoryConfig } from '../config';
import {
  artifactKey,
  createS3ArtifactStore,
} from '../artifacts';
import type { Artifact, Evidence } from '../contracts';
import type { ContentBrief, ContentDraft } from '../content/contracts';
import { DeterministicContentGenerator } from '../content/generator';
import { signEvidence } from '../evidence';
import { runGates } from '../gates/run';
import type { GateResult } from '../gates/types';
import { evaluatePolicy } from '../policy';
import {
  buildReleaseManifest,
  releaseKey,
  renderPreviewHtml,
} from '../release';
import {
  insertArtifact,
  insertEvidence,
  insertOutcome,
  insertRelease,
} from '../records';
import { newId } from '../ids';
import { appendEvent } from '../event-store';
```

Add types:

```ts
export interface WalkingSkeletonInput extends WorkItemWorkflowInput {
  contentBrief: ContentBrief;
}

export interface GeneratedContent {
  draft: ContentDraft;
  artifactId: string;
  artifactUri: string;
  artifactHash: string;
}

export interface GateEvidenceRecord {
  gate: string;
  passed: boolean;
  evidenceId: string;
  evidenceHash: string;
  evidenceUri: string;
}
```

Add helper:

```ts
function sha256(value: string | Uint8Array): string {
  return createHash('sha256').update(value).digest('hex');
}

function artifactUri(key: string): string {
  const config = loadFactoryConfig();
  if (!config.artifacts) throw new Error('Artifact storage is not configured');
  return `s3://${config.artifacts.bucket}/${key}`;
}

function requireEvidenceSecret(): string {
  const secret = loadFactoryConfig().evidenceSecret;
  if (!secret) {
    throw ApplicationFailure.nonRetryable(
      'FACTORY_EVIDENCE_SECRET is not configured',
      'EVIDENCE_SECRET_MISSING',
    );
  }
  return secret;
}
```

Add activity:

```ts
export async function generateContentDraft(
  input: WalkingSkeletonInput,
): Promise<GeneratedContent> {
  const store = createS3ArtifactStore();
  const draft = new DeterministicContentGenerator().generate(
    input.contentBrief,
  );
  const key = artifactKey(input.workItemId, 'content-draft.md');
  const bytes = new TextEncoder().encode(draft.bodyMarkdown);
  await store.put(key, bytes, 'text/markdown');

  const artifact: Artifact = {
    id: newId(),
    workItemId: input.workItemId,
    kind: 'content_draft',
    hash: sha256(bytes),
    uri: artifactUri(key),
    producer: 'content-r0',
    createdAt: new Date().toISOString(),
  };
  await insertArtifact(artifact);
  await appendEvent({
    aggregateType: 'work_item',
    aggregateId: input.workItemId,
    eventType: 'ContentDraftGenerated',
    payload: {
      artifactId: artifact.id,
      artifactHash: artifact.hash,
      wordCount: draft.wordCount,
    },
    actor: input.actor,
  });

  return {
    draft,
    artifactId: artifact.id,
    artifactUri: artifact.uri,
    artifactHash: artifact.hash,
  };
}
```

Add gate activity:

```ts
export async function runContentGates(input: {
  workItemId: string;
  actor: string;
  draft: ContentDraft;
}): Promise<{ results: GateResult[]; evidence: GateEvidenceRecord[] }> {
  const store = createS3ArtifactStore();
  const secret = requireEvidenceSecret();
  const results = runGates(input.draft);
  const draftHash = sha256(input.draft.bodyMarkdown);
  const evidence: GateEvidenceRecord[] = [];

  for (const result of results) {
    const createdAt = new Date().toISOString();
    const payload = {
      workItemId: input.workItemId,
      gate: result.gate,
      passed: result.passed,
      checks: result.checks,
      draftHash,
      policyVersion: 'policy@1',
      createdAt,
    };
    const signed = signEvidence(payload, secret);
    const key = artifactKey(
      input.workItemId,
      `evidence/${result.gate}.json`,
    );
    const body = { ...payload, signature: signed.signature };
    const bytes = new TextEncoder().encode(JSON.stringify(body, null, 2));
    await store.put(key, bytes, 'application/json');

    const record: Evidence = {
      id: newId(),
      workItemId: input.workItemId,
      gate: result.gate,
      hash: signed.hash,
      uri: artifactUri(key),
      createdBy: 'gate-engine@1',
      createdAt,
    };
    await insertEvidence(record);
    await appendEvent({
      aggregateType: 'work_item',
      aggregateId: input.workItemId,
      eventType: 'GateCompleted',
      payload: {
        gate: result.gate,
        passed: result.passed,
        evidenceHash: record.hash,
      },
      actor: input.actor,
    });
    evidence.push({
      gate: result.gate,
      passed: result.passed,
      evidenceId: record.id,
      evidenceHash: record.hash,
      evidenceUri: record.uri,
    });
  }

  return { results, evidence };
}
```

Add policy activity:

```ts
export async function evaluateWorkItemPolicy(input: {
  risk: Risk;
  gates: GateResult[];
}) {
  return evaluatePolicy(input);
}
```

Need import `Risk` type.

Add release activity:

```ts
export async function releaseDryRun(input: {
  workItemId: string;
  actor: string;
  risk: Risk;
  draft: ContentDraft;
  gates: GateEvidenceRecord[];
  policyVersion: string;
}): Promise<{ id: string; buildSha: string; previewKey: string }> {
  const store = createS3ArtifactStore();
  const createdAt = new Date().toISOString();
  const manifest = buildReleaseManifest({
    workItemId: input.workItemId,
    risk: input.risk,
    draft: input.draft,
    policyVersion: input.policyVersion,
    gates: input.gates.map((gate) => ({
      gate: gate.gate,
      passed: gate.passed,
      evidenceHash: gate.evidenceHash,
    })),
    createdAt,
  });

  const manifestKey = releaseKey(input.workItemId, 'manifest.json');
  const previewKey = releaseKey(input.workItemId, 'preview.html');
  await store.put(
    manifestKey,
    new TextEncoder().encode(JSON.stringify(manifest, null, 2)),
    'application/json',
  );
  await store.put(
    previewKey,
    new TextEncoder().encode(renderPreviewHtml(manifest, input.draft)),
    'text/html',
  );

  const buildSha = `dry-run-${sha256(JSON.stringify(manifest)).slice(0, 12)}`;
  const releaseId = newId();
  await insertRelease({
    id: releaseId,
    workItemId: input.workItemId,
    risk: input.risk,
    buildSha,
    status: 'dry_run',
  });
  await appendEvent({
    aggregateType: 'work_item',
    aggregateId: input.workItemId,
    eventType: 'ReleaseDryRunCompleted',
    payload: { releaseId, buildSha, manifestKey, previewKey },
    actor: input.actor,
  });

  return { id: releaseId, buildSha, previewKey };
}
```

Add outcome activity:

```ts
export async function recordWorkItemOutcome(input: {
  workItemId: string;
  actor: string;
  metric: string;
  window: string;
}): Promise<{ id: string }> {
  const id = newId();
  await insertOutcome({
    id,
    workItemId: input.workItemId,
    metric: input.metric,
    window: input.window,
    baseline: 0,
    value: 0,
    status: 'pending',
  });
  await appendEvent({
    aggregateType: 'work_item',
    aggregateId: input.workItemId,
    eventType: 'OutcomeRecorded',
    payload: { outcomeId: id, metric: input.metric, window: input.window },
    actor: input.actor,
  });
  return { id };
}
```

Add transition activities:

```ts
export async function markWorkItemVerifying(input: WorkItemWorkflowInput) {
  const current = await loadWorkItemFromEvents(input.workItemId);
  if (!current) throw ApplicationFailure.nonRetryable('WorkItem not found', 'WORK_ITEM_NOT_FOUND');
  if (current.status === 'verifying') return;
  if (current.status !== 'running') {
    throw ApplicationFailure.nonRetryable(`Unexpected WorkItem status: ${current.status}`, 'UNEXPECTED_STATUS');
  }
  await transitionWorkItem(input.workItemId, 'verifying', input.actor);
}

export async function markWorkItemReleasing(input: WorkItemWorkflowInput) {
  const current = await loadWorkItemFromEvents(input.workItemId);
  if (!current) throw ApplicationFailure.nonRetryable('WorkItem not found', 'WORK_ITEM_NOT_FOUND');
  if (current.status === 'releasing') return;
  if (current.status !== 'verifying') {
    throw ApplicationFailure.nonRetryable(`Unexpected WorkItem status: ${current.status}`, 'UNEXPECTED_STATUS');
  }
  await transitionWorkItem(input.workItemId, 'releasing', input.actor);
}

export async function markWorkItemProductionVerified(input: WorkItemWorkflowInput) {
  const current = await loadWorkItemFromEvents(input.workItemId);
  if (!current) throw ApplicationFailure.nonRetryable('WorkItem not found', 'WORK_ITEM_NOT_FOUND');
  if (current.status === 'production_verified') return;
  if (current.status !== 'releasing') {
    throw ApplicationFailure.nonRetryable(`Unexpected WorkItem status: ${current.status}`, 'UNEXPECTED_STATUS');
  }
  await transitionWorkItem(input.workItemId, 'production_verified', input.actor);
}

export async function markWorkItemDone(input: WorkItemWorkflowInput) {
  const current = await loadWorkItemFromEvents(input.workItemId);
  if (!current) throw ApplicationFailure.nonRetryable('WorkItem not found', 'WORK_ITEM_NOT_FOUND');
  if (current.status === 'done') return;
  if (current.status !== 'production_verified') {
    throw ApplicationFailure.nonRetryable(`Unexpected WorkItem status: ${current.status}`, 'UNEXPECTED_STATUS');
  }
  await transitionWorkItem(input.workItemId, 'done', input.actor);
}

export async function markWorkItemBlocked(input: WorkItemWorkflowInput) {
  const current = await loadWorkItemFromEvents(input.workItemId);
  if (!current) throw ApplicationFailure.nonRetryable('WorkItem not found', 'WORK_ITEM_NOT_FOUND');
  if (current.status === 'blocked') return;
  if (current.status !== 'running') {
    throw ApplicationFailure.nonRetryable(`Unexpected WorkItem status: ${current.status}`, 'UNEXPECTED_STATUS');
  }
  await transitionWorkItem(input.workItemId, 'blocked', input.actor);
}
```

- [ ] **Step 3: Update the workflow**

```ts
import { log, proxyActivities } from '@temporalio/workflow';
import type { ContentBrief } from '../content/contracts';
import type * as activities from './activities';

const {
  loadWorkItem,
  markWorkItemRunning,
  markWorkItemAwaitingApproval,
  markWorkItemVerifying,
  markWorkItemReleasing,
  markWorkItemProductionVerified,
  markWorkItemDone,
  markWorkItemBlocked,
  generateContentDraft,
  runContentGates,
  evaluateWorkItemPolicy,
  releaseDryRun,
  recordWorkItemOutcome,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '2 minutes',
  retry: {
    maximumAttempts: 3,
    initialInterval: '1 second',
    backoffCoefficient: 2,
  },
});

export interface WorkItemWorkflowInput {
  workItemId: string;
  actor: string;
  mode?: 'approval' | 'walking_skeleton';
  contentBrief?: ContentBrief;
}

export interface WorkItemWorkflowResult {
  status: 'awaiting_approval' | 'done' | 'blocked';
  releaseId?: string;
  outcomeId?: string;
  reasons?: string[];
}

export async function workItemWorkflow(
  input: WorkItemWorkflowInput,
): Promise<WorkItemWorkflowResult> {
  const item = await loadWorkItem(input);
  await markWorkItemRunning(input);

  if (input.mode !== 'walking_skeleton') {
    await markWorkItemAwaitingApproval(input);
    return { status: 'awaiting_approval' };
  }

  if (!input.contentBrief) {
    throw new Error('CONTENT_BRIEF_REQUIRED');
  }

  const generated = await generateContentDraft({
    ...input,
    contentBrief: input.contentBrief,
  });
  const gateRun = await runContentGates({
    workItemId: input.workItemId,
    actor: input.actor,
    draft: generated.draft,
  });
  const policy = await evaluateWorkItemPolicy({
    risk: item.risk,
    gates: gateRun.results,
  });

  if (!policy.allowed) {
    await markWorkItemBlocked(input);
    return { status: 'blocked', reasons: policy.reasons };
  }

  if (!policy.autoRelease) {
    await markWorkItemAwaitingApproval(input);
    return { status: 'awaiting_approval' };
  }

  await markWorkItemVerifying(input);
  await markWorkItemReleasing(input);
  const release = await releaseDryRun({
    workItemId: input.workItemId,
    actor: input.actor,
    risk: item.risk,
    draft: generated.draft,
    gates: gateRun.evidence,
    policyVersion: policy.policyVersion,
  });
  await markWorkItemProductionVerified(input);
  const outcome = await recordWorkItemOutcome({
    workItemId: input.workItemId,
    actor: input.actor,
    metric: item.kpiTarget,
    window: item.outcomeWindow,
  });
  await markWorkItemDone(input);

  log.info('walking skeleton completed', {
    workItemId: input.workItemId,
    releaseId: release.id,
  });
  return { status: 'done', releaseId: release.id, outcomeId: outcome.id };
}
```

- [ ] **Step 4: Run typecheck**

Run: `npm run typecheck`
Expected: PASS.

---

### Task 7: Walking-skeleton smoke, docs, and verification

**Files:**
- Create: `site/factory/scripts/walking-skeleton.ts`
- Modify: `site/package.json`
- Modify: `site/factory/README.md`
- Modify: `.github/workflows/factory-ci.yml`

**Interfaces:**
- Consumes: API/workflow/artifact/gate/policy/release/outcome modules.
- Produces: `npm run factory:walking-skeleton` E2E check.

- [ ] **Step 1: Add the smoke script**

```ts
import { closePool, getPool } from '../../lib/factory/db';
import { projectBatch } from '../../lib/factory/projector';
import { PgProjectorStore } from '../../lib/factory/projector-pg';
import { createWorkItem, getWorkItem } from '../../lib/factory/repository';
import { startWorkItemWorkflow } from '../../lib/factory/temporal/client';
import { newId } from '../../lib/factory/ids';
import type { ContentBrief } from '../../lib/factory/content/contracts';

async function waitForStatus(
  id: string,
  expected: string,
  timeoutMs = 90_000,
): Promise<void> {
  const store = new PgProjectorStore(getPool());
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await projectBatch(store);
    const item = await getWorkItem(id);
    if (item?.status === expected) return;
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error(`Timed out waiting for ${id} to reach ${expected}`);
}

async function main(): Promise<void> {
  if (process.env.FACTORY_RUNTIME === 'new') {
    throw new Error('Refusing to run walking skeleton with FACTORY_RUNTIME=new');
  }

  const item = await createWorkItem({
    domain: 'content',
    ownerRole: 'content',
    title: `Walking skeleton ${new Date().toISOString()}`,
    risk: 'R0',
    kpiTarget: 'organic_sessions_phuket_october',
    outcomeWindow: '28d',
    budget: { tokens: 12_000, costUsd: 0.25, wallClockMinutes: 20 },
    actor: 'walking-skeleton',
  });

  const contentBrief: ContentBrief = {
    workItemId: item.id,
    title: 'راهنمای کامل سفر به پوکت در آبان ۱۴۰۵',
    slug: `phuket-october-${item.id.slice(0, 8)}`,
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
  };

  const workflowId = await startWorkItemWorkflow({
    workItemId: item.id,
    actor: 'walking-skeleton',
    mode: 'walking_skeleton',
    contentBrief,
  });

  await waitForStatus(item.id, 'done');

  const counts = await getPool().query<{
    artifacts: string;
    evidence: string;
    releases: string;
    outcomes: string;
  }>(
    `SELECT
      (SELECT count(*) FROM artifacts WHERE work_item_id = $1) AS artifacts,
      (SELECT count(*) FROM evidence WHERE work_item_id = $1) AS evidence,
      (SELECT count(*) FROM releases WHERE work_item_id = $1) AS releases,
      (SELECT count(*) FROM outcomes WHERE work_item_id = $1) AS outcomes`,
    [item.id],
  );
  const row = counts.rows[0];

  for (const key of ['artifacts', 'evidence', 'releases', 'outcomes'] as const) {
    if (Number(row[key]) < 1) {
      throw new Error(`Expected at least one ${key} for ${item.id}`);
    }
  }
  if (Number(row.evidence) < 2) {
    throw new Error(`Expected two evidence records for ${item.id}`);
  }

  console.log(
    JSON.stringify({
      workItemId: item.id,
      workflowId,
      status: 'done',
      artifacts: Number(row.artifacts),
      evidence: Number(row.evidence),
      releases: Number(row.releases),
      outcomes: Number(row.outcomes),
      executionId: newId(),
    }),
  );
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
```

Add script:

```json
"factory:walking-skeleton": "tsx factory/scripts/walking-skeleton.ts"
```

- [ ] **Step 2: Update the runbook**

Add a section covering:

- `FACTORY_EVIDENCE_SECRET` must be at least 32 characters.
- `npm run factory:walking-skeleton` requires the worker, projector, Postgres, Temporal, and artifact storage.
- Expected output: status `done`, at least 1 artifact, 2 evidence records, 1 release, 1 outcome.
- The release is `dry_run`; no production write.
- `FACTORY_RUNTIME=new` is refused.

- [ ] **Step 3: Update CI**

Add a non-secret test value:

```yaml
env:
  FACTORY_EVIDENCE_SECRET: factory-ci-evidence-secret-0123456789
```

Add verification:

```yaml
- run: npm run factory:schemas
- run: npm run lint:factory
```

- [ ] **Step 4: Run the full verification suite**

Run: `npm run factory:migrate`
Expected: no pending migrations.

Run: `npm run lint:factory`
Expected: PASS.

Run: `npm run typecheck`
Expected: PASS.

Run: `npm test`
Expected: PASS.

Run: `npm run build`
Expected: PASS.

Restart the worker and projector with the new code and `FACTORY_EVIDENCE_SECRET`, then run:

`npm run factory:walking-skeleton`

Expected: JSON with `status: "done"`, `artifacts >= 1`, `evidence >= 2`, `releases >= 1`, `outcomes >= 1`.

---

## Self-Review

- P2-01 covered by Task 1 and generated JSON Schemas.
- P2-02 covered by Task 2 with three content outputs validated in tests.
- P2-03 covered by Task 3 with signed evidence.
- P2-04 covered by Task 4 with R0/R1 policy tests.
- P2-05 covered by Task 5 and Task 6 with dry-run release, preview, and manifest. Merge queue/deploy is intentionally deferred to the production-gated phase.
- P2-06 covered by Task 7 E2E smoke and WorkItem state transitions.
- P2-07 covered by Task 5 outcome table and Task 6 outcome activity.
- No production deploy, merge, or `FACTORY_RUNTIME=new`.
- Type names are consistent: `ContentBrief`, `ContentDraft`, `GateResult`, `PolicyDecision`, `ReleaseManifest`, `GeneratedContent`, `GateEvidenceRecord`.

## Execution Record (2026-10-21)

- Tasks 1-7 implemented locally; no commit was created because the user did not request one.
- `npm run lint` passes with 54 pre-existing warnings; `npm run lint:factory` passes with zero findings.
- `npm run typecheck` passes.
- `npm test` passes: 50 tests across 19 files, including both Postgres integration tests.
- `npm run build` passes.
- `npm run factory:migrate` is idempotent.
- `npm run factory:smoke` passes with the existing approval workflow.
- `npm run factory:walking-skeleton` passes: work item `01a15cb3-a387-707a-b634-96462b5fb868`, status `done`, 1 artifact, 2 signed evidence records, 1 dry-run release, 1 pending outcome.
- S3 verification: draft hash matches, both evidence signatures verify, manifest mode is `dry_run`, preview contains the dry-run banner.
- Production remains untouched; `FACTORY_RUNTIME=new` was not set.
