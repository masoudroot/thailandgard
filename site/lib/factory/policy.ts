import type { Risk } from './contracts';
import type { GateResult } from './gates/types';

export interface PolicyDecision {
  allowed: boolean;
  autoRelease: boolean;
  requiresApproval: boolean;
  reasons: string[];
  policyVersion: string;
}

const R0_GATES = ['content', 'seo'] as const;
const R1_GATES = ['content', 'seo', 'seo_r1'] as const;
const POLICY_VERSION = 'policy@1';

function requiredGates(risk: Risk): readonly GateResult['gate'][] {
  return risk === 'R0' ? R0_GATES : R1_GATES;
}

export function evaluatePolicy(input: {
  risk: Risk;
  gates: GateResult[];
}): PolicyDecision {
  const reasons: string[] = [];
  const byGate = new Map(input.gates.map((gate) => [gate.gate, gate]));

  for (const gate of requiredGates(input.risk)) {
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
