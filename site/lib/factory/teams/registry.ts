/**
 * قرارداد شش تیم فاز ۳. این فایل فقط تعریف است و هیچ فراخوانی،
 * هیچ دسترسی دیتابیسی و هیچ تغییری در وضعیت انجام نمی‌دهد.
 * وضعیت اولیهٔ همهٔ تیم‌ها configured و محیط فعال staging است و
 * فعال‌سازی Production خاموش است. قرارداد یخ‌زده است: کلیدها،
 * نام‌های نمایشی، ابزارهای مجاز و ممنوع و نسخه‌های گردش‌کار را
 * بدون هماهنگی با تیم‌های داشبورد و QA عوض نکن.
 */

export type TeamKey =
  | "product_leader"
  | "tour_manager"
  | "content"
  | "seo"
  | "design"
  | "development";

export type TeamStatus = "configured" | "ready_for_dry_run" | "blocked" | "active";

export type RiskClass = "low" | "medium" | "high";

export type EnabledEnvironment = "staging" | "production";

/** ابزارهایی که برای همهٔ تیم‌ها ممنوع‌اند. */
export const FORBIDDEN_TOOLS: readonly string[] = [
  "raw_sql",
  "arbitrary_shell",
  "publish_direct",
  "change_policy",
  "increase_budget",
  "read_secret",
  "production_migration",
];

/** سیاست خرج: تا تأیید سقف تازه، هیچ خرج تازه‌ای مجاز نیست. */
export const ZERO_SPEND_BUDGET_POLICY =
  "بدون خرج تازه؛ سقف مصرف صفر تا تأیید سقف تازه؛ پیشنهاد فقط budget_limit حمل می‌کند و هیچ خرجی را مجاز نمی‌کند.";

/* ورودی و خروجی تیم‌ها به‌صورت نوع‌های TypeScript. */

export interface SignalRef {
  source: string;
  observed_at: string;
  summary: string;
}

export interface LeaderInput {
  signals: SignalRef[];
}

export interface WorkProposal {
  goal: string;
  evidence_refs: string[];
  priority: "low" | "medium" | "high";
  risk_class: RiskClass;
  owner_team: TeamKey;
  acceptance_criteria: string[];
  budget_limit: number;
  dependencies: string[];
  expiry: string;
  dedupe_key: string;
}

export interface SourceObservation {
  source_id: string;
  observed_at: string;
  note: string;
}

export interface TourInput {
  observations: SourceObservation[];
}

export interface TourChangeProposal {
  tour_key: string;
  field: string;
  proposed_value: string;
  evidence_refs: string[];
  status: "candidate";
}

export interface ContentInput {
  target_slug: string;
  evidence_refs: string[];
  draft_note: string;
}

export interface ContentArtifactOutput {
  schema_version: "publish_payload_v1";
  slug: string;
  artifact_hash: string;
}

export interface SearchSignal {
  query: string;
  observed_at: string;
}

export interface SeoInput {
  signals: SearchSignal[];
  target_slug: string;
}

export interface SeoProposalOutput {
  kind: "SearchOpportunity" | "SEOChangeProposal";
  slug: string;
  title: string;
}

export interface DesignInput {
  page_key: string;
  context_note: string;
}

export interface DesignProposalOutput {
  kind: "UXChangeProposal" | "DesignChangeProposal";
  page_key: string;
  summary: string;
}

export interface DevelopmentInput {
  proposal_id: string;
  repo_path: string;
}

export interface CodeChangeProposalOutput {
  kind: "CodeChangeProposal";
  branch_name: string;
  summary: string;
  tests_required: string[];
  rollback_plan: string;
}

/**
 * توصیف یک اسکیما. type_name نام نوع TypeScript متناظر است و
 * fields فیلدهای آن نوع را با الزامی بودن هر کدام فهرست می‌کند.
 */
export interface SchemaField {
  name: string;
  type: string;
  required: boolean;
}

export interface SchemaDescriptor {
  type_name: string;
  fields: SchemaField[];
}

export interface TeamContract {
  team_key: TeamKey;
  display_name: string;
  mission: string;
  status: TeamStatus;
  workflow_versions: string[];
  allowed_tools: string[];
  forbidden_tools: string[];
  risk_class: RiskClass;
  budget_policy: string;
  budget_scope: string;
  acceptance_criteria: string[];
  escalation_rules: string[];
  evaluation_fixtures: string[];
  prohibitions: string[];
  input_schema: SchemaDescriptor;
  output_schema: SchemaDescriptor;
  last_run: string | null;
  last_success: string | null;
  blocked_reason: string | null;
  enabled_environment: EnabledEnvironment;
}

