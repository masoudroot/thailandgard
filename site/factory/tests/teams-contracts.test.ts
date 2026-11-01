/**
 * تست‌های خالص قرارداد شش تیم فاز ۳: اعتبار قراردادها، رد ابزار
 * ممنوع، مسدود بودن Workflow ناشناخته، اجرا نشدن تیم manual توسط
 * Tick و غیرفعال بودن همهٔ تیم‌ها در Production. بدون دیتابیس.
 */
import { describe, expect, it } from "vitest";
import {
  FORBIDDEN_TOOLS,
  TEAM_CONTRACTS,
  TEAM_CONTRACT_MAP,
  type TeamKey,
} from "../../lib/factory/teams/registry";
import { WORKFLOWS, WORKFLOW_MAP } from "../../lib/factory/teams/workflows";
import {
  canRunAutonomously,
  canTickExecute,
  checkToolAccess,
  isProductionActive,
  isToolAllowed,
  isWorkflowBlocked,
  resolveWorkflowStatus,
} from "../../lib/factory/teams/policy";

const EXPECTED_TEAMS: { key: TeamKey; display: string; tools: string[]; workflow: string }[] = [
  {
    key: "product_leader",
    display: "PRODUCT-LEADER",
    tools: ["read_signals", "create_work_proposal", "check_duplicate_work", "get_budget_status"],
    workflow: "leader_signal_v1",
  },
  {
    key: "tour_manager",
    display: "TOUR-MANAGER",
    tools: ["read_source_observation", "normalize_tour", "create_tour_change_proposal", "flag_conflict"],
    workflow: "source_shadow_v1",
  },
  {
    key: "content",
    display: "CONTENT",
    tools: ["read_evidence", "create_content_artifact", "validate_content_schema", "request_human_approval"],
    workflow: "guide_content_v1",
  },
  {
    key: "seo",
    display: "SEO",
    tools: ["read_search_signal", "create_seo_proposal", "validate_metadata"],
    workflow: "seo_proposal_v1",
  },
  {
    key: "design",
    display: "DESIGN",
    tools: ["read_product_context", "create_design_proposal", "run_accessibility_check"],
    workflow: "design_proposal_v1",
  },
  {
    key: "development",
    display: "DEVELOPMENT",
    tools: ["read_code_context", "create_code_change_proposal", "run_tests", "create_branch", "create_pr"],
    workflow: "code_change_v1",
  },
];

const EXPECTED_FORBIDDEN = [
  "raw_sql",
  "arbitrary_shell",
  "publish_direct",
  "change_policy",
  "increase_budget",
  "read_secret",
  "production_migration",
];

describe("team contracts", () => {
  it("has exactly the six frozen teams with the frozen initial state", () => {
    expect(TEAM_CONTRACTS.map((c) => c.team_key)).toEqual(EXPECTED_TEAMS.map((t) => t.key));
    for (const t of EXPECTED_TEAMS) {
      const c = TEAM_CONTRACT_MAP[t.key];
      expect(c.display_name).toBe(t.display);
      expect(c.status).toBe("configured");
      expect(c.enabled_environment).toBe("staging");
      expect(c.last_run).toBeNull();
      expect(c.last_success).toBeNull();
      expect(c.blocked_reason).toBeNull();
      expect(c.mission.length).toBeGreaterThan(0);
      expect(c.workflow_versions).toEqual([t.workflow]);
      expect(c.allowed_tools).toEqual(t.tools);
      expect(c.forbidden_tools).toEqual(EXPECTED_FORBIDDEN);
      expect(c.budget_policy.length).toBeGreaterThan(0);
      expect(c.budget_scope.length).toBeGreaterThan(0);
      expect(c.acceptance_criteria.length).toBeGreaterThan(0);
      expect(c.escalation_rules.length).toBeGreaterThan(0);
      expect(c.evaluation_fixtures.length).toBeGreaterThan(0);
      expect(c.prohibitions.length).toBeGreaterThan(0);
      expect(c.input_schema.type_name.length).toBeGreaterThan(0);
      expect(c.input_schema.fields.length).toBeGreaterThan(0);
      expect(c.output_schema.type_name.length).toBeGreaterThan(0);
      expect(c.output_schema.fields.length).toBeGreaterThan(0);
    }
  });

  it("keeps allowed and forbidden tools disjoint for every team", () => {
    expect([...FORBIDDEN_TOOLS].sort()).toEqual([...EXPECTED_FORBIDDEN].sort());
    for (const c of TEAM_CONTRACTS) {
      for (const tool of c.allowed_tools) {
        expect(c.forbidden_tools).not.toContain(tool);
      }
    }
  });

  it("rejects every forbidden tool for every team", () => {
    for (const c of TEAM_CONTRACTS) {
      for (const tool of EXPECTED_FORBIDDEN) {
        expect(isToolAllowed(c.team_key, tool)).toBe(false);
        expect(checkToolAccess(c.team_key, tool).allowed).toBe(false);
      }
    }
  });

  it("allows only the frozen allowed tools per team", () => {
    for (const t of EXPECTED_TEAMS) {
      for (const tool of t.tools) {
        expect(isToolAllowed(t.key, tool)).toBe(true);
      }
      expect(isToolAllowed(t.key, "read_secret")).toBe(false);
      expect(isToolAllowed(t.key, "publish_direct")).toBe(false);
      expect(isToolAllowed(t.key, "some_unknown_tool")).toBe(false);
    }
  });

  it("records the per-team prohibitions", () => {
    expect(TEAM_CONTRACT_MAP.product_leader.prohibitions).toContain("Merge کد");
    expect(TEAM_CONTRACT_MAP.tour_manager.prohibitions).toContain("حدس قیمت");
    expect(TEAM_CONTRACT_MAP.content.prohibitions).toContain("تغییر Pointer");
    expect(TEAM_CONTRACT_MAP.seo.prohibitions).toContain("جعل دادهٔ Search Console");
    expect(TEAM_CONTRACT_MAP.design.prohibitions).toContain("Deploy مستقیم");
    expect(TEAM_CONTRACT_MAP.development.prohibitions).toContain("خواندن Secret");
  });
});

