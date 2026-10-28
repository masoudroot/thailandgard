import { describe, expect, it } from 'vitest';
import config from '../../next.config';

/**
 * Q4-04 regression test: the edge security headers must stay declared.
 *
 * Reading the real config (instead of a copy of the strings) means deleting or
 * renaming a header in next.config.ts fails here, before a deploy.
 */

async function globalHeaders(): Promise<Record<string, string>> {
  const rules = (await config.headers?.()) ?? [];
  const global = rules.find((rule) => rule.source === '/:path*' && !rule.has);
  if (!global) throw new Error('no global /:path* header rule in next.config.ts');
  const map: Record<string, string> = {};
  for (const header of global.headers) map[header.key.toLowerCase()] = header.value;
  return map;
}

describe('edge security headers', () => {
  it('declares the safe hardening headers on every path', async () => {
    const headers = await globalHeaders();

    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['x-frame-options']).toBe('SAMEORIGIN');
  });

  it('locks the powerful browser features off', async () => {
    const policy = (await globalHeaders())['permissions-policy'] ?? '';

    for (const feature of ['camera', 'microphone', 'geolocation', 'payment']) {
      expect(policy).toContain(`${feature}=()`);
    }
  });

  it('ships CSP in report-only mode until the reports are clean', async () => {
    const headers = await globalHeaders();

    expect(headers['content-security-policy-report-only']).toBeDefined();
    // An enforcing header would break the 54 inline scripts before the reports
    // have been reviewed, so it must not exist yet.
    expect(headers['content-security-policy']).toBeUndefined();
  });

  it('keeps the CSP directives that matter for this site', async () => {
    const csp = (await globalHeaders())['content-security-policy-report-only'] ?? '';

    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
    // Clarity is the only third party the site loads.
    expect(csp).toContain('https://www.clarity.ms');
  });

  it('does not duplicate HSTS, which the platform already sends', async () => {
    const headers = await globalHeaders();
    expect(headers['strict-transport-security']).toBeUndefined();
  });
});