function initialState(): Pick<
  TeamContract,
  "status" | "last_run" | "last_success" | "blocked_reason" | "enabled_environment"
> {
  return {
    status: "configured",
    last_run: null,
    last_success: null,
    blocked_reason: null,
    enabled_environment: "staging",
  };
}

function forbidden(): string[] {
  return [...FORBIDDEN_TOOLS];
}

export const TEAM_CONTRACTS: readonly TeamContract[] = [
  {
    team_key: "product_leader",
    display_name: "PRODUCT-LEADER",
    mission:
      "دریافت سیگنال‌ها، تشخیص فرصت، ساخت WorkProposal، اولویت‌بندی، حذف کار تکراری، تعیین معیار پذیرش، تعیین تیم مقصد و مشخص‌کردن وابستگی و ریسک.",
    ...initialState(),
    workflow_versions: ["leader_signal_v1"],
    allowed_tools: ["read_signals", "create_work_proposal", "check_duplicate_work", "get_budget_status"],
    forbidden_tools: forbidden(),
    risk_class: "medium",
    budget_policy: ZERO_SPEND_BUDGET_POLICY,
    budget_scope: "staging-only؛ پیشنهاد بدون خرج",
    acceptance_criteria: [
      "هر WorkProposal دارای goal و evidence_refs و dedupe_key است",
      "owner_team همیشه یکی از شش تیم است",
      "بدون evidence_refs پیشنهاد ساخته نمی‌شود",
    ],
    escalation_rules: [
      "تعارض اولویت به بازبینی انسانی می‌رود",
      "بودجهٔ بیش از سقف، پیشنهاد را مسدود می‌کند",
    ],
    evaluation_fixtures: [
      "دو سیگنال تکراری با یک dedupe_key به یک پیشنهاد می‌رسند (بدون دادهٔ واقعی)",
      "پیشنهاد بدون owner_team رد می‌شود (بدون دادهٔ واقعی)",
    ],
    prohibitions: ["تغییر مستقیم قیمت", "انتشار", "تغییر Policy", "افزایش بودجه", "Merge کد"],
    input_schema: {
      type_name: "LeaderInput",
      fields: [{ name: "signals", type: "SignalRef[]", required: true }],
    },
    output_schema: {
      type_name: "WorkProposal",
      fields: [
        { name: "goal", type: "string", required: true },
        { name: "evidence_refs", type: "string[]", required: true },
        { name: "priority", type: "low | medium | high", required: true },
        { name: "risk_class", type: "RiskClass", required: true },
        { name: "owner_team", type: "TeamKey", required: true },
        { name: "acceptance_criteria", type: "string[]", required: true },
        { name: "budget_limit", type: "number", required: true },
        { name: "dependencies", type: "string[]", required: true },
        { name: "expiry", type: "string", required: true },
        { name: "dedupe_key", type: "string", required: true },
      ],
    },
  },
  {
    team_key: "tour_manager",
    display_name: "TOUR-MANAGER",
    mission:
      "دریافت SourceObservation، تطبیق تور، استانداردسازی مقصد و مسیر و هتل و Bundle، تشخیص قیمت از و وضعیت fresh و stale و disputed و نگه‌داری تور منقضی و پیشنهاد TourChange.",
    ...initialState(),
    workflow_versions: ["source_shadow_v1"],
    allowed_tools: ["read_source_observation", "normalize_tour", "create_tour_change_proposal", "flag_conflict"],
    forbidden_tools: forbidden(),
    risk_class: "high",
    budget_policy: ZERO_SPEND_BUDGET_POLICY,
    budget_scope: "staging-only؛ مشاهده بدون خرج",
    acceptance_criteria: [
      "هر TourChange فقط candidate است و قیمت نهایی نیست",
      "بدون evidence_refs پیشنهاد ساخته نمی‌شود",
      "قیمت حدسی هرگز ثبت نمی‌شود",
    ],
    escalation_rules: [
      "تعارض منبع به review_required می‌رود",
      "دادهٔ منقضی با وضعیت stale علامت می‌خورد",
    ],
    evaluation_fixtures: [
      "مشاهدهٔ تکراری یک تور به یک candidate می‌رسد (بدون دادهٔ واقعی)",
      "candidate بدون Review به قیمت نهایی تبدیل نمی‌شود (بدون دادهٔ واقعی)",
    ],
    prohibitions: [
      "حدس قیمت",
      "تأیید تجاری مستقل",
      "انتشار مستقیم",
      "تبدیل Candidate به قیمت نهایی بدون Review",
    ],
    input_schema: {
      type_name: "TourInput",
      fields: [{ name: "observations", type: "SourceObservation[]", required: true }],
    },
    output_schema: {
      type_name: "TourChangeProposal",
      fields: [
        { name: "tour_key", type: "string", required: true },
        { name: "field", type: "string", required: true },
        { name: "proposed_value", type: "string", required: true },
        { name: "evidence_refs", type: "string[]", required: true },
        { name: "status", type: "candidate", required: true },
      ],
    },
  },
  {
    team_key: "content",
    display_name: "CONTENT",
    mission:
      "تولید Draft، اصلاح راهنما، FAQ، توضیح مقصد و تور، اتصال ادعاها به Evidence و خروجی publish_payload_v1.",
    ...initialState(),
    workflow_versions: ["guide_content_v1"],
    allowed_tools: ["read_evidence", "create_content_artifact", "validate_content_schema", "request_human_approval"],
    forbidden_tools: forbidden(),
    risk_class: "medium",
    budget_policy: ZERO_SPEND_BUDGET_POLICY,
    budget_scope: "staging-only؛ پیش‌نویس بدون خرج",
    acceptance_criteria: [
      "خروجی با publish_payload_v1 معتبر است",
      "هر ادعا یک evidence_ref دارد",
      "Hash از Canonical JSON و SHA-256 محاسبه می‌شود",
    ],
    escalation_rules: [
      "ادعای بدون منبع به بازبینی انسانی می‌رود",
      "اعتبارسنجی ناموفق، Draft را مسدود می‌کند",
    ],
    evaluation_fixtures: [
      "Draft با ادعای بدون منبع رد می‌شود (بدون دادهٔ واقعی)",
      "Hash محاسبه‌شده با Hash ثبت‌شده برابر است (بدون دادهٔ واقعی)",
    ],
    prohibitions: ["ادعای بدون منبع", "قیمت‌سازی", "انتشار مستقیم", "تغییر Pointer"],
    input_schema: {
      type_name: "ContentInput",
      fields: [
        { name: "target_slug", type: "string", required: true },
        { name: "evidence_refs", type: "string[]", required: true },
        { name: "draft_note", type: "string", required: true },
      ],
    },
    output_schema: {
      type_name: "ContentArtifactOutput",
      fields: [
        { name: "schema_version", type: "publish_payload_v1", required: true },
        { name: "slug", type: "string", required: true },
        { name: "artifact_hash", type: "string", required: true },
      ],
    },
  },
  {
    team_key: "seo",
    display_name: "SEO",
    mission:
      "فرصت کلمه و موضوع، Title و Meta، Canonical، لینک داخلی، Structured Data، تشخیص صفحات هم‌هدف و جلوگیری از ساخت صفحهٔ تکراری.",
    ...initialState(),
    workflow_versions: ["seo_proposal_v1"],
    allowed_tools: ["read_search_signal", "create_seo_proposal", "validate_metadata"],
    forbidden_tools: forbidden(),
    risk_class: "low",
    budget_policy: ZERO_SPEND_BUDGET_POLICY,
    budget_scope: "staging-only؛ پیشنهاد بدون خرج",
    acceptance_criteria: [
      "هر پیشنهاد یک slug هدف دارد",
      "صفحهٔ تکراری ساخته نمی‌شود",
      "Meta با validate_metadata بررسی می‌شود",
    ],
    escalation_rules: [
      "صفحهٔ هم‌هدف به بازبینی انسانی می‌رود",
      "دادهٔ Search Console هرگز جعل نمی‌شود",
    ],
    evaluation_fixtures: [
      "دو موضوع هم‌هدف به یک پیشنهاد می‌رسند (بدون دادهٔ واقعی)",
      "پیشنهاد بدون slug رد می‌شود (بدون دادهٔ واقعی)",
    ],
    prohibitions: [
      "تضمین رتبه",
      "جعل دادهٔ Search Console",
      "تغییر عمومی بدون Gate",
      "ساخت صفحه فقط برای پر کردن سهمیه",
    ],
    input_schema: {
      type_name: "SeoInput",
      fields: [
        { name: "signals", type: "SearchSignal[]", required: true },
        { name: "target_slug", type: "string", required: true },
      ],
    },
    output_schema: {
      type_name: "SeoProposalOutput",
      fields: [
        { name: "kind", type: "SearchOpportunity | SEOChangeProposal", required: true },
        { name: "slug", type: "string", required: true },
        { name: "title", type: "string", required: true },
      ],
    },
  },
  {
    team_key: "design",
    display_name: "DESIGN",
    mission:
      "پیشنهاد UI و UX، RTL و فارسی، موبایل، خوانایی، دسترسی‌پذیری، نمایش اطلاعات تور و طرح داشبورد و صفحات.",
    ...initialState(),
    workflow_versions: ["design_proposal_v1"],
    allowed_tools: ["read_product_context", "create_design_proposal", "run_accessibility_check"],
    forbidden_tools: forbidden(),
    risk_class: "low",
    budget_policy: ZERO_SPEND_BUDGET_POLICY,
    budget_scope: "staging-only؛ پیشنهاد بدون خرج",
    acceptance_criteria: [
      "هر پیشنهاد یک page_key دارد",
      "بررسی دسترسی‌پذیری اجرا می‌شود",
      "RTL و فارسی در پیشنهاد رعایت می‌شود",
    ],
    escalation_rules: ["تعارض با طرح موجود به بازبینی انسانی می‌رود"],
    evaluation_fixtures: [
      "پیشنهاد بدون page_key رد می‌شود (بدون دادهٔ واقعی)",
      "بررسی دسترسی‌پذیری ناموفق، پیشنهاد را مسدود می‌کند (بدون دادهٔ واقعی)",
    ],
    prohibitions: ["تغییر کد مستقیم در main", "تغییر دادهٔ تور", "Deploy مستقیم"],
    input_schema: {
      type_name: "DesignInput",
      fields: [
        { name: "page_key", type: "string", required: true },
        { name: "context_note", type: "string", required: true },
      ],
    },
    output_schema: {
      type_name: "DesignProposalOutput",
      fields: [
        { name: "kind", type: "UXChangeProposal | DesignChangeProposal", required: true },
        { name: "page_key", type: "string", required: true },
        { name: "summary", type: "string", required: true },
      ],
    },
  },
  {
    team_key: "development",
    display_name: "DEVELOPMENT",
    mission:
      "تبدیل Proposal به CodeChangeProposal، تغییر کد در Branch، Test، Migration proposal، PR، Preview و Rollback plan.",
    ...initialState(),
    workflow_versions: ["code_change_v1"],
    allowed_tools: ["read_code_context", "create_code_change_proposal", "run_tests", "create_branch", "create_pr"],
    forbidden_tools: forbidden(),
    risk_class: "high",
    budget_policy: ZERO_SPEND_BUDGET_POLICY,
    budget_scope: "staging-only؛ تغییر در Branch بدون خرج",
    acceptance_criteria: [
      "هر PR تست دارد",
      "تغییر فقط در Branch انجام می‌شود",
      "Rollback plan همراه پیشنهاد است",
    ],
    escalation_rules: [
      "تست ناموفق، PR را مسدود می‌کند",
      "Migration روی Production همیشه رد می‌شود",
    ],
    evaluation_fixtures: [
      "PR بدون تست رد می‌شود (بدون دادهٔ واقعی)",
      "تغییر مستقیم main رد می‌شود (بدون دادهٔ واقعی)",
    ],
    prohibitions: [
      "تغییر مستقیم main",
      "اجرای Migration روی Production",
      "خاموش‌کردن تست",
      "انتشار داده یا قیمت",
      "خواندن Secret",
    ],
    input_schema: {
      type_name: "DevelopmentInput",
      fields: [
        { name: "proposal_id", type: "string", required: true },
        { name: "repo_path", type: "string", required: true },
      ],
    },
    output_schema: {
      type_name: "CodeChangeProposalOutput",
      fields: [
        { name: "kind", type: "CodeChangeProposal", required: true },
        { name: "branch_name", type: "string", required: true },
        { name: "summary", type: "string", required: true },
        { name: "tests_required", type: "string[]", required: true },
        { name: "rollback_plan", type: "string", required: true },
      ],
    },
  },
];

export const TEAM_KEYS: readonly TeamKey[] = TEAM_CONTRACTS.map((c) => c.team_key);

export const TEAM_CONTRACT_MAP: Record<TeamKey, TeamContract> = TEAM_CONTRACTS.reduce(
  (acc, c) => {
    acc[c.team_key] = c;
    return acc;
  },
  {} as Record<TeamKey, TeamContract>,
);

export function getTeamContract(teamKey: TeamKey): TeamContract | null {
  return TEAM_CONTRACT_MAP[teamKey] ?? null;
}

/* نام یخ‌زده در قرارداد فاز ۳: ماژول نمایشی داشبورد TEAMS را وارد می‌کند.
   این فقط یک نام دوم برای همان آرایه است، نه یک Registry موازی. */
export const TEAMS: readonly TeamContract[] = TEAM_CONTRACTS;
