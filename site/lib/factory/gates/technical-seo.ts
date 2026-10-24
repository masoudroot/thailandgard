import type { GateCheck, GateResult } from './types';

export interface TechnicalSeoPage {
  url: string;
  status: number;
  html: string;
  elapsedMs?: number;
}

export interface TechnicalSeoExpectations {
  canonical?: string;
  titleIncludes?: string;
  jsonLdTypes?: string[];
  minInternalLinks?: number;
}

export interface TechnicalSeoInput {
  url: string;
  expected?: TechnicalSeoExpectations;
  fetchPage?: (url: string, timeoutMs: number) => Promise<TechnicalSeoPage>;
  timeoutMs?: number;
}

function check(id: string, passed: boolean, detail: string): GateCheck {
  return { id, passed, detail };
}

function decode(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function attr(tag: string, name: string): string | null {
  const match = tag.match(
    new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'),
  );
  return match ? decode(match[1] ?? match[2] ?? match[3] ?? '') : null;
}

function tags(html: string, name: string): string[] {
  return html.match(new RegExp(`<${name}\\b[^>]*>`, 'gi')) ?? [];
}

function title(html: string): string | null {
  const match = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  return match ? decode(match[1].replace(/<[^>]+>/g, '')) : null;
}

function meta(html: string, key: string): string | null {
  for (const tag of tags(html, 'meta')) {
    const name = attr(tag, 'name') ?? attr(tag, 'property');
    if (name?.toLowerCase() === key.toLowerCase()) return attr(tag, 'content');
  }
  return null;
}

function canonical(html: string): string | null {
  for (const tag of tags(html, 'link')) {
    const rel = attr(tag, 'rel')?.toLowerCase().split(/\s+/) ?? [];
    if (rel.includes('canonical')) return attr(tag, 'href');
  }
  return null;
}

function htmlLangAndDir(html: string): { lang: string | null; dir: string | null } {
  const match = html.match(/<html\b([^>]*)>/i);
  if (!match) return { lang: null, dir: null };
  return { lang: attr(match[1], 'lang'), dir: attr(match[1], 'dir') };
}

function sameUrl(left: string, right: string): boolean {
  try {
    const a = new URL(left);
    const b = new URL(right);
    const normalizePath = (path: string) =>
      path.length > 1 ? path.replace(/\/+$/, '') : path;
    return (
      a.origin === b.origin &&
      normalizePath(a.pathname) === normalizePath(b.pathname) &&
      a.search === b.search
    );
  } catch {
    return left === right;
  }
}

function internalLinkCount(html: string, pageUrl: string): number {
  const origin = new URL(pageUrl).origin;
  const links = new Set<string>();
  for (const anchor of html.match(/<a\b[^>]*>/gi) ?? []) {
    const href = attr(anchor, 'href');
    if (!href) continue;
    const lower = href.toLowerCase();
    if (
      lower.startsWith('#') ||
      lower.startsWith('mailto:') ||
      lower.startsWith('tel:') ||
      lower.startsWith('javascript:')
    ) {
      continue;
    }
    try {
      const url = new URL(href, pageUrl);
      if (url.origin === origin) links.add(url.pathname + url.search);
    } catch {
      continue;
    }
  }
  return links.size;
}

function jsonLdTypes(html: string): { values: Set<string>; invalid: number } {
  const values = new Set<string>();
  let invalid = 0;

  const collect = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach(collect);
      return;
    }
    if (!value || typeof value !== 'object') return;
    const record = value as Record<string, unknown>;
    const type = record['@type'];
    if (typeof type === 'string') values.add(type);
    if (Array.isArray(type)) {
      for (const item of type) {
        if (typeof item === 'string') values.add(item);
      }
    }
    if (record['@graph']) collect(record['@graph']);
  };

  for (const script of html.match(
    /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  ) ?? []) {
    const body = script.replace(/^[\s\S]*?>/, '').replace(/<\/script>$/i, '');
    try {
      collect(JSON.parse(body));
    } catch {
      invalid += 1;
    }
  }
  return { values, invalid };
}

