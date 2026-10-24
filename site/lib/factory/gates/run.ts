import type { ContentDraft } from '../content/contracts';
import { runContentGate } from './content';
import { runSeoGate } from './seo';
import type { GateResult } from './types';

export function runGates(draft: ContentDraft): GateResult[] {
  return [runContentGate(draft), runSeoGate(draft)];
}
