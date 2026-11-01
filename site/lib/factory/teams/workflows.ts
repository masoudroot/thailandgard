/**
 * تعریف شش Workflow فاز ۳. این فایل فقط تعریف است و هیچ کاری را
 * اجرا نمی‌کند. دو نسخهٔ موجود در کد با همان معنا ثبت شده‌اند:
 * guide_content_v1 مسیر رسمی محتواست و source_shadow_v1 موکول‌شده
 * است؛ یعنی در Tick اجرا نمی‌شود و مسدود هم نمی‌شود. چهار Workflow
 * تازه فقط برای Staging تعریف شده‌اند و هنوز به Tick وصل نیستند.
 */

import type { TeamKey } from "./registry";

export interface WorkflowStep {
  step_key: string;
  description: string;
  input_type: string;
  output_type: string;
  requires_approval: boolean;
  gate: string | null;
}

/**
 * وضعیت اجرای Workflow در Tick:
 * executable یعنی Tick رسمی آن را اجرا می‌کند،
 * deferred یعنی موکول‌شده و نه اجرا می‌شود و نه مسدود است،
 * defined_not_wired یعنی تعریف شده ولی هنوز به Tick وصل نیست.
 */
export type TickExecution = "executable" | "deferred" | "defined_not_wired";

export type WorkflowErrorStatus = "blocked" | "failed" | "needs_review";

export interface WorkflowDefinition {
  workflow_version: string;
  team_key: TeamKey;
  steps: WorkflowStep[];
  dependencies: string[];
  gate: string;
  error_status: WorkflowErrorStatus;
  requires_approval: boolean;
  rollback_path: string;
  output_type: string;
  output_fields: string[];
  tick_execution: TickExecution;
}

export const WORKFLOW_PROPOSAL_FIELDS: readonly string[] = [
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
];

function step(
  step_key: string,
  description: string,
  input_type: string,
  output_type: string,
  gate: string | null,
  requires_approval = false,
): WorkflowStep {
  return { step_key, description, input_type, output_type, requires_approval, gate };
}

