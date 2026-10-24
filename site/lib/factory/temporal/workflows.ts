import { log, proxyActivities } from '@temporalio/workflow';
import type { ContentBrief } from '../content/contracts';
import type { TechnicalSeoExpectations } from '../gates/technical-seo';
import type * as activities from './activities';

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
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '2 minutes',
  retry: {
    maximumAttempts: 3,
    initialInterval: '1 second',
    backoffCoefficient: 2,
  },
});

export interface WorkItemWorkflowInput {
  workItemId: string;
  actor: string;
  mode?: 'approval' | 'walking_skeleton';
  contentBrief?: ContentBrief;
}

export interface WorkItemWorkflowResult {
  status: 'awaiting_approval' | 'done' | 'blocked';
  releaseId?: string;
  outcomeId?: string;
  reasons?: string[];
}

export async function workItemWorkflow(
  input: WorkItemWorkflowInput,
): Promise<WorkItemWorkflowResult> {
  const item = await loadWorkItem(input);
  await markWorkItemRunning(input);

  if (input.mode !== 'walking_skeleton') {
    await markWorkItemAwaitingApproval(input);
    return { status: 'awaiting_approval' };
  }

  if (!input.contentBrief) {
    throw new Error('CONTENT_BRIEF_REQUIRED');
  }

  const generated = await generateContentDraft({
    ...input,
    contentBrief: input.contentBrief,
  });
  const gateRun = await runContentGates({
    workItemId: input.workItemId,
    actor: input.actor,
    draft: generated.draft,
  });
  const policy = await evaluateWorkItemPolicy({
    risk: item.risk,
    gates: gateRun.results,
  });

  if (!policy.allowed) {
    await markWorkItemBlocked(input);
    return { status: 'blocked', reasons: policy.reasons };
  }

  if (!policy.autoRelease) {
    await markWorkItemAwaitingApproval(input);
    return { status: 'awaiting_approval' };
  }

  await markWorkItemVerifying(input);
  await markWorkItemReleasing(input);
  const release = await releaseDryRun({
    workItemId: input.workItemId,
    actor: input.actor,
    risk: item.risk,
    draft: generated.draft,
    gates: gateRun.evidence,
    policyVersion: policy.policyVersion,
  });
  await markWorkItemProductionVerified(input);
  const outcome = await recordWorkItemOutcome({
    workItemId: input.workItemId,
    actor: input.actor,
    metric: item.kpiTarget,
    window: item.outcomeWindow,
  });
  await markWorkItemDone(input);

  log.info('walking skeleton completed', {
    workItemId: input.workItemId,
    releaseId: release.id,
  });
  return { status: 'done', releaseId: release.id, outcomeId: outcome.id };
}

export interface SeoOpsWorkflowInput {
  workItemId: string;
  actor: string;
  limit?: number;
  previewUrl?: string;
  expectedSeo?: TechnicalSeoExpectations;
}

export interface SeoOpsWorkflowResult {
  status: 'awaiting_approval' | 'blocked';
  signalCount: number;
  planArtifactId: string;
  reasons?: string[];
}

export async function seoOpsWorkflow(
  input: SeoOpsWorkflowInput,
): Promise<SeoOpsWorkflowResult> {
  const item = await loadWorkItem(input);
  await markWorkItemRunning(input);

  const radar = await collectSeoRadarActivity({
    workItemId: input.workItemId,
    actor: input.actor,
    limit: input.limit,
  });
  const plan = await buildSeoPlanActivity({
    workItemId: input.workItemId,
    actor: input.actor,
    signals: radar.signals,
  });

  if (input.previewUrl) {
    const seo = await inspectTechnicalSeo({
      workItemId: input.workItemId,
      actor: input.actor,
      url: input.previewUrl,
      expected: input.expectedSeo,
    });
    if (!seo.gate.passed) {
      const reasons = seo.gate.checks
        .filter((check) => !check.passed)
        .map((check) => `${check.id}: ${check.detail}`);
      await markWorkItemBlocked(input);
      return {
        status: 'blocked',
        signalCount: radar.signals.length,
        planArtifactId: plan.artifactId,
        reasons,
      };
    }
  }

  await markWorkItemAwaitingApproval(input);
  log.info('SEO ops plan ready', {
    workItemId: input.workItemId,
    risk: item.risk,
    signalCount: radar.signals.length,
  });
  return {
    status: 'awaiting_approval',
    signalCount: radar.signals.length,
    planArtifactId: plan.artifactId,
  };
}

export interface TourOpsWorkflowInput {
  workItemId: string;
  actor: string;
  requireFreshPrices?: boolean;
  requireSupabase?: boolean;
  allowFallback?: boolean;
}

export interface TourOpsWorkflowResult {
  status: 'awaiting_approval' | 'blocked';
  planArtifactId: string;
  reasons?: string[];
}

export async function tourOpsWorkflow(
  input: TourOpsWorkflowInput,
): Promise<TourOpsWorkflowResult> {
  await loadWorkItem(input);
  await markWorkItemRunning(input);

  const inspection = await inspectTourFacts({
    workItemId: input.workItemId,
    actor: input.actor,
    requireFreshPrices: input.requireFreshPrices ?? true,
    requireSupabase: input.requireSupabase ?? true,
    allowFallback: input.allowFallback,
  });
  const plan = await buildTourOpsPlanActivity({
    workItemId: input.workItemId,
    actor: input.actor,
    facts: inspection.facts,
  });

  if (!inspection.gate.passed) {
    const reasons = inspection.gate.checks
      .filter((check) => !check.passed)
      .map((check) => `${check.id}: ${check.detail}`);
    await markWorkItemBlocked(input);
    return {
      status: 'blocked',
      planArtifactId: plan.artifactId,
      reasons,
    };
  }

  await markWorkItemAwaitingApproval(input);
  log.info('tour ops plan ready', {
    workItemId: input.workItemId,
    tours: inspection.facts.length,
  });
  return {
    status: 'awaiting_approval',
    planArtifactId: plan.artifactId,
  };
}

export interface OutreachWorkflowInput {
  workItemId: string;
  actor: string;
  limit?: number;
  dryRunDispatch?: boolean;
}

export interface OutreachWorkflowResult {
  status: 'awaiting_approval' | 'done';
  planned: number;
  skipped: number;
  dispatched?: { sent: number; dryRun: number; failed: number; skipped: number };
}

export async function outreachWorkflow(
  input: OutreachWorkflowInput,
): Promise<OutreachWorkflowResult> {
  await loadWorkItem(input);
  await markWorkItemRunning(input);

  const plan = await planOutreachActivity({
    workItemId: input.workItemId,
    actor: input.actor,
    limit: input.limit,
  });

  let dispatched: OutreachWorkflowResult['dispatched'];
  if (input.dryRunDispatch) {
    dispatched = await dispatchOutreachActivity({
      workItemId: input.workItemId,
      actor: input.actor,
      live: false,
      limit: input.limit,
    });
  }

  await markWorkItemAwaitingApproval(input);
  log.info('outreach plan ready', {
    workItemId: input.workItemId,
    planned: plan.planned,
    skipped: plan.skipped,
  });
  return {
    status: 'awaiting_approval',
    planned: plan.planned,
    skipped: plan.skipped,
    dispatched,
  };
}
