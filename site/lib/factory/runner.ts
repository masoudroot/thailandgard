// In-process runtime for factory WorkItems.
//
// This module replaces the Temporal workflows that used to orchestrate the
// factory activities (see docs/factory-v2/ARCHITECTURE.md, ADR-011: GitHub
// Actions is the execution runtime). Runs execute synchronously in whatever
// process hosts them: local scripts, CI, or a GitHub Actions job.
//
// Retry behavior mirrors the former Temporal policy: three attempts with
// exponential backoff, except for failures marked non-retryable (see
// `nonRetryable` in ./activities).

import * as activities from './activities';
import type { ContentBrief } from './content/contracts';
import type { TechnicalSeoExpectations } from './gates/technical-seo';

const {
  loadWorkItem,
  markWorkItemRunning,
  markWorkItemAwaitingApproval,
  markWorkItemVerifying,
  markWorkItemReleasing,
  markWorkItemProductionVerified,
  markWorkItemDone,
  markWorkItemBlocked,
  generateContentDraft,
  runContentGates,
  evaluateWorkItemPolicy,
  releaseDryRun,
  recordWorkItemOutcome,
  inspectTourFacts,
  inspectTechnicalSeo,
  collectSeoRadarActivity,
  buildSeoPlanActivity,
  buildTourOpsPlanActivity,
  planOutreachActivity,
  dispatchOutreachActivity,
} = activities;

export interface WorkItemRunInput {
  workItemId: string;
  actor: string;
  mode?: 'approval' | 'walking_skeleton';
  contentBrief?: ContentBrief;
}

export interface WorkItemRunResult {
  status: 'awaiting_approval' | 'done' | 'blocked';
  releaseId?: string;
  outcomeId?: string;
  reasons?: string[];
}

export interface SeoOpsRunInput {
  workItemId: string;
  actor: string;
  limit?: number;
  previewUrl?: string;
  expectedSeo?: TechnicalSeoExpectations;
}

export interface SeoOpsRunResult {
  status: 'awaiting_approval' | 'blocked';
  signalCount: number;
  planArtifactId: string;
  reasons?: string[];
}

export interface TourOpsRunInput {
  workItemId: string;
  actor: string;
  requireFreshPrices?: boolean;
  requireSupabase?: boolean;
  allowFallback?: boolean;
}

export interface TourOpsRunResult {
  status: 'awaiting_approval' | 'blocked';
  planArtifactId: string;
  reasons?: string[];
}

export interface OutreachRunInput {
  workItemId: string;
  actor: string;
  limit?: number;
  dryRunDispatch?: boolean;
}

export interface OutreachRunResult {
  status: 'awaiting_approval' | 'done';
  planned: number;
  skipped: number;
  dispatched?: { sent: number; dryRun: number; failed: number; skipped: number };
}

const RETRY = {
  maximumAttempts: 3,
  initialDelayMs: 1_000,
  backoffCoefficient: 2,
};

function isNonRetryable(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { nonRetryable?: unknown }).nonRetryable === true
  );
}

async function withRetry<T>(run: () => Promise<T>): Promise<T> {
  let delayMs = RETRY.initialDelayMs;
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      if (attempt >= RETRY.maximumAttempts || isNonRetryable(error)) throw error;
      console.warn(
        `[factory:runner] attempt ${attempt}/${RETRY.maximumAttempts} failed, retrying in ${delayMs}ms:`,
        error instanceof Error ? error.message : String(error),
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      delayMs *= RETRY.backoffCoefficient;
    }
  }
}

const step = withRetry;

export async function runWorkItem(
  input: WorkItemRunInput,
): Promise<WorkItemRunResult> {
  const item = await step(() => loadWorkItem(input));
  await step(() => markWorkItemRunning(input));

  if (input.mode !== 'walking_skeleton') {
    await step(() => markWorkItemAwaitingApproval(input));
    return { status: 'awaiting_approval' };
  }

  const contentBrief = input.contentBrief;
  if (!contentBrief) {
    throw new Error('CONTENT_BRIEF_REQUIRED');
  }

  const generated = await step(() =>
    generateContentDraft({ ...input, contentBrief }),
  );
  const gateRun = await step(() =>
    runContentGates({
      workItemId: input.workItemId,
      actor: input.actor,
      draft: generated.draft,
    }),
  );
  const policy = await step(() =>
    evaluateWorkItemPolicy({
      risk: item.risk,
      gates: gateRun.results,
    }),
  );

  if (!policy.allowed) {
    await step(() => markWorkItemBlocked(input));
    return { status: 'blocked', reasons: policy.reasons };
  }

  if (!policy.autoRelease) {
    await step(() => markWorkItemAwaitingApproval(input));
    return { status: 'awaiting_approval' };
  }

  await step(() => markWorkItemVerifying(input));
  await step(() => markWorkItemReleasing(input));
  const release = await step(() =>
    releaseDryRun({
      workItemId: input.workItemId,
      actor: input.actor,
      risk: item.risk,
      draft: generated.draft,
      gates: gateRun.evidence,
      policyVersion: policy.policyVersion,
    }),
  );
  await step(() => markWorkItemProductionVerified(input));
  const outcome = await step(() =>
    recordWorkItemOutcome({
      workItemId: input.workItemId,
      actor: input.actor,
      metric: item.kpiTarget,
      window: item.outcomeWindow,
    }),
  );
  await step(() => markWorkItemDone(input));

  console.log(
    `[factory:runner] walking skeleton completed workItemId=${input.workItemId} releaseId=${release.id}`,
  );
  return { status: 'done', releaseId: release.id, outcomeId: outcome.id };
}

