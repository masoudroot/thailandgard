import { describe, expect, it } from 'vitest';
import {
  WORKFLOW_VERSION,
  canReserveBudget,
  deterministicStepCost,
  evaluateKillSwitches,
  isStepKeyOfWorkflow,
  isSupportedWorkflowVersion,
  isTickManagedWorkItem,
  isValidStepTransition,
  isValidWorkflowStepKey,
  mayRetryAttempt,
  stepMaxAttempts,
  stepNeedsPublishing,
} from '@/lib/factory/tick/factory-tick';
import {
  canSubmitArtifact,
  isApprovalValidForPublish,
  isValidApprovalDecision,
  isValidWorkItemTransition,
  isValidWorkKey,
  statusAfterApproval,
  statusAfterArtifactSubmitted,
  workItemPublishIdempotencyKey,
} from '@/lib/factory/tick/work-items';
import {
  backoffSeconds,
  isFencingMatch,
  isRedispatchCapReached,
  isValidIdempotencyKey,
  isValidPublicationTransition,
  isVerificationCapReached,
  shouldRedispatch,
  verificationBackoffSeconds,
  verificationBatchNumber,
  verifyPublishedPage,
  verifyPageWithRetries,
} from '@/lib/factory/tick/publish-outbox';
import {
  isPreviouslyPublished,
  isRollbackOfValid,
  isValidRollbackReason,
  validateRollbackRequest,
} from '@/lib/factory/tick/rollback';

describe('R2 tick rules (guide-only)', () => {
  it('supports only guide_content_v1', () => {
    expect(WORKFLOW_VERSION).toBe('guide_content_v1');
    expect(isSupportedWorkflowVersion('guide_content_v1')).toBe(true);
    expect(isSupportedWorkflowVersion('source_shadow_v1')).toBe(false);
    expect(isSupportedWorkflowVersion(null)).toBe(false);
    expect(isSupportedWorkflowVersion('something-else')).toBe(false);
  });

  it('accepts only guide step keys', () => {
    expect(isValidWorkflowStepKey('prepare_context')).toBe(true);
    expect(isValidWorkflowStepKey('publish_version')).toBe(true);
    expect(isValidWorkflowStepKey('complete_work')).toBe(true);
    expect(isValidWorkflowStepKey('fetch_source')).toBe(false);
    expect(isValidWorkflowStepKey('prepare_source')).toBe(false);
    expect(isStepKeyOfWorkflow('publish_version', 'guide_content_v1')).toBe(true);
    expect(isStepKeyOfWorkflow('publish_version', 'source_shadow_v1')).toBe(false);
  });

  it('never auto-claims manual or old work', () => {
    expect(isTickManagedWorkItem('manual', 'guide_content_v1')).toBe(false);
    expect(isTickManagedWorkItem('tick_managed', null)).toBe(false);
    expect(isTickManagedWorkItem('tick_managed', 'guide_content_v1')).toBe(true);
    expect(isTickManagedWorkItem('tick_managed', 'source_shadow_v1')).toBe(false);
  });

  it('caps attempts per step', () => {
    expect(stepMaxAttempts('process_publication')).toBe(10);
    expect(stepMaxAttempts('publish_version')).toBe(5);
    expect(stepMaxAttempts('prepare_context')).toBe(5);
  });

  it('keeps blocked terminal for tick pickup', () => {
    expect(isValidStepTransition('queued', 'claimed')).toBe(true);
    expect(isValidStepTransition('claimed', 'succeeded')).toBe(true);
    expect(isValidStepTransition('claimed', 'queued')).toBe(true);
    expect(isValidStepTransition('blocked', 'queued')).toBe(false);
    expect(isValidStepTransition('succeeded', 'queued')).toBe(false);
    expect(isValidStepTransition('failed', 'claimed')).toBe(false);
  });

  it('evaluates kill switches fail-closed', () => {
    expect(evaluateKillSwitches({}).factoryPaused).toBe(true);
    expect(evaluateKillSwitches({ factory_paused: 'false' }).factoryPaused).toBe(false);
    expect(evaluateKillSwitches({ factory_paused: 'yes' }).factoryPaused).toBe(true);
    expect(evaluateKillSwitches({ factory_paused: 'false', data_publishing_enabled: 'true' }).dataPublishingEnabled).toBe(true);
    expect(evaluateKillSwitches({ factory_paused: 'false', data_publishing_enabled: '1' }).dataPublishingEnabled).toBe(false);
    expect(evaluateKillSwitches({ factory_paused: 'false' }).generationEnabled).toBe(false);
  });

  it('never blind-retries unknown outcomes', () => {
    expect(mayRetryAttempt('failed', 'not_required')).toBe(true);
    expect(mayRetryAttempt('failed', 'retry_allowed')).toBe(true);
    expect(mayRetryAttempt('failed', 'pending')).toBe(false);
    expect(mayRetryAttempt('failed', 'needs_intervention')).toBe(false);
    expect(mayRetryAttempt('outcome_unknown', 'not_required')).toBe(false);
    expect(mayRetryAttempt('timeout', 'retry_allowed')).toBe(false);
    expect(mayRetryAttempt('succeeded', 'not_required')).toBe(false);
  });

  it('keeps deterministic step cost at zero', () => {
    expect(deterministicStepCost('publish_version')).toBe(0);
    expect(canReserveBudget(100, 90, 10)).toBe(true);
    expect(canReserveBudget(100, 90, 11)).toBe(false);
    expect(canReserveBudget(100, 0, -1)).toBe(false);
    expect(stepNeedsPublishing('publish_version')).toBe(true);
    expect(stepNeedsPublishing('validate_artifact')).toBe(false);
  });
});

