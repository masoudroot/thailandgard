import { createHash } from 'node:crypto';
import {
  artifactKey,
  createArtifactStore,
} from './artifacts';
import { loadFactoryConfig } from './config';
import type { Artifact, Evidence, Risk, WorkItem } from './contracts';
import {
  ContentBriefSchema,
  ContentDraftSchema,
  type ContentBrief,
  type ContentDraft,
} from './content/contracts';
import { DeterministicContentGenerator } from './content/generator';
import { appendEvent } from './event-store';
import { signEvidence } from './evidence';
import { runGates } from './gates/run';
import {
  runTechnicalSeoGate,
  type TechnicalSeoExpectations,
} from './gates/technical-seo';
import type { GateResult } from './gates/types';
import { newId } from './ids';
import { planOutreach } from './outreach/planner';
import { dispatchDueOutreach } from './outreach/sender';
import {
  getOutreachContext,
  insertOutreachPlan,
  listProspects,
} from './outreach/store';
import { evaluatePolicy, type PolicyDecision } from './policy';
import { buildSeoPlan, type SeoPlan } from './seo/plan';
import { collectSeoRadar, type SeoSignal } from './seo/radar';
import { persistSeoSignals } from './seo/store';
import {
  buildTourFactGate,
  loadTourFacts,
  summarizeTourFacts,
  type TourFact,
} from './tours/facts';
import { buildTourOpsPlan, type TourOpsPlan } from './tours/plan';
import { persistTourFacts } from './tours/store';
import {
  buildReleaseManifest,
  releaseKey,
  renderPreviewHtml,
} from './release';
import {
  insertArtifact,
  insertEvidence,
  insertOutcome,
  insertRelease,
} from './records';
import {
  loadWorkItemFromEvents,
  transitionWorkItem,
} from './repository';
import type { WorkItemRunInput } from './runner';

export interface WalkingSkeletonInput extends WorkItemRunInput {
  contentBrief: ContentBrief;
}

export interface GeneratedContent {
  draft: ContentDraft;
  artifactId: string;
  artifactUri: string;
  artifactHash: string;
}

export interface GateEvidenceRecord {
  gate: string;
  passed: boolean;
  evidenceId: string;
  evidenceHash: string;
  evidenceUri: string;
}

function sha256(value: string | Uint8Array): string {
  return createHash('sha256').update(value).digest('hex');
}

function nonRetryable(message: string, type: string): Error {
  const error = new Error(`[${type}] ${message}`);
  return Object.assign(error, { type, nonRetryable: true });
}

function artifactUri(key: string): string {
  const config = loadFactoryConfig();
  if (config.artifacts) return `s3://${config.artifacts.bucket}/${key}`;
  if (config.artifactDir) return `file://${config.artifactDir}/${key}`;
  throw new Error('Artifact storage is not configured');
}

function requireEvidenceSecret(): string {
  const secret = loadFactoryConfig().evidenceSecret;
  if (!secret) {
    throw nonRetryable(
      'FACTORY_EVIDENCE_SECRET is not configured',
      'EVIDENCE_SECRET_MISSING',
    );
  }
  return secret;
}

async function putTextArtifact(input: {
  workItemId: string;
  name: string;
  body: string;
  kind: string;
  producer: string;
  contentType: string;
}): Promise<Artifact> {
  const store = createArtifactStore();
  const key = artifactKey(input.workItemId, input.name);
  const bytes = new TextEncoder().encode(input.body);
  await store.put(key, bytes, input.contentType);
  const artifact: Artifact = {
    id: newId(),
    workItemId: input.workItemId,
    kind: input.kind,
    hash: sha256(bytes),
    uri: artifactUri(key),
    producer: input.producer,
    createdAt: new Date().toISOString(),
  };
  await insertArtifact(artifact);
  return artifact;
}

