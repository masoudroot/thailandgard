import { describe, expect, it } from 'vitest';
import {
  FORBIDDEN_TOOLS,
  TEAM_CONTRACT_MAP,
  TEAM_CONTRACTS,
  TEAM_KEYS,
  ZERO_SPEND_BUDGET_POLICY,
  type TeamContract,
  type TeamKey,
} from '@/lib/factory/teams/registry';
import {
  canRunAutonomously,
  canTickExecute,
  isProductionActive,
  isToolAllowed,
  isWorkflowBlocked,
  resolveWorkflowStatus,
} from '@/lib/factory/teams/policy';
import { getWorkflow, WORKFLOWS } from '@/lib/factory/teams/workflows';

// Phase 3 foundation invariants.
//
// These tests assert the frozen team contract against the real registry
// data. Nothing here is faked to look green: every assertion reads the
// delivered registry, policy, and workflow modules.
//
// Naming note (THG-UNIFY-01, corrected): the frozen brief named the
// registry export TEAMS, and the delivered registry does export TEAMS
// (alongside TEAM_CONTRACT_MAP and TEAM_CONTRACTS). The dashboard
// display module (site/lib/factory-dashboard/teams.ts) imports that
// real TEAMS export, so there is no integration break here. This file
// pins the frozen display mapping rule (configured + last_run null
// means configured_not_active) over the real registry data.

const EXPECTED_KEYS: readonly TeamKey[] = [
  'product_leader',
  'tour_manager',
  'content',
  'seo',
  'design',
  'development',
];

const KNOWN_WORKFLOWS = new Set([
  'leader_signal_v1',
  'source_shadow_v1',
  'guide_content_v1',
  'seo_proposal_v1',
  'design_proposal_v1',
  'code_change_v1',
]);

const PRIMARY_WORKFLOW: Record<TeamKey, string> = {
  product_leader: 'leader_signal_v1',
  tour_manager: 'source_shadow_v1',
  content: 'guide_content_v1',
  seo: 'seo_proposal_v1',
  design: 'design_proposal_v1',
  development: 'code_change_v1',
};

// Required tools per team, from the frozen phase 3 tool lists. These are
// minimum sets: a team may carry additional harmless tools, but it must
// carry these, and it must carry none of the forbidden tools.
const REQUIRED_TOOLS: Record<TeamKey, string[]> = {
  product_leader: ['read_signals', 'create_work_proposal', 'check_duplicate_work', 'get_budget_status'],
  tour_manager: ['read_source_observation', 'normalize_tour', 'create_tour_change_proposal', 'flag_conflict'],
  content: ['read_evidence', 'create_content_artifact', 'validate_content_schema', 'request_human_approval'],
  seo: ['read_search_signal', 'create_seo_proposal', 'validate_metadata'],
  design: ['read_product_context', 'create_design_proposal', 'run_accessibility_check'],
  development: ['read_code_context', 'create_code_change_proposal', 'run_tests', 'create_branch', 'create_pr'],
};

const WORK_PROPOSAL_FIELDS = [
  'goal',
  'evidence_refs',
  'priority',
  'risk_class',
  'owner_team',
  'acceptance_criteria',
  'budget_limit',
  'dependencies',
  'expiry',
  'dedupe_key',
];

function team(key: TeamKey): TeamContract {
  const contract = TEAM_CONTRACT_MAP[key];
  expect(contract).toBeDefined();
  return contract;
}

function toProductionDisplayStatus(contract: TeamContract): string {
  if (contract.status === 'configured' && contract.last_run === null) {
    return 'configured_not_active';
  }
  return contract.status;
}