describe('R2 work item and approval rules', () => {
  it('guards work item transitions', () => {
    expect(isValidWorkItemTransition('queued', 'awaiting_approval')).toBe(true);
    expect(isValidWorkItemTransition('awaiting_approval', 'approved')).toBe(true);
    expect(isValidWorkItemTransition('approved', 'publishing')).toBe(true);
    expect(isValidWorkItemTransition('publishing', 'succeeded')).toBe(true);
    expect(isValidWorkItemTransition('succeeded', 'queued')).toBe(false);
    expect(isValidWorkItemTransition('cancelled', 'drafting')).toBe(false);
    expect(isValidWorkItemTransition('blocked', 'drafting')).toBe(true);
  });

  it('binds approval to the current artifact and hash', () => {
    const base = {
      workItemStatus: 'approved' as const,
      workItemArtifactId: 'art-1',
      approvalArtifactId: 'art-1',
      approvalArtifactHash: 'hash-1',
      artifactHash: 'hash-1',
      approvalDecision: 'approved' as const,
    };
    expect(isApprovalValidForPublish(base)).toBe(true);
    expect(isApprovalValidForPublish({ ...base, workItemStatus: 'awaiting_approval' })).toBe(false);
    expect(isApprovalValidForPublish({ ...base, approvalArtifactId: 'art-2' })).toBe(false);
    expect(isApprovalValidForPublish({ ...base, approvalArtifactHash: 'other' })).toBe(false);
    expect(isApprovalValidForPublish({ ...base, approvalDecision: 'rejected' })).toBe(false);
    expect(isApprovalValidForPublish({ ...base, workItemArtifactId: null })).toBe(false);
  });

  it('resets approval on a new artifact', () => {
    expect(statusAfterArtifactSubmitted()).toBe('awaiting_approval');
    expect(canSubmitArtifact('queued')).toBe(true);
    expect(canSubmitArtifact('approved')).toBe(true);
    expect(canSubmitArtifact('succeeded')).toBe(false);
    expect(canSubmitArtifact('publishing')).toBe(false);
    expect(statusAfterApproval('approved')).toBe('approved');
    expect(statusAfterApproval('rejected')).toBe('blocked');
    expect(isValidApprovalDecision('approved')).toBe(true);
    expect(isValidApprovalDecision('maybe')).toBe(false);
    expect(workItemPublishIdempotencyKey('r2-guide-1')).toBe('mvp01-m4-publish-r2-guide-1');
    expect(isValidWorkKey('r2-guide-1')).toBe(true);
    expect(isValidWorkKey('short')).toBe(false);
  });
});