async function recordGateEvidence(input: {
  workItemId: string;
  actor: string;
  result: GateResult;
  subjectHash: string;
  subjectLabel: string;
}): Promise<GateEvidenceRecord> {
  const store = createArtifactStore();
  const secret = requireEvidenceSecret();
  const createdAt = new Date().toISOString();
  const payload = {
    workItemId: input.workItemId,
    gate: input.result.gate,
    passed: input.result.passed,
    checks: input.result.checks,
    subjectHash: input.subjectHash,
    subjectLabel: input.subjectLabel,
    policyVersion: 'policy@1',
    createdAt,
  };
  const signed = signEvidence(payload, secret);
  const key = artifactKey(
    input.workItemId,
    `evidence-${input.result.gate}-${input.subjectHash.slice(0, 12)}.json`,
  );
  const body = { ...payload, signature: signed.signature };
  const bytes = new TextEncoder().encode(JSON.stringify(body, null, 2));
  await store.put(key, bytes, 'application/json');

  const record: Evidence = {
    id: newId(),
    workItemId: input.workItemId,
    gate: input.result.gate,
    hash: signed.hash,
    uri: artifactUri(key),
    createdBy: 'gate-engine@1',
    createdAt,
  };
  await insertEvidence(record);
  await appendEvent({
    aggregateType: 'work_item',
    aggregateId: input.workItemId,
    eventType: 'GateCompleted',
    payload: {
      gate: input.result.gate,
      passed: input.result.passed,
      evidenceHash: record.hash,
    },
    actor: input.actor,
  });

  return {
    gate: input.result.gate,
    passed: input.result.passed,
    evidenceId: record.id,
    evidenceHash: record.hash,
    evidenceUri: record.uri,
  };
}

async function loadRequiredItem(id: string): Promise<WorkItem> {
  const item = await loadWorkItemFromEvents(id);
  if (!item) {
    throw nonRetryable(
      `WorkItem not found: ${id}`,
      'WORK_ITEM_NOT_FOUND',
    );
  }
  return item;
}

export async function loadWorkItem(input: WorkItemRunInput) {
  return loadRequiredItem(input.workItemId);
}

export async function markWorkItemRunning(
  input: WorkItemRunInput,
): Promise<void> {
  const current = await loadRequiredItem(input.workItemId);
  if (current.status === 'running') return;
  if (current.status === 'planned') {
    await transitionWorkItem(input.workItemId, 'ready', input.actor);
  }
  if (current.status !== 'planned' && current.status !== 'ready') {
    throw nonRetryable(
      `Unexpected WorkItem status: ${current.status}`,
      'UNEXPECTED_STATUS',
    );
  }
  await transitionWorkItem(input.workItemId, 'running', input.actor);
}

export async function markWorkItemAwaitingApproval(
  input: WorkItemRunInput,
): Promise<void> {
  const current = await loadRequiredItem(input.workItemId);

  if (current.status === 'running') {
    await transitionWorkItem(input.workItemId, 'verifying', input.actor);
  }

  const verifying = await loadRequiredItem(input.workItemId);
  if (verifying.status === 'awaiting_approval') return;
  if (verifying.status !== 'verifying') {
    throw nonRetryable(
      `Unexpected WorkItem status: ${verifying.status}`,
      'UNEXPECTED_STATUS',
    );
  }

  await transitionWorkItem(
    input.workItemId,
    'awaiting_approval',
    input.actor,
  );
}

export async function markWorkItemVerifying(
  input: WorkItemRunInput,
): Promise<void> {
  const current = await loadRequiredItem(input.workItemId);
  if (current.status === 'verifying') return;
  if (current.status !== 'running') {
    throw nonRetryable(
      `Unexpected WorkItem status: ${current.status}`,
      'UNEXPECTED_STATUS',
    );
  }
  await transitionWorkItem(input.workItemId, 'verifying', input.actor);
}

