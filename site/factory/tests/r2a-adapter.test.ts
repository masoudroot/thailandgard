import { describe, expect, it } from 'vitest';
import {
  ADAPTER_CONTRACT_VERSION,
  R2A1_SCOPE_CUTOFF,
  adaptMainEnvelope,
  adaptStepForTick,
  adaptWorkItemForTick,
} from '@/lib/factory/tick/adapter';

const VALID_MAIN_ENVELOPE = {
  id: '11111111-1111-4111-8111-111111111111',
  domain: 'content',
  ownerRole: 'content',
  title: 'راهنمای تایلند',
  risk: 'R0',
  status: 'planned',
  playbookVersion: 'content@1',
  policyVersion: 'policy@1',
  kpiTarget: 'انتشار راهنما',
  outcomeWindow: '7d',
  budget: { tokens: 100, costUsd: 0, wallClockMinutes: 60 },
  createdAt: '2026-10-30T10:00:00.000Z',
  updatedAt: '2026-10-30T10:00:00.000Z',
};

const AFTER_CUTOFF = '2026-10-30T16:00:00Z';
const BEFORE_CUTOFF = '2026-10-30T12:00:00Z';

describe('R2-A adapter contract', () => {
  it('names its contract version', () => {
    expect(ADAPTER_CONTRACT_VERSION).toBe('r3c-1');
    expect(R2A1_SCOPE_CUTOFF).toBe('2026-10-30T15:44:00Z');
  });

  it('admits the R3C gateway workflow and only its own steps', () => {
    expect(
      adaptWorkItemForTick({
        execution_mode: 'tick_managed',
        workflow_version: 'guide_content_gateway_v1',
        created_at: AFTER_CUTOFF,
      }),
    ).toBe('eligible');
    expect(adaptStepForTick('prepare_context', 'guide_content_gateway_v1')).toBe('eligible');
    expect(adaptStepForTick('generate_draft_mock', 'guide_content_gateway_v1')).toBe('eligible');
    expect(adaptStepForTick('validate_artifact', 'guide_content_gateway_v1')).toBe('eligible');
    expect(adaptStepForTick('await_human_approval', 'guide_content_gateway_v1')).toBe('eligible');
    // قدم‌های مسیر رسمی، در Workflow آزمایشی اجرا نمی‌شوند و برعکس.
    expect(adaptStepForTick('create_artifact', 'guide_content_gateway_v1')).toBe('step_not_in_workflow');
    expect(adaptStepForTick('publish_version', 'guide_content_gateway_v1')).toBe('step_not_in_workflow');
    expect(adaptStepForTick('generate_draft_mock', 'guide_content_v1')).toBe('step_not_in_workflow');
  });

  it('admits only tick_managed guide_content_v1 work items created after the cutoff', () => {
    expect(
      adaptWorkItemForTick({
        execution_mode: 'tick_managed',
        workflow_version: 'guide_content_v1',
        created_at: AFTER_CUTOFF,
      }),
    ).toBe('eligible');
    expect(
      adaptWorkItemForTick({
        execution_mode: 'tick_managed',
        workflow_version: 'guide_content_v1',
        created_at: R2A1_SCOPE_CUTOFF,
      }),
    ).toBe('eligible');
  });

  it('never claims manual or legacy work items', () => {
    expect(
      adaptWorkItemForTick({
        execution_mode: 'manual',
        workflow_version: 'guide_content_v1',
        created_at: AFTER_CUTOFF,
      }),
    ).toBe('manual_or_legacy');
    expect(
      adaptWorkItemForTick({ execution_mode: null, workflow_version: null, created_at: AFTER_CUTOFF }),
    ).toBe('manual_or_legacy');
    expect(
      adaptWorkItemForTick({
        execution_mode: undefined,
        workflow_version: undefined,
        created_at: AFTER_CUTOFF,
      }),
    ).toBe('manual_or_legacy');
  });

  it('rejects tick_managed items with an unknown workflow as unsupported, not eligible', () => {
    expect(
      adaptWorkItemForTick({
        execution_mode: 'tick_managed',
        workflow_version: 'bogus_v9',
        created_at: AFTER_CUTOFF,
      }),
    ).toBe('unsupported_workflow');
    expect(
      adaptWorkItemForTick({
        execution_mode: 'tick_managed',
        workflow_version: null,
        created_at: AFTER_CUTOFF,
      }),
    ).toBe('unsupported_workflow');
  });

  it('defers shadow work silently, never claiming or blocking it', () => {
    expect(
      adaptWorkItemForTick({
        execution_mode: 'tick_managed',
        workflow_version: 'source_shadow_v1',
        created_at: AFTER_CUTOFF,
      }),
    ).toBe('deferred');
    expect(
      adaptWorkItemForTick({
        execution_mode: 'manual',
        workflow_version: 'source_shadow_v1',
        created_at: AFTER_CUTOFF,
      }),
    ).toBe('deferred');
    expect(
      adaptWorkItemForTick({
        execution_mode: 'tick_managed',
        workflow_version: 'source_shadow_v1',
        created_at: BEFORE_CUTOFF,
      }),
    ).toBe('deferred');
  });

  it('silently skips pre-cutoff work items, whatever their mode or workflow', () => {
    expect(
      adaptWorkItemForTick({
        execution_mode: 'tick_managed',
        workflow_version: 'guide_content_v1',
        created_at: BEFORE_CUTOFF,
      }),
    ).toBe('out_of_scope');
    expect(
      adaptWorkItemForTick({
        execution_mode: 'tick_managed',
        workflow_version: 'bogus_v9',
        created_at: BEFORE_CUTOFF,
      }),
    ).toBe('out_of_scope');
    expect(
      adaptWorkItemForTick({
        execution_mode: 'manual',
        workflow_version: 'guide_content_v1',
        created_at: BEFORE_CUTOFF,
      }),
    ).toBe('out_of_scope');
  });

  it('fail-closes on a missing or invalid created_at', () => {
    expect(
      adaptWorkItemForTick({
        execution_mode: 'tick_managed',
        workflow_version: 'guide_content_v1',
        created_at: null,
      }),
    ).toBe('out_of_scope');
    expect(
      adaptWorkItemForTick({
        execution_mode: 'tick_managed',
        workflow_version: 'guide_content_v1',
        created_at: undefined,
      }),
    ).toBe('out_of_scope');
    expect(
      adaptWorkItemForTick({
        execution_mode: 'tick_managed',
        workflow_version: 'guide_content_v1',
        created_at: 'not-a-date',
      }),
    ).toBe('out_of_scope');
  });

  it('admits only guide steps of the guide workflow', () => {
    expect(adaptStepForTick('prepare_context', 'guide_content_v1')).toBe('eligible');
    expect(adaptStepForTick('process_publication', 'guide_content_v1')).toBe('eligible');
    expect(adaptStepForTick('complete_work', 'guide_content_v1')).toBe('eligible');
  });

  it('rejects unknown step keys', () => {
    expect(adaptStepForTick('fetch_source', 'guide_content_v1')).toBe('unknown_step');
    expect(adaptStepForTick('', 'guide_content_v1')).toBe('unknown_step');
  });

  it('rejects guide steps under a different workflow', () => {
    expect(adaptStepForTick('prepare_context', 'source_shadow_v1')).toBe('step_not_in_workflow');
    expect(adaptStepForTick('prepare_context', 'bogus_v9')).toBe('step_not_in_workflow');
    expect(adaptStepForTick('prepare_context', null)).toBe('step_not_in_workflow');
  });

  it('accepts a missing main envelope and validates a present one', () => {
    expect(adaptMainEnvelope(null).valid).toBe(true);
    expect(adaptMainEnvelope(undefined).valid).toBe(true);
    expect(adaptMainEnvelope(VALID_MAIN_ENVELOPE).valid).toBe(true);
  });

  it('fail-closes on an invalid main envelope', () => {
    expect(adaptMainEnvelope({ ...VALID_MAIN_ENVELOPE, domain: 'nope' }).valid).toBe(false);
    expect(adaptMainEnvelope({ ...VALID_MAIN_ENVELOPE, status: 'nope' }).valid).toBe(false);
    expect(adaptMainEnvelope({ ...VALID_MAIN_ENVELOPE, title: 'ab' }).valid).toBe(false);
    expect(adaptMainEnvelope('not-an-object').valid).toBe(false);
    expect(adaptMainEnvelope(42).valid).toBe(false);
  });
});