describe('phase 3 team registry: six valid contracts', () => {
  it('registers exactly the six frozen team keys, as array and map', () => {
    expect([...TEAM_KEYS].sort()).toEqual([...EXPECTED_KEYS].sort());
    expect(TEAM_CONTRACTS.map((c) => c.team_key).sort()).toEqual([...EXPECTED_KEYS].sort());
    expect(Object.keys(TEAM_CONTRACT_MAP).sort()).toEqual([...EXPECTED_KEYS].sort());
  });

  it.each([...EXPECTED_KEYS])('%s has a complete, well-typed contract', (key) => {
    const contract = team(key);
    expect(contract.team_key).toBe(key);
    expect(contract.display_name.length).toBeGreaterThan(0);
    expect(contract.mission.length).toBeGreaterThan(0);
    expect(contract.status).toBe('configured');
    expect(contract.enabled_environment).toBe('staging');
    expect(contract.last_run).toBeNull();
    expect(contract.last_success).toBeNull();
    expect(contract.blocked_reason).toBeNull();
    expect(contract.workflow_versions.length).toBeGreaterThan(0);
    expect(contract.allowed_tools.length).toBeGreaterThan(0);
    expect(contract.risk_class.length).toBeGreaterThan(0);
    expect(contract.budget_policy).toBe(ZERO_SPEND_BUDGET_POLICY);
    expect(contract.budget_scope.length).toBeGreaterThan(0);
    expect(contract.acceptance_criteria.length).toBeGreaterThan(0);
    expect(contract.escalation_rules.length).toBeGreaterThan(0);
    expect(contract.evaluation_fixtures.length).toBeGreaterThan(0);
    expect(contract.prohibitions.length).toBeGreaterThan(0);
    expect(contract.input_schema.type_name.length).toBeGreaterThan(0);
    expect(contract.input_schema.fields.length).toBeGreaterThan(0);
    expect(contract.output_schema.type_name.length).toBeGreaterThan(0);
    expect(contract.output_schema.fields.length).toBeGreaterThan(0);
  });

  it.each([...EXPECTED_KEYS])('%s carries its required tools', (key) => {
    const tools = team(key).allowed_tools;
    for (const required of REQUIRED_TOOLS[key]) {
      expect(tools).toContain(required);
    }
  });

  it.each([...EXPECTED_KEYS])('%s carries no forbidden tool, and its forbidden list equals the frozen list', (key) => {
    const contract = team(key);
    expect([...contract.forbidden_tools].sort()).toEqual([...FORBIDDEN_TOOLS].sort());
    for (const forbidden of FORBIDDEN_TOOLS) {
      expect(contract.allowed_tools).not.toContain(forbidden);
    }
  });

  it.each([...EXPECTED_KEYS])('%s references only known workflows, including its primary', (key) => {
    const workflows = team(key).workflow_versions;
    expect(workflows).toContain(PRIMARY_WORKFLOW[key]);
    for (const workflow of workflows) {
      expect(KNOWN_WORKFLOWS.has(workflow)).toBe(true);
    }
  });
});

describe('phase 3 output schemas: proposals stay proposals', () => {
  it('leader output schema is WorkProposal with all ten required fields', () => {
    const output = team('product_leader').output_schema;
    expect(output.type_name).toBe('WorkProposal');
    expect(output.fields.filter((f) => f.required).map((f) => f.name).sort()).toEqual(
      [...WORK_PROPOSAL_FIELDS].sort(),
    );
  });

  it('tour output schema keeps the candidate status literal', () => {
    const output = team('tour_manager').output_schema;
    expect(output.type_name).toBe('TourChangeProposal');
    const status = output.fields.find((f) => f.name === 'status');
    expect(status?.type).toBe('candidate');
    expect(status?.required).toBe(true);
  });

  it('content output schema is publish_payload_v1 with an artifact hash', () => {
    const output = team('content').output_schema;
    expect(output.fields.find((f) => f.name === 'schema_version')?.type).toBe('publish_payload_v1');
    expect(output.fields.some((f) => f.name === 'artifact_hash' && f.required)).toBe(true);
  });

  it('seo output schema is a proposal kind, never a fabricated console record', () => {
    const output = team('seo').output_schema;
    expect(output.fields.find((f) => f.name === 'kind')?.type).toBe(
      'SearchOpportunity | SEOChangeProposal',
    );
  });

  it('development output schema requires tests and a rollback plan', () => {
    const output = team('development').output_schema;
    expect(output.fields.some((f) => f.name === 'tests_required' && f.required)).toBe(true);
    expect(output.fields.some((f) => f.name === 'rollback_plan' && f.required)).toBe(true);
  });
});