export async function markWorkItemReleasing(
  input: WorkItemRunInput,
): Promise<void> {
  const current = await loadRequiredItem(input.workItemId);
  if (current.status === 'releasing') return;
  if (current.status !== 'verifying') {
    throw nonRetryable(
      `Unexpected WorkItem status: ${current.status}`,
      'UNEXPECTED_STATUS',
    );
  }
  await transitionWorkItem(input.workItemId, 'releasing', input.actor);
}

export async function markWorkItemProductionVerified(
  input: WorkItemRunInput,
): Promise<void> {
  const current = await loadRequiredItem(input.workItemId);
  if (current.status === 'production_verified') return;
  if (current.status !== 'releasing') {
    throw nonRetryable(
      `Unexpected WorkItem status: ${current.status}`,
      'UNEXPECTED_STATUS',
    );
  }
  await transitionWorkItem(
    input.workItemId,
    'production_verified',
    input.actor,
  );
}

export async function markWorkItemDone(
  input: WorkItemRunInput,
): Promise<void> {
  const current = await loadRequiredItem(input.workItemId);
  if (current.status === 'done') return;
  if (current.status !== 'production_verified') {
    throw nonRetryable(
      `Unexpected WorkItem status: ${current.status}`,
      'UNEXPECTED_STATUS',
    );
  }
  await transitionWorkItem(input.workItemId, 'done', input.actor);
}

export async function markWorkItemBlocked(
  input: WorkItemRunInput,
): Promise<void> {
  const current = await loadRequiredItem(input.workItemId);
  if (current.status === 'blocked') return;
  if (current.status !== 'running' && current.status !== 'verifying') {
    throw nonRetryable(
      `Unexpected WorkItem status: ${current.status}`,
      'UNEXPECTED_STATUS',
    );
  }
  await transitionWorkItem(input.workItemId, 'blocked', input.actor);
}

export async function generateContentDraft(
  input: WalkingSkeletonInput,
): Promise<GeneratedContent> {
  const store = createArtifactStore();
  const brief = ContentBriefSchema.parse(input.contentBrief);
  const draft = new DeterministicContentGenerator().generate(brief);
  const key = artifactKey(input.workItemId, 'content-draft.md');
  const bytes = new TextEncoder().encode(draft.bodyMarkdown);
  await store.put(key, bytes, 'text/markdown');

  const artifact: Artifact = {
    id: newId(),
    workItemId: input.workItemId,
    kind: 'content_draft',
    hash: sha256(bytes),
    uri: artifactUri(key),
    producer: 'content-r0',
    createdAt: new Date().toISOString(),
  };
  await insertArtifact(artifact);
  await appendEvent({
    aggregateType: 'work_item',
    aggregateId: input.workItemId,
    eventType: 'ContentDraftGenerated',
    payload: {
      artifactId: artifact.id,
      artifactHash: artifact.hash,
      wordCount: draft.wordCount,
    },
    actor: input.actor,
  });

  return {
    draft,
    artifactId: artifact.id,
    artifactUri: artifact.uri,
    artifactHash: artifact.hash,
  };
}

export async function runContentGates(input: {
  workItemId: string;
  actor: string;
  draft: ContentDraft;
}): Promise<{ results: GateResult[]; evidence: GateEvidenceRecord[] }> {
  const store = createArtifactStore();
  const secret = requireEvidenceSecret();
  const draft = ContentDraftSchema.parse(input.draft);
  const results = runGates(draft);
  const draftHash = sha256(draft.bodyMarkdown);
  const evidence: GateEvidenceRecord[] = [];

  for (const result of results) {
    const createdAt = new Date().toISOString();
    const payload = {
      workItemId: input.workItemId,
      gate: result.gate,
      passed: result.passed,
      checks: result.checks,
      draftHash,
      policyVersion: 'policy@1',
      createdAt,
    };
    const signed = signEvidence(payload, secret);
    const key = artifactKey(
      input.workItemId,
      `evidence-${result.gate}.json`,
    );
    const body = { ...payload, signature: signed.signature };
    const bytes = new TextEncoder().encode(JSON.stringify(body, null, 2));
    await store.put(key, bytes, 'application/json');

    const record: Evidence = {
      id: newId(),
      workItemId: input.workItemId,
      gate: result.gate,
      hash: signed.hash,
      uri: artifactUri(key),
      createdBy: 'gate-engine@1',
      createdAt,
    };
    await insertEvidence(record);
    await appendEvent({
      aggregateType: 'work_item',
      aggregateId: input.workItemId,
      eventType: 'GateCompleted',
      payload: {
        gate: result.gate,
        passed: result.passed,
        evidenceHash: record.hash,
      },
      actor: input.actor,
    });
    evidence.push({
      gate: result.gate,
      passed: result.passed,
      evidenceId: record.id,
      evidenceHash: record.hash,
      evidenceUri: record.uri,
    });
  }

  return { results, evidence };
}