describe('R2 publication, verification and rollback rules', () => {
  it('verifies a page only on all four signals', () => {
    const base = {
      canonicalPath: '/guide/best-time-to-visit-thailand',
      expectedMarker: 'new first paragraph',
      previousUniqueText: 'old first paragraph',
    };
    const html = '<link rel="canonical" href="/guide/best-time-to-visit-thailand" />new first paragraph';
    expect(verifyPublishedPage({ ...base, httpStatus: 200, html }).ok).toBe(true);
    expect(verifyPublishedPage({ ...base, httpStatus: 404, html }).ok).toBe(false);
    expect(verifyPublishedPage({ ...base, httpStatus: 200, html: 'new first paragraph' }).ok).toBe(false);
    expect(verifyPublishedPage({ ...base, httpStatus: 200, html: `${html} old first paragraph` }).ok).toBe(false);
    expect(verifyPublishedPage({ ...base, previousUniqueText: null, httpStatus: 200, html }).ok).toBe(true);
  });

  it('retries verification and stops at the first fresh read', async () => {
    let calls = 0;
    const result = await verifyPageWithRetries(
      async () => {
        calls += 1;
        return calls < 3
          ? { httpStatus: 200, html: 'stale' }
          : { httpStatus: 200, html: '<link rel="canonical" href="/guide/x" />fresh marker' };
      },
      { canonicalPath: '/guide/x', expectedMarker: 'fresh marker', previousUniqueText: null },
      10,
      0,
    );
    expect(result.result.ok).toBe(true);
    expect(result.attemptsUsed).toBe(3);
  });

  it('caps verification reads and backs off per batch', () => {
    expect(isVerificationCapReached(49)).toBe(false);
    expect(isVerificationCapReached(50)).toBe(true);
    expect(verificationBatchNumber(0)).toBe(1);
    expect(verificationBatchNumber(10)).toBe(1);
    expect(verificationBatchNumber(11)).toBe(2);
    expect(verificationBackoffSeconds(10)).toBe(30);
    expect(verificationBackoffSeconds(11)).toBe(60);
    expect(verificationBackoffSeconds(41)).toBe(300);
    expect(backoffSeconds(1)).toBe(30);
    expect(backoffSeconds(2)).toBe(60);
    expect(backoffSeconds(5)).toBe(300);
    expect(backoffSeconds(9)).toBe(300);
  });

  it('redispatches only across server instances and within cap', () => {
    expect(shouldRedispatch(true, 'a', 'b', 0)).toBe(true);
    expect(shouldRedispatch(true, 'a', 'a', 0)).toBe(false);
    expect(shouldRedispatch(false, 'a', 'b', 0)).toBe(false);
    expect(shouldRedispatch(true, 'a', 'b', 3)).toBe(false);
    expect(isRedispatchCapReached(3)).toBe(true);
    expect(isRedispatchCapReached(2)).toBe(false);
  });

  it('matches fencing only on owner plus token', () => {
    expect(isFencingMatch({ lease_owner: 'tick-executor-1', fencing_token: 7 }, { lease_owner: 'tick-executor-1', fencing_token: 7 })).toBe(true);
    expect(isFencingMatch({ lease_owner: 'other', fencing_token: 7 }, { lease_owner: 'tick-executor-1', fencing_token: 7 })).toBe(false);
    expect(isFencingMatch({ lease_owner: 'tick-executor-1', fencing_token: 8 }, { lease_owner: 'tick-executor-1', fencing_token: 7 })).toBe(false);
  });

  it('guards publication transitions', () => {
    expect(isValidPublicationTransition('pending', 'dispatched')).toBe(true);
    expect(isValidPublicationTransition('dispatched', 'verifying')).toBe(true);
    expect(isValidPublicationTransition('verifying', 'verified')).toBe(true);
    expect(isValidPublicationTransition('verifying', 'verifying')).toBe(true);
    expect(isValidPublicationTransition('verified', 'pending')).toBe(false);
    expect(isValidPublicationTransition('needs_intervention', 'dispatched')).toBe(false);
    expect(isValidIdempotencyKey('mvp01-m4-publish-x')).toBe(true);
    expect(isValidIdempotencyKey('short')).toBe(false);
  });

  it('guards rollback targets and reasons', () => {
    expect(isPreviouslyPublished([{ version_id: 'v1', status: 'verified' }], 'v1')).toBe(true);
    expect(isPreviouslyPublished([{ version_id: 'v1', status: 'pending' }], 'v1')).toBe(false);
    expect(isRollbackOfValid({ id: 'p1', content_id: 'c1', version_id: 'v1', status: 'verified' }, 'c1', 'v1')).toBe(true);
    expect(isRollbackOfValid({ id: 'p1', content_id: 'c1', version_id: 'v1', status: 'verified' }, 'c1', 'v2')).toBe(false);
    expect(isRollbackOfValid(null, 'c1', 'v1')).toBe(false);
    expect(isValidRollbackReason('fix a bad publish')).toBe(true);
    expect(isValidRollbackReason('')).toBe(false);
    expect(isValidRollbackReason('x'.repeat(501))).toBe(false);
    expect(validateRollbackRequest({ target_version_id: 'v1', rollback_of_publication_id: 'p1', idempotency_key: 'r2-rollback-1', reason: 'bad' })).toBe(null);
    expect(validateRollbackRequest({ target_version_id: null, rollback_of_publication_id: 'p1', idempotency_key: 'r2-rollback-1', reason: 'bad' })).toBe('target_version_id is required');
  });
});
