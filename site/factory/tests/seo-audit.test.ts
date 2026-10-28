import { describe, expect, it } from 'vitest';
import {
  sitemapUrls,
  summarizeReports,
  type PageReport,
} from '@/factory/scripts/seo-audit';

/**
 * Q3-03 regression test for the sitemap-wide SEO audit.
 *
 * The script itself is network-bound, so only the two pure pieces are locked
 * here: turning sitemap XML into URLs, and turning raw reports into the summary
 * the operator reads. Together they guard the numbers the audit prints, which
 * is what makes the 51/51 baseline trustworthy.
 */

function report(url: string, passed: boolean, elapsedMs = 10): PageReport {
  return {
    url,
    passed,
    failedChecks: passed ? [] : ['title_length: 22 characters'],
    elapsedMs,
  };
}

describe('seo audit sitemap parsing', () => {
  it('extracts every <loc> in document order', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <url><loc>https://www.thailandgard.ir/</loc></url>
        <url><loc>https://www.thailandgard.ir/tours</loc></url>
        <url><loc>https://www.thailandgard.ir/tours/phuket-7-days</loc></url>
      </urlset>`;

    expect(sitemapUrls(xml)).toEqual([
      'https://www.thailandgard.ir/',
      'https://www.thailandgard.ir/tours',
      'https://www.thailandgard.ir/tours/phuket-7-days',
    ]);
  });

  it('trims surrounding whitespace and survives an uppercase tag', () => {
    const xml = '<urlset><url><LOC> https://www.thailandgard.ir/guide </LOC></url></urlset>';

    expect(sitemapUrls(xml)).toEqual(['https://www.thailandgard.ir/guide']);
  });

  it('returns an empty list when the sitemap has no entries', () => {
    expect(sitemapUrls('<urlset></urlset>')).toEqual([]);
  });
});

describe('seo audit summary', () => {
  it('counts passes and failures without losing the failure details', () => {
    const summary = summarizeReports([
      report('https://www.thailandgard.ir/', true),
      report('https://www.thailandgard.ir/tours', false),
      report('https://www.thailandgard.ir/guide', true),
    ]);

    expect(summary.audited).toBe(3);
    expect(summary.passed).toBe(2);
    expect(summary.failed).toBe(1);
    expect(summary.failures.map((r) => r.url)).toEqual([
      'https://www.thailandgard.ir/tours',
    ]);
    expect(summary.failures[0].failedChecks).toEqual([
      'title_length: 22 characters',
    ]);
  });

  it('sorts the slowest pages by elapsed time and keeps only the requested count', () => {
    const summary = summarizeReports(
      [
        report('https://www.thailandgard.ir/a', true, 100),
        report('https://www.thailandgard.ir/b', true, 900),
        report('https://www.thailandgard.ir/c', true, 500),
      ],
      2,
    );

    expect(summary.slowest.map((r) => r.elapsedMs)).toEqual([900, 500]);
  });

  it('reports an all-green run as zero failures', () => {
    const summary = summarizeReports([report('https://www.thailandgard.ir/', true)]);

    expect(summary).toMatchObject({ audited: 1, passed: 1, failed: 0, failures: [] });
  });
});
