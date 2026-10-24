import { describe, expect, it } from 'vitest';
import {
  runTechnicalSeoGate,
  type TechnicalSeoPage,
} from '@/lib/factory/gates/technical-seo';

const canonical = 'https://thailandgard.ir/tours/phuket-7-days';

const passingHtml = `<!doctype html>
<html lang="fa" dir="rtl">
<head>
  <title>راهنمای کامل تور پوکت ۷ روزه با قیمت و برنامه سفر</title>
  <meta name="description" content="راهنمای کامل تور پوکت ۷ روزه؛ برنامهٔ روزبه‌روز، قیمت، هتل و نکات سفر. همهٔ چیزهایی که برای انتخاب این تور نیاز دارید.">
  <meta name="robots" content="index,follow">
  <meta property="og:title" content="راهنمای کامل تور پوکت ۷ روزه">
  <meta property="og:description" content="برنامه، قیمت و نکات سفر به پوکت">
  <link rel="canonical" href="${canonical}">
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"TouristTrip","name":"تور پوکت"}</script>
</head>
<body>
  <h1>تور پوکت ۷ روزه</h1>
  <a href="/tours">همهٔ تورها</a>
  <a href="/guide/phuket">راهنمای پوکت</a>
</body>
</html>`;

function page(html: string, status = 200): TechnicalSeoPage {
  return { url: canonical, status, html, elapsedMs: 12 };
}

describe('R1 technical SEO gate', () => {
  it('passes a well-formed page', async () => {
    const result = await runTechnicalSeoGate({
      url: canonical,
      expected: {
        canonical,
        titleIncludes: 'پوکت',
        jsonLdTypes: ['TouristTrip'],
      },
      fetchPage: async () => page(passingHtml),
    });
    expect(result.gate).toBe('seo_r1');
    expect(result.passed).toBe(true);
  });

  it('fails on a non-200 response', async () => {
    const result = await runTechnicalSeoGate({
      url: canonical,
      fetchPage: async () => page(passingHtml, 500),
    });
    expect(result.passed).toBe(false);
    expect(result.checks.find((check) => check.id === 'http_ok')?.passed).toBe(
      false,
    );
  });

  it('fails when the page is noindex or lacks a canonical', async () => {
    const html = passingHtml
      .replace('index,follow', 'noindex,nofollow')
      .replace(`<link rel="canonical" href="${canonical}">`, '');
    const result = await runTechnicalSeoGate({
      url: canonical,
      fetchPage: async () => page(html),
    });
    expect(result.passed).toBe(false);
    expect(
      result.checks.find((check) => check.id === 'no_noindex')?.passed,
    ).toBe(false);
    expect(
      result.checks.find((check) => check.id === 'canonical_present')?.passed,
    ).toBe(false);
  });

  it('fails when more than one H1 is present', async () => {
    const html = passingHtml.replace(
      '<h1>تور پوکت ۷ روزه</h1>',
      '<h1>تور پوکت ۷ روزه</h1><h1>تور پوکت</h1>',
    );
    const result = await runTechnicalSeoGate({
      url: canonical,
      fetchPage: async () => page(html),
    });
    expect(result.checks.find((check) => check.id === 'single_h1')?.passed).toBe(
      false,
    );
  });
});
