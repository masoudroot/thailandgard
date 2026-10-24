export interface GateCheck {
  id: string;
  passed: boolean;
  detail: string;
}

export type GateName = 'content' | 'seo' | 'seo_r1' | 'tour_facts';

export interface GateResult {
  gate: GateName;
  passed: boolean;
  checks: GateCheck[];
}
