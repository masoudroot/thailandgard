/**
 * Q3-03: technical SEO health sweep across every URL in the sitemap.
 *
 * Runs the existing technical SEO gate against every sitemap entry and prints a
 * compact report. Nothing is written to the database and no content is touched;
 * this is a read-only audit that produces the baseline the F5 fixes are judged
 * against.
 *
 * Usage:
 *   npx tsx factory/scripts/seo-audit.ts [--base https://www.thailandgard.ir]
 *                                       [--limit 51] [--concurrency 4]
 *                                       [--out path.json]
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { runTechnicalSeoGate } from '../../lib/factory/gates/technical-seo';
import { logger } from '../../lib/logger';

const DEFAULT_BASE = 'https://www.thailandgard.ir';

/**
 * Reports go straight to stdout instead of console.*: the repository quality
 * gate allows zero console calls outside lib/logger (factory/scripts included).
 */
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

async function fetchText(url: string, timeoutMs: number): Promise<string> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { 'user-agent': 'thailandgard-seo-audit/1.0' },
    redirect: 'follow',
  });
  if (!response.ok) {
    throw new Error(`${url} responded ${response.status}`);
  }
  return response.text();
}

function sitemapUrls(xml: string): string[] {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/gi)].map((m) => m[1].trim());
}

interface PageReport {
  url: string;
  passed: boolean;
  failedChecks: string[];
  elapsedMs: number;
}

async function auditOne(url: string): Promise<PageReport> {
  const startedAt = Date.now();
  const result = await runTechnicalSeoGate({ url });
  const failedChecks = result.checks.filter((c) => !c.passed).map((c) => `${c.id}: ${c.detail}`);
  return {
    url,
    passed: result.passed,
    failedChecks,
    elapsedMs: Date.now() - startedAt,
  };
}

async function main(): Promise<void> {
  const base = option('--base') ?? DEFAULT_BASE;
  const limit = numberOption('--limit', 200);
  const concurrency = numberOption('--concurrency', 4);
  const timeoutMs = numberOption('--timeout', 20000);

  const sitemapXml = await fetchText(new URL('/sitemap.xml', base).toString(), timeoutMs);
  const urls = sitemapUrls(sitemapXml).slice(0, limit);

  if (urls.length === 0) {
    throw new Error(`no <loc> entries found in ${base}/sitemap.xml`);
  }

  logger.info(`[seo-audit] auditing ${urls.length} URLs from ${base}`);

  const reports: PageReport[] = [];
  let cursor = 0;

  async function worker(): Promise<void> {
    while (cursor < urls.length) {
      const url = urls[cursor];
      cursor += 1;
      try {
        reports.push(await auditOne(url));
      } catch (error) {
        reports.push({
          url,
          passed: false,
          failedChecks: [`fetch: ${error instanceof Error ? error.message : String(error)}`],
          elapsedMs: 0,
        });
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, urls.length) }, worker));

  reports.sort((a, b) => a.url.localeCompare(b.url));
  const failing = reports.filter((r) => !r.passed);
  const slowest = [...reports].sort((a, b) => b.elapsedMs - a.elapsedMs).slice(0, 5);

  out('');
  out(`URLs audited : ${reports.length}`);
  out(`Passed       : ${reports.length - failing.length}`);
  out(`Failed       : ${failing.length}`);
  out('');
  if (failing.length > 0) {
    out('Failures:');
    for (const report of failing) {
      out(`- ${report.url}`);
      for (const check of report.failedChecks) out(`    ${check}`);
    }
    out('');
  }
  out('Slowest pages (ms):');
  for (const report of slowest) out(`- ${report.elapsedMs}  ${report.url}`);

  const outPath = option('--out');
  if (outPath) {
    const target = path.resolve(process.cwd(), outPath);
    await writeFile(
      target,
      JSON.stringify({ base, auditedAt: new Date().toISOString(), reports }, null, 2),
      'utf8',
    );
    out('');
    out(`Report written to ${target}`);
  }

  if (failing.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  logger.error('[seo-audit] failed', undefined, error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