describe("workflows", () => {
  it("defines exactly the six frozen workflow versions", () => {
    expect(WORKFLOWS.map((w) => w.workflow_version).sort()).toEqual(
      EXPECTED_TEAMS.map((t) => t.workflow).sort(),
    );
    for (const w of WORKFLOWS) {
      expect(w.requires_approval).toBe(true);
      expect(w.rollback_path.length).toBeGreaterThan(0);
      expect(w.gate.length).toBeGreaterThan(0);
      expect(w.steps.length).toBeGreaterThan(0);
      expect(WORKFLOW_MAP[w.workflow_version]).toBe(w);
    }
  });

  it("gives the leader workflow the full WorkProposal output shape", () => {
    const leader = WORKFLOW_MAP.leader_signal_v1;
    expect(leader.output_type).toBe("WorkProposal");
    expect(leader.output_fields).toEqual([
      "goal",
      "evidence_refs",
      "priority",
      "risk_class",
      "owner_team",
      "acceptance_criteria",
      "budget_limit",
      "dependencies",
      "expiry",
      "dedupe_key",
    ]);
  });

  it("keeps the tour chain source_shadow_v1 to tour_observation to review_required", () => {
    const tour = WORKFLOW_MAP.source_shadow_v1;
    expect(tour.steps.map((s) => s.step_key)).toEqual([
      "source_shadow_v1",
      "tour_observation",
      "review_required",
    ]);
    expect(tour.tick_execution).toBe("deferred");
  });

  it("keeps the content chain guide_content_v1 to draft to validation to human_approval", () => {
    const content = WORKFLOW_MAP.guide_content_v1;
    expect(content.steps.map((s) => s.step_key)).toEqual([
      "guide_content_v1",
      "draft",
      "validation",
      "human_approval",
    ]);
    expect(content.tick_execution).toBe("executable");
  });

  it("matches each contract workflow version to its team workflow", () => {
    for (const t of EXPECTED_TEAMS) {
      const def = WORKFLOW_MAP[t.workflow];
      expect(def.team_key).toBe(t.key);
      expect(TEAM_CONTRACT_MAP[t.key].workflow_versions).toEqual([t.workflow]);
    }
  });
});

describe("policy", () => {
  it("blocks unknown workflows", () => {
    expect(isWorkflowBlocked("no_such_workflow_v9")).toBe(true);
    expect(resolveWorkflowStatus("no_such_workflow_v9")).toBe("blocked");
    expect(isWorkflowBlocked("guide_content_v1")).toBe(false);
    expect(isWorkflowBlocked("source_shadow_v1")).toBe(false);
    expect(resolveWorkflowStatus("source_shadow_v1")).toBe("deferred");
  });

  it("never executes a manual team with Tick", () => {
    for (const w of WORKFLOWS) {
      expect(canTickExecute("manual", w.workflow_version).allowed).toBe(false);
    }
    expect(canTickExecute("manual", "guide_content_v1").reason).toContain("manual");
  });

  it("executes only the tick-managed official workflow with Tick", () => {
    expect(canTickExecute("tick_managed", "guide_content_v1").allowed).toBe(true);
    expect(canTickExecute("tick_managed", "source_shadow_v1").allowed).toBe(false);
    expect(canTickExecute("tick_managed", "leader_signal_v1").allowed).toBe(false);
    expect(canTickExecute("tick_managed", "no_such_workflow_v9").allowed).toBe(false);
  });

  it("keeps every team inactive in production and never autonomous", () => {
    for (const c of TEAM_CONTRACTS) {
      expect(c.enabled_environment).toBe("staging");
      expect(c.status).toBe("configured");
      expect(isProductionActive(c)).toBe(false);
      expect(canRunAutonomously(c).allowed).toBe(false);
    }
  });
});