export async function runSeoOps(input: SeoOpsRunInput): Promise<SeoOpsRunResult> {
  const item = await step(() => loadWorkItem(input));
  await step(() => markWorkItemRunning(input));

  const radar = await step(() =>
    collectSeoRadarActivity({
      workItemId: input.workItemId,
      actor: input.actor,
      limit: input.limit,
    }),
  );
  const plan = await step(() =>
    buildSeoPlanActivity({
      workItemId: input.workItemId,
      actor: input.actor,
      signals: radar.signals,
    }),
  );

  const previewUrl = input.previewUrl;
  if (previewUrl) {
    const expectedSeo = input.expectedSeo;
    const seo = await step(() =>
      inspectTechnicalSeo({
        workItemId: input.workItemId,
        actor: input.actor,
        url: previewUrl,
        expected: expectedSeo,
      }),
    );
    if (!seo.gate.passed) {
      const reasons = seo.gate.checks
        .filter((check) => !check.passed)
        .map((check) => `${check.id}: ${check.detail}`);
      await step(() => markWorkItemBlocked(input));
      return {
        status: 'blocked',
        signalCount: radar.signals.length,
        planArtifactId: plan.artifactId,
        reasons,
      };
    }
  }

  await step(() => markWorkItemAwaitingApproval(input));
  console.log(
    `[factory:runner] SEO ops plan ready workItemId=${input.workItemId} risk=${item.risk} signalCount=${radar.signals.length}`,
  );
  return {
    status: 'awaiting_approval',
    signalCount: radar.signals.length,
    planArtifactId: plan.artifactId,
  };
}

export async function runTourOps(
  input: TourOpsRunInput,
): Promise<TourOpsRunResult> {
  await step(() => loadWorkItem(input));
  await step(() => markWorkItemRunning(input));

  const inspection = await step(() =>
    inspectTourFacts({
      workItemId: input.workItemId,
      actor: input.actor,
      requireFreshPrices: input.requireFreshPrices ?? true,
      requireSupabase: input.requireSupabase ?? true,
      allowFallback: input.allowFallback,
    }),
  );
  const plan = await step(() =>
    buildTourOpsPlanActivity({
      workItemId: input.workItemId,
      actor: input.actor,
      facts: inspection.facts,
    }),
  );

  if (!inspection.gate.passed) {
    const reasons = inspection.gate.checks
      .filter((check) => !check.passed)
      .map((check) => `${check.id}: ${check.detail}`);
    await step(() => markWorkItemBlocked(input));
    return {
      status: 'blocked',
      planArtifactId: plan.artifactId,
      reasons,
    };
  }

  await step(() => markWorkItemAwaitingApproval(input));
  console.log(
    `[factory:runner] tour ops plan ready workItemId=${input.workItemId} tours=${inspection.facts.length}`,
  );
  return {
    status: 'awaiting_approval',
    planArtifactId: plan.artifactId,
  };
}

export async function runOutreach(
  input: OutreachRunInput,
): Promise<OutreachRunResult> {
  await step(() => loadWorkItem(input));
  await step(() => markWorkItemRunning(input));

  const plan = await step(() =>
    planOutreachActivity({
      workItemId: input.workItemId,
      actor: input.actor,
      limit: input.limit,
    }),
  );

  let dispatched: OutreachRunResult['dispatched'];
  if (input.dryRunDispatch) {
    dispatched = await step(() =>
      dispatchOutreachActivity({
        workItemId: input.workItemId,
        actor: input.actor,
        live: false,
        limit: input.limit,
      }),
    );
  }

  await step(() => markWorkItemAwaitingApproval(input));
  console.log(
    `[factory:runner] outreach plan ready workItemId=${input.workItemId} planned=${plan.planned} skipped=${plan.skipped}`,
  );
  return {
    status: 'awaiting_approval',
    planned: plan.planned,
    skipped: plan.skipped,
    dispatched,
  };
}