async function defaultFetchPage(
  url: string,
  timeoutMs: number,
): Promise<TechnicalSeoPage> {
  const started = Date.now();
  const response = await fetch(url, {
    redirect: 'follow',
    headers: { 'user-agent': 'ThailandGardFactorySEO/1.0' },
    signal: AbortSignal.timeout(timeoutMs),
  });
  const html = await response.text();
  return {
    url: response.url || url,
    status: response.status,
    html,
    elapsedMs: Date.now() - started,
  };
}

export async function runTechnicalSeoGate(
  input: TechnicalSeoInput,
): Promise<GateResult> {
  const timeoutMs = input.timeoutMs ?? 15_000;
  const expected = input.expected ?? {};
  const page = await (input.fetchPage ?? defaultFetchPage)(input.url, timeoutMs);
  const pageTitle = title(page.html);
  const description = meta(page.html, 'description');
  const canonicalUrl = canonical(page.html);
  const robots = meta(page.html, 'robots');
  const { lang, dir } = htmlLangAndDir(page.html);
  const h1Count = (page.html.match(/<h1\b/gi) ?? []).length;
  const links = internalLinkCount(page.html, page.url);
  const structured = jsonLdTypes(page.html);
  const ogTitle = meta(page.html, 'og:title');
  const ogDescription = meta(page.html, 'og:description');
  const requiredTypes = expected.jsonLdTypes ?? [];
  const minLinks = expected.minInternalLinks ?? 2;

  const checks = [
    check('http_ok', page.status === 200, `${page.status} in ${page.elapsedMs ?? '?'}ms`),
    check(
      'html_lang_rtl',
      lang?.toLowerCase().startsWith('fa') === true &&
        dir?.toLowerCase() === 'rtl',
      `lang=${lang ?? 'missing'} dir=${dir ?? 'missing'}`,
    ),
    check(
      'title_length',
      pageTitle !== null &&
        pageTitle.length >= 30 &&
        pageTitle.length <= 70,
      pageTitle === null ? 'missing title' : `${pageTitle.length} characters`,
    ),
    check(
      'title_contains',
      expected.titleIncludes === undefined ||
        (pageTitle?.includes(expected.titleIncludes) ?? false),
      expected.titleIncludes
        ? `expected ${expected.titleIncludes}`
        : 'no expected title phrase',
    ),
    check(
      'meta_description',
      description !== null &&
        description.length >= 70 &&
        description.length <= 160,
      description === null
        ? 'missing description'
        : `${description.length} characters`,
    ),
    check(
      'canonical_present',
      canonicalUrl !== null && canonicalUrl.length > 0,
      canonicalUrl ?? 'missing canonical',
    ),
    check(
      'canonical_matches',
      expected.canonical === undefined ||
        (canonicalUrl !== null && sameUrl(canonicalUrl, expected.canonical)),
      expected.canonical
        ? `expected ${expected.canonical}`
        : 'no expected canonical',
    ),
    check('single_h1', h1Count === 1, `${h1Count} H1 headings`),
    check(
      'no_noindex',
      !(robots ?? '').toLowerCase().includes('noindex'),
      robots ?? 'no robots meta',
    ),
    check(
      'json_ld_valid',
      structured.invalid === 0 && structured.values.size > 0,
      `${structured.values.size} types, ${structured.invalid} invalid blocks`,
    ),
    check(
      'json_ld_types',
      requiredTypes.every((type) => structured.values.has(type)),
      `found ${[...structured.values].join(', ') || 'none'}`,
    ),
    check(
      'internal_links',
      links >= minLinks,
      `${links} internal links (minimum ${minLinks})`,
    ),
    check(
      'og_tags',
      (ogTitle?.length ?? 0) > 0 && (ogDescription?.length ?? 0) > 0,
      `og:title=${ogTitle ? 'yes' : 'no'} og:description=${ogDescription ? 'yes' : 'no'}`,
    ),
  ];

  return {
    gate: 'seo_r1',
    passed: checks.every((item) => item.passed),
    checks,
  };
}