export const WORKFLOWS: readonly WorkflowDefinition[] = [
  {
    workflow_version: "leader_signal_v1",
    team_key: "product_leader",
    steps: [
      step("collect_signals", "گردآوری سیگنال‌ها", "LeaderInput", "SignalRef[]", null),
      step("detect_opportunity", "تشخیص فرصت", "SignalRef[]", "OpportunityDraft", null),
      step("dedupe", "حذف کار تکراری با dedupe_key", "OpportunityDraft", "OpportunityDraft", null),
      step("build_proposal", "ساخت WorkProposal", "OpportunityDraft", "WorkProposal", "proposal_review"),
      step("review", "بازبینی پیشنهاد", "WorkProposal", "WorkProposal", "proposal_review", true),
    ],
    dependencies: ["signals"],
    gate: "proposal_review",
    error_status: "needs_review",
    requires_approval: true,
    rollback_path: "پیشنهاد با expiry منقضی می‌شود؛ چیزی منتشر نشده که برگردد",
    output_type: "WorkProposal",
    output_fields: [...WORKFLOW_PROPOSAL_FIELDS],
    tick_execution: "defined_not_wired",
  },
  {
    workflow_version: "source_shadow_v1",
    team_key: "tour_manager",
    steps: [
      step("source_shadow_v1", "خواندن سایهٔ منبع", "TourInput", "SourceObservation[]", null),
      step("tour_observation", "تطبیق و استانداردسازی مشاهدهٔ تور", "SourceObservation[]", "TourChangeProposal", null),
      step("review_required", "بازبینی اجباری پیش از هر اثر", "TourChangeProposal", "TourChangeProposal", "review_required", true),
    ],
    dependencies: ["source_observations"],
    gate: "review_required",
    error_status: "blocked",
    requires_approval: true,
    rollback_path: "candidate دور انداخته می‌شود؛ هیچ قیمت و هیچ Pointer تغییر نکرده است",
    output_type: "TourChangeProposal",
    output_fields: ["tour_key", "field", "proposed_value", "evidence_refs", "status"],
    tick_execution: "deferred",
  },
  {
    workflow_version: "guide_content_v1",
    team_key: "content",
    steps: [
      step("guide_content_v1", "شروع مسیر رسمی محتوا", "ContentInput", "ContentInput", null),
      step("draft", "ساخت پیش‌نویس", "ContentInput", "ContentArtifactOutput", null),
      step("validation", "اعتبارسنجی publish_payload_v1 و Hash", "ContentArtifactOutput", "ContentArtifactOutput", "validation"),
      step("human_approval", "تأیید انسانی", "ContentArtifactOutput", "ContentArtifactOutput", "human_approval", true),
    ],
    dependencies: ["evidence_refs"],
    gate: "human_approval",
    error_status: "needs_review",
    requires_approval: true,
    rollback_path: "پیش‌نویس دور انداخته می‌شود؛ Pointer روی نسخهٔ قبلی می‌ماند",
    output_type: "ContentArtifactOutput",
    output_fields: ["schema_version", "slug", "artifact_hash"],
    tick_execution: "executable",
  },
  {
    workflow_version: "seo_proposal_v1",
    team_key: "seo",
    steps: [
      step("seo_proposal_v1", "شروع مسیر سئو", "SeoInput", "SeoInput", null),
      step("analyze_signals", "تحلیل سیگنال‌های جستجو", "SeoInput", "SearchSignal[]", null),
      step("draft_proposal", "ساخت پیش‌نویس پیشنهاد", "SearchSignal[]", "SeoProposalOutput", null),
      step("validate_metadata", "اعتبارسنجی Meta و Canonical", "SeoProposalOutput", "SeoProposalOutput", "validation"),
      step("review", "بازبینی پیشنهاد", "SeoProposalOutput", "SeoProposalOutput", "proposal_review", true),
    ],
    dependencies: ["search_signals"],
    gate: "proposal_review",
    error_status: "needs_review",
    requires_approval: true,
    rollback_path: "پیشنهاد دور انداخته می‌شود؛ هیچ صفحه‌ای ساخته یا تغییر نکرده است",
    output_type: "SeoProposalOutput",
    output_fields: ["kind", "slug", "title"],
    tick_execution: "defined_not_wired",
  },
  {
    workflow_version: "design_proposal_v1",
    team_key: "design",
    steps: [
      step("design_proposal_v1", "شروع مسیر دیزاین", "DesignInput", "DesignInput", null),
      step("read_context", "خواندن بستر محصول", "DesignInput", "DesignInput", null),
      step("draft_proposal", "ساخت پیش‌نویس طرح", "DesignInput", "DesignProposalOutput", null),
      step("accessibility_check", "بررسی دسترسی‌پذیری", "DesignProposalOutput", "DesignProposalOutput", "accessibility"),
      step("review", "بازبینی پیشنهاد", "DesignProposalOutput", "DesignProposalOutput", "proposal_review", true),
    ],
    dependencies: ["product_context"],
    gate: "proposal_review",
    error_status: "needs_review",
    requires_approval: true,
    rollback_path: "پیشنهاد دور انداخته می‌شود؛ هیچ کدی تغییر نکرده است",
    output_type: "DesignProposalOutput",
    output_fields: ["kind", "page_key", "summary"],
    tick_execution: "defined_not_wired",
  },
  {
    workflow_version: "code_change_v1",
    team_key: "development",
    steps: [
      step("code_change_v1", "شروع مسیر توسعه", "DevelopmentInput", "DevelopmentInput", null),
      step("read_context", "خواندن بستر کد", "DevelopmentInput", "DevelopmentInput", null),
      step("create_branch", "ساخت Branch", "DevelopmentInput", "CodeChangeProposalOutput", null),
      step("implement", "پیاده‌سازی تغییر در Branch", "CodeChangeProposalOutput", "CodeChangeProposalOutput", null),
      step("run_tests", "اجرای تست", "CodeChangeProposalOutput", "CodeChangeProposalOutput", "tests"),
      step("create_pr", "ساخت PR", "CodeChangeProposalOutput", "CodeChangeProposalOutput", null),
      step("review", "بازبینی PR", "CodeChangeProposalOutput", "CodeChangeProposalOutput", "pr_review", true),
    ],
    dependencies: ["approved_proposal"],
    gate: "pr_review",
    error_status: "failed",
    requires_approval: true,
    rollback_path: "Branch و PR بدون Merge بسته می‌شوند؛ Migration proposal پس گرفته می‌شود",
    output_type: "CodeChangeProposalOutput",
    output_fields: ["kind", "branch_name", "summary", "tests_required", "rollback_plan"],
    tick_execution: "defined_not_wired",
  },
];

export const WORKFLOW_MAP: Record<string, WorkflowDefinition> = WORKFLOWS.reduce(
  (acc, w) => {
    acc[w.workflow_version] = w;
    return acc;
  },
  {} as Record<string, WorkflowDefinition>,
);

export function getWorkflow(workflowVersion: string): WorkflowDefinition | null {
  return WORKFLOW_MAP[workflowVersion] ?? null;
}
