import { describe, expect, it } from 'vitest';
import type { GateResult } from '@/lib/factory/gates/types';
import { evaluatePolicy } from '@/lib/factory/policy';

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

  it('requires approval for R1 when technical SEO passes', () => {
    const decision = evaluatePolicy({
      risk: 'R1',
      gates: [
        ...passed,
        { gate: 'seo_r1', passed: true, checks: [] },
      ],
    });
    expect(decision.allowed).toBe(true);
    expect(decision.autoRelease).toBe(false);
    expect(decision.requiresApproval).toBe(true);
  });

  it('denies R1 when technical SEO evidence is missing', () => {
    const decision = evaluatePolicy({ risk: 'R1', gates: passed });
    expect(decision.allowed).toBe(false);
    expect(decision.reasons.join(' ')).toMatch(/seo_r1/);
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
