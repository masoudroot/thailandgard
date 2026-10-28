/**
 * Q3-02: copy checklist sweep across every sitemap URL.
 *
 * Fetches each page, extracts the visible Persian text, and runs the rules from
 * `agents/branding/UX-WRITING.md` plus the 25-word intro sentence limit from
 * PLAN Q3-02. Read-only: nothing is written to the database and no content is
 * edited by this script.
 *
 * Usage:
 *   npm run factory:copy-audit -- [--base https://www.thailandgard.ir]
 *                                [--limit 60] [--concurrency 4]
 *                                [--out copy-report.json]
 *
 * Exit code 1 when at least one issue is found, so CI can gate on it.
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  checkCopy,
  introParagraph,
  visibleText,
  type CopyIssue,
} from '../../lib/factory/copy-audit';
import { logger } from '../../lib/logger';
import { sitemapUrls } from './seo-audit';

const DEFAULT_BASE = 'https://www.thailandgard.ir';

/** Same reason as seo-audit: the quality gate allows zero console calls here. */
function out(line = ''): void {
  process.stdout.write(`${line}\n`);
}

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index < 0) return undefined;
  return process.argv[index + 1];
}

function numberOption(name: string, fallback: number): number {
  const raw = option(name);
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export interface PageCopyReport {
  url: string;
  issues: CopyIssue[];
}

async function fetchHtml(url: string, timeoutMs: number): Promise<string> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { 'user-agent': 'thailandgard-copy-audit/1.0' },
    redirect: 'follow',
  });
  if (!response.ok) throw new Error(`${url} responded ${response.status}`);
  return response.text();
}

export async function auditCopyPage(url: string, timeoutMs = 20_000): Promise<PageCopyReport> {
  const html = await fetchHtml(url, timeoutMs);
  const text = visibleText(html);
  const intro = introParagraph(html);
  return {
    url,
    issues: [
      ...checkCopy(text, { checkSentenceLength: false }),
      ...checkCopy(intro, { checkSentenceLength: true }),
    ],
  };
}

export interface CopySummary {
  audited: number;
  clean: number;
  dirty: number;
  totalIssues: number;
  /** Mechanically decidable rules; these gate the run. */
  blocking: number;
  /** Rules that need human judgement; reported, never gating. */
  advisory: number;
  byRule: Record<string, number>;
  pages: PageCopyReport[];
}

/** Pure aggregation so the regression test can assert the report numbers. */
export function summarizeCopy(reports: PageCopyReport[]): CopySummary {
  const byRule: Record<string, number> = {};
  let totalIssues = 0;
  let blocking = 0;
  let advisory = 0;
  for (const report of reports) {
    for (const issue of report.issues) {
      byRule[issue.rule] = (byRule[issue.rule] ?? 0) + 1;
      totalIssues += 1;
      if (issue.severity === "advisory") advisory += 1;
      else blocking += 1;
    }
  }
  const dirty = reports.filter((r) => r.issues.length > 0).length;
  return {
    audited: reports.length,
    clean: reports.length - dirty,
    dirty,
    totalIssues,
    blocking,
    advisory,
    byRule,
    pages: [...reports].sort((a, b) => a.url.localeCompare(b.url)),
  };
}

async function main(): Promise<void> {
  const base = option('--base') ?? DEFAULT_BASE;
  const limit = numberOption('--limit', 200);
  const concurrency = numberOption('--concurrency', 4);
  const timeoutMs = numberOption('--timeout', 20_000);

  const sitemapXml = await fetchHtml(new URL('/sitemap.xml', base).toString(), timeoutMs);
  const urls = sitemapUrls(sitemapXml).slice(0, limit);
  if (urls.length === 0) throw new Error(`no <loc> entries found in ${base}/sitemap.xml`);

  logger.info(`[copy-audit] checking ${urls.length} URLs from ${base}`);

  const reports: PageCopyReport[] = [];
  let cursor = 0;
  async function worker(): Promise<void> {
    while (cursor < urls.length) {
      const url = urls[cursor];
      cursor += 1;
      try {
        reports.push(await auditCopyPage(url, timeoutMs));
      } catch (error) {
        reports.push({
          url,
          issues: [
            {
              rule: 'fetch_error',
              found: 'page not readable',
              context: error instanceof Error ? error.message : String(error),
              severity: 'blocking',
            },
          ],
        });
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, urls.length) }, worker));

  const summary = summarizeCopy(reports);
  out('');
  out(`URLs audited : ${summary.audited}`);
  out(`Clean        : ${summary.clean}`);
  out(`With issues  : ${summary.dirty}`);
  out(`Total issues : ${summary.totalIssues}`);
  out(`  blocking   : ${summary.blocking}  (gates the run)`);
  out(`  advisory   : ${summary.advisory}  (needs a human read)`);
  out('');
  for (const [rule, count] of Object.entries(summary.byRule).sort((a, b) => b[1] - a[1])) {
    out(`  ${rule}: ${count}`);
  }
  if (summary.dirty > 0) {
    out('');
    out('Pages:');
    for (const report of summary.pages) {
      if (report.issues.length === 0) continue;
      out(`- ${report.url}`);
      for (const issue of report.issues) {
        out(`    [${issue.rule}/${issue.severity}] ${issue.found} → ${issue.context}`);
      }
    }
  }

  const outPath = option('--out');
  if (outPath) {
    const target = path.resolve(process.cwd(), outPath);
    await writeFile(
      target,
      JSON.stringify({ base, auditedAt: new Date().toISOString(), ...summary }, null, 2),
      'utf8',
    );
    out('');
    out(`Report written to ${target}`);
  }

  if (summary.blocking > 0) process.exitCode = 1;
}

function isDirectRun(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return import.meta.url === pathToFileURL(entry).href;
  } catch {
    return false;
  }
}

if (isDirectRun()) {
  main().catch((error) => {
    logger.error('[copy-audit] failed', undefined, error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
