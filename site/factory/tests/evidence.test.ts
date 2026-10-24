import { describe, expect, it } from 'vitest';
import { signEvidence, verifyEvidence } from '@/lib/factory/evidence';

const secret = 'x'.repeat(32);

describe('evidence signatures', () => {
  it('verifies a matching signature', () => {
    const payload = { gate: 'content', passed: true };
    const signed = signEvidence(payload, secret);
    expect(verifyEvidence(payload, signed.signature, secret)).toBe(true);
  });

  it('rejects a changed payload', () => {
    const signed = signEvidence({ passed: true }, secret);
    expect(verifyEvidence({ passed: false }, signed.signature, secret)).toBe(
      false,
    );
  });
});