export async function evaluateWorkItemPolicy(input: {
  risk: Risk;
  gates: GateResult[];
}): Promise<PolicyDecision> {
  return evaluatePolicy(input);
}

export async function releaseDryRun(input: {
  workItemId: string;
  actor: string;
  risk: Risk;
  draft: ContentDraft;
  gates: GateEvidenceRecord[];
  policyVersion: string;
}): Promise<{ id: string; buildSha: string; previewKey: string }> {
  const store = createArtifactStore();
  const createdAt = new Date().toISOString();
  const manifest = buildReleaseManifest({
    workItemId: input.workItemId,
    risk: input.risk,
    draft: input.draft,
    policyVersion: input.policyVersion,
    gates: input.gates.map((gate) => ({
      gate: gate.gate,
      passed: gate.passed,
      evidenceHash: gate.evidenceHash,
    })),
    createdAt,
  });

  const manifestKey = releaseKey(input.workItemId, 'manifest.json');
  const previewKey = releaseKey(input.workItemId, 'preview.html');
  await store.put(
    manifestKey,
    new TextEncoder().encode(JSON.stringify(manifest, null, 2)),
    'application/json',
  );
  await store.put(
    previewKey,
    new TextEncoder().encode(renderPreviewHtml(manifest, input.draft)),
    'text/html',
  );

  const buildSha = `dry-run-${sha256(JSON.stringify(manifest)).slice(0, 12)}`;
  const releaseId = newId();
  await insertRelease({
    id: releaseId,
    workItemId: input.workItemId,
    risk: input.risk,
    buildSha,
    status: 'dry_run',
  });
  await appendEvent({
    aggregateType: 'work_item',
    aggregateId: input.workItemId,
    eventType: 'ReleaseDryRunCompleted',
    payload: { releaseId, buildSha, manifestKey, previewKey },
    actor: input.actor,
  });

  return { id: releaseId, buildSha, previewKey };
}

export async function recordWorkItemOutcome(input: {
  workItemId: string;
  actor: string;
  metric: string;
  window: string;
}): Promise<{ id: string }> {
  const id = newId();
  await insertOutcome({
    id,
    workItemId: input.workItemId,
    metric: input.metric,
    window: input.window,
    baseline: 0,
    value: 0,
    status: 'pending',
  });
  await appendEvent({
    aggregateType: 'work_item',
    aggregateId: input.workItemId,
    eventType: 'OutcomeRecorded',
    payload: { outcomeId: id, metric: input.metric, window: input.window },
    actor: input.actor,
  });
  return { id };
}

export interface TourFactInspection {
  facts: TourFact[];
  summary: ReturnType<typeof summarizeTourFacts>;
  gate: GateResult;
  evidence: GateEvidenceRecord;
  artifactId: string;
}