describe('phase 3 behavioral invariants, enforced by the real policy module', () => {
  it('leader builds proposals, never publishes: policy allows proposal tools and denies publish tools', () => {
    expect(isToolAllowed('product_leader', 'create_work_proposal')).toBe(true);
    expect(isToolAllowed('product_leader', 'publish_direct')).toBe(false);
    expect(isToolAllowed('product_leader', 'change_policy')).toBe(false);
    expect(isToolAllowed('product_leader', 'increase_budget')).toBe(false);
  });

  it('tour manager keeps candidates as proposals: no publish tool of any name is allowed', () => {
    const tools = team('tour_manager').allowed_tools;
    expect(tools).toContain('create_tour_change_proposal');
    expect(tools.some((tool) => tool.startsWith('publish'))).toBe(false);
    expect(isToolAllowed('tour_manager', 'publish_direct')).toBe(false);
  });

  it('content cannot publish without approval: artifact plus approval request, no direct publish', () => {
    expect(isToolAllowed('content', 'create_content_artifact')).toBe(true);
    expect(isToolAllowed('content', 'request_human_approval')).toBe(true);
    expect(isToolAllowed('content', 'publish_direct')).toBe(false);
  });

  it('seo cannot fabricate data: proposals pass metadata validation, no direct publish', () => {
    expect(isToolAllowed('seo', 'create_seo_proposal')).toBe(true);
    expect(isToolAllowed('seo', 'validate_metadata')).toBe(true);
    expect(isToolAllowed('seo', 'publish_direct')).toBe(false);
  });

  it('design never touches main directly: no branch, pr, migration, sql, or shell tool is allowed', () => {
    for (const banned of ['create_branch', 'create_pr', 'production_migration', 'raw_sql', 'arbitrary_shell']) {
      expect(isToolAllowed('design', banned)).toBe(false);
    }
  });

  it('development cannot create a pr without tests: the workflow runs tests before the pr step', () => {
    expect(isToolAllowed('development', 'run_tests')).toBe(true);
    expect(isToolAllowed('development', 'create_pr')).toBe(true);
    const workflow = getWorkflow('code_change_v1');
    expect(workflow).not.toBeNull();
    const stepKeys = (workflow?.steps ?? []).map((s) => s.step_key);
    expect(stepKeys.indexOf('run_tests')).toBeGreaterThan(-1);
    expect(stepKeys.indexOf('create_pr')).toBeGreaterThan(-1);
    expect(stepKeys.indexOf('run_tests')).toBeLessThan(stepKeys.indexOf('create_pr'));
  });

  it('manual teams are not executed by Tick: the policy denies every manual execution', () => {
    for (const key of EXPECTED_KEYS) {
      const decision = canTickExecute('manual', team(key).workflow_versions[0]);
      expect(decision.allowed).toBe(false);
    }
    expect(canTickExecute('tick_managed', 'guide_content_v1').allowed).toBe(true);
    expect(canTickExecute('tick_managed', 'leader_signal_v1').allowed).toBe(false);
    expect(canTickExecute('tick_managed', 'source_shadow_v1').allowed).toBe(false);
  });

  it('unknown workflows are blocked: lookup returns null and the policy reports blocked', () => {
    expect(getWorkflow('no_such_workflow_v9')).toBeNull();
    expect(isWorkflowBlocked('no_such_workflow_v9')).toBe(true);
    expect(resolveWorkflowStatus('no_such_workflow_v9')).toBe('blocked');
  });

  it('every workflow definition has a human gate and a rollback path', () => {
    expect(WORKFLOWS.map((w) => w.workflow_version).sort()).toEqual([...KNOWN_WORKFLOWS].sort());
    for (const workflow of WORKFLOWS) {
      expect(workflow.requires_approval).toBe(true);
      expect(workflow.rollback_path.length).toBeGreaterThan(0);
      expect(workflow.steps.length).toBeGreaterThan(0);
    }
  });

  it('content workflow keeps its human approval step before any effect', () => {
    const workflow = getWorkflow('guide_content_v1');
    expect(workflow?.steps.some((s) => s.step_key === 'human_approval' && s.requires_approval)).toBe(true);
  });
});

describe('phase 3 production safety invariants', () => {
  it.each([...EXPECTED_KEYS])('%s stays configured_not_active in production', (key) => {
    expect(toProductionDisplayStatus(team(key))).toBe('configured_not_active');
  });

  it.each([...EXPECTED_KEYS])('%s is never enabled for the production environment', (key) => {
    expect(team(key).enabled_environment).not.toBe('production');
    expect(isProductionActive(team(key))).toBe(false);
  });

  it.each([...EXPECTED_KEYS])('%s cannot run autonomously', (key) => {
    expect(canRunAutonomously(team(key)).allowed).toBe(false);
  });

  it.each([...EXPECTED_KEYS])('%s cannot migrate production or call a provider directly', (key) => {
    expect(isToolAllowed(key, 'production_migration')).toBe(false);
    const tools = team(key).allowed_tools;
    expect(tools.some((tool) => /provider|reformboss|model_call|llm_call/i.test(tool))).toBe(false);
    expect(team(key).budget_policy).toBe(ZERO_SPEND_BUDGET_POLICY);
  });

  it('no team carries a direct publish path, so no production publication can originate here', () => {
    for (const key of EXPECTED_KEYS) {
      expect(isToolAllowed(key, 'publish_direct')).toBe(false);
    }
  });
});