export async function inspectTourFacts(input: {
  workItemId: string;
  actor: string;
  requireFreshPrices?: boolean;
  requireSupabase?: boolean;
  allowFallback?: boolean;
}): Promise<TourFactInspection> {
  const facts = await loadTourFacts({
    allowFallback: input.allowFallback,
  });
  const summary = summarizeTourFacts(facts);
  const gate = buildTourFactGate(facts, {
    requireFreshPrices: input.requireFreshPrices,
    requireSupabase: input.requireSupabase,
  });
  const persistence = await persistTourFacts(facts);
  const artifact = await putTextArtifact({
    workItemId: input.workItemId,
    name: 'tour-fact-snapshot.json',
    kind: 'tour_fact_snapshot',
    producer: 'tour-fact@1',
    contentType: 'application/json',
    body: JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        summary,
        persistence,
        gate,
        facts,
      },
      null,
      2,
    ),
  });
  const evidence = await recordGateEvidence({
    workItemId: input.workItemId,
    actor: input.actor,
    result: gate,
    subjectHash: artifact.hash,
    subjectLabel: 'tour-facts',
  });
  await appendEvent({
    aggregateType: 'work_item',
    aggregateId: input.workItemId,
    eventType: 'TourFactsInspected',
    payload: {
      artifactId: artifact.id,
      artifactHash: artifact.hash,
      gatePassed: gate.passed,
      summary,
    },
    actor: input.actor,
  });
  return { facts, summary, gate, evidence, artifactId: artifact.id };
}

export async function inspectTechnicalSeo(input: {
  workItemId: string;
  actor: string;
  url: string;
  expected?: TechnicalSeoExpectations;
}): Promise<{
  gate: GateResult;
  evidence: GateEvidenceRecord;
  artifactId: string;
}> {
  const gate = await runTechnicalSeoGate({
    url: input.url,
    expected: input.expected,
  });
  const subjectHash = sha256(input.url);
  const artifact = await putTextArtifact({
    workItemId: input.workItemId,
    name: `technical-seo-${subjectHash.slice(0, 12)}.json`,
    kind: 'technical_seo_report',
    producer: 'seo-r1@1',
    contentType: 'application/json',
    body: JSON.stringify(
      {
        url: input.url,
        checkedAt: new Date().toISOString(),
        gate,
      },
      null,
      2,
    ),
  });
  const evidence = await recordGateEvidence({
    workItemId: input.workItemId,
    actor: input.actor,
    result: gate,
    subjectHash,
    subjectLabel: input.url,
  });
  await appendEvent({
    aggregateType: 'work_item',
    aggregateId: input.workItemId,
    eventType: 'TechnicalSeoChecked',
    payload: {
      url: input.url,
      artifactId: artifact.id,
      artifactHash: artifact.hash,
      gatePassed: gate.passed,
    },
    actor: input.actor,
  });
  return { gate, evidence, artifactId: artifact.id };
}

export async function collectSeoRadarActivity(input: {
  workItemId: string;
  actor: string;
  limit?: number;
}): Promise<{
  signals: SeoSignal[];
  persistence: { inserted: number; updated: number };
  artifactId: string;
}> {
  const radar = await collectSeoRadar({ limit: input.limit });
  const persistence = await persistSeoSignals(radar.signals);
  const artifact = await putTextArtifact({
    workItemId: input.workItemId,
    name: 'seo-radar.json',
    kind: 'seo_radar',
    producer: 'seo-radar@1',
    contentType: 'application/json',
    body: JSON.stringify({ ...radar, persistence }, null, 2),
  });
  await appendEvent({
    aggregateType: 'work_item',
    aggregateId: input.workItemId,
    eventType: 'SeoRadarCollected',
    payload: {
      artifactId: artifact.id,
      artifactHash: artifact.hash,
      signalCount: radar.signals.length,
      persistence,
    },
    actor: input.actor,
  });
  return { signals: radar.signals, persistence, artifactId: artifact.id };
}

export async function buildSeoPlanActivity(input: {
  workItemId: string;
  actor: string;
  signals: SeoSignal[];
}): Promise<{ plan: SeoPlan; artifactId: string }> {
  const plan = buildSeoPlan(input.signals);
  const artifact = await putTextArtifact({
    workItemId: input.workItemId,
    name: 'seo-plan.json',
    kind: 'seo_plan',
    producer: 'seo-ops@1',
    contentType: 'application/json',
    body: JSON.stringify(plan, null, 2),
  });
  await appendEvent({
    aggregateType: 'work_item',
    aggregateId: input.workItemId,
    eventType: 'SeoPlanBuilt',
    payload: {
      artifactId: artifact.id,
      artifactHash: artifact.hash,
      actionCount: plan.actions.length,
    },
    actor: input.actor,
  });
  return { plan, artifactId: artifact.id };
}

export async function buildTourOpsPlanActivity(input: {
  workItemId: string;
  actor: string;
  facts: TourFact[];
}): Promise<{ plan: TourOpsPlan; artifactId: string }> {
  const plan = buildTourOpsPlan(input.facts);
  const artifact = await putTextArtifact({
    workItemId: input.workItemId,
    name: 'tour-ops-plan.json',
    kind: 'tour_ops_plan',
    producer: 'tour-ops@1',
    contentType: 'application/json',
    body: JSON.stringify(plan, null, 2),
  });
  await appendEvent({
    aggregateType: 'work_item',
    aggregateId: input.workItemId,
    eventType: 'TourOpsPlanBuilt',
    payload: {
      artifactId: artifact.id,
      artifactHash: artifact.hash,
      actionCount: plan.actions.length,
    },
    actor: input.actor,
  });
  return { plan, artifactId: artifact.id };
}

export async function planOutreachActivity(input: {
  workItemId: string;
  actor: string;
  limit?: number;
}): Promise<{
  planned: number;
  skipped: number;
  inserted: number;
  artifactId: string;
}> {
  const prospects = await listProspects({ limit: input.limit ?? 100 });
  const context = await getOutreachContext();
  const plan = planOutreach(prospects, context);
  const persistence = await insertOutreachPlan(plan);
  const artifact = await putTextArtifact({
    workItemId: input.workItemId,
    name: 'outreach-plan.json',
    kind: 'outreach_plan',
    producer: 'outreach@1',
    contentType: 'application/json',
    body: JSON.stringify({ plan, persistence }, null, 2),
  });
  await appendEvent({
    aggregateType: 'work_item',
    aggregateId: input.workItemId,
    eventType: 'OutreachPlanBuilt',
    payload: {
      artifactId: artifact.id,
      artifactHash: artifact.hash,
      planned: plan.planned.length,
      skipped: plan.skipped.length,
      persistence,
    },
    actor: input.actor,
  });
  return {
    planned: plan.planned.length,
    skipped: plan.skipped.length,
    inserted: persistence.inserted,
    artifactId: artifact.id,
  };
}

export async function dispatchOutreachActivity(input: {
  workItemId: string;
  actor: string;
  live: boolean;
  limit?: number;
}): Promise<{
  sent: number;
  dryRun: number;
  failed: number;
  skipped: number;
  artifactId: string;
}> {
  const dispatch = await dispatchDueOutreach({
    live: input.live,
    limit: input.limit,
  });
  const artifact = await putTextArtifact({
    workItemId: input.workItemId,
    name: 'outreach-dispatch.json',
    kind: 'outreach_dispatch',
    producer: 'outreach@1',
    contentType: 'application/json',
    body: JSON.stringify(
      { live: input.live, dispatchedAt: new Date().toISOString(), dispatch },
      null,
      2,
    ),
  });
  await appendEvent({
    aggregateType: 'work_item',
    aggregateId: input.workItemId,
    eventType: 'OutreachDispatched',
    payload: {
      artifactId: artifact.id,
      artifactHash: artifact.hash,
      live: input.live,
      dispatch,
    },
    actor: input.actor,
  });
  return { ...dispatch, artifactId: artifact.id };
}
