/**
 * تست مستقیم Handler محتوای Tick (THG-TEAM-ARCHITECTURE-01 فاز ۲، گام ۳):
 * Handler با PostgREST ساختگی، بدون دیتابیس و بدون فراخوان ارائه‌دهنده،
 * مستقیم رانده می‌شود. قدم validate_artifact (غیرتولیدی) و قدم
 * auto_approve (آینهٔ Policy گام ۲) همان نتیجه‌ای را می‌دهند که مسیر
 * Tick پیش از استخراج می‌داد: دمِ Step (finishStep و finishRun) در
 * مسیر می‌ماند و Handler فقط نتیجه را برمی‌گرداند.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { computeContentHash, type PublishPayload } from "@/lib/content-versioning";
import { SimulatedCrashError } from "@/lib/factory/gateway/crash-test";

const {
  getMock,
  writeMock,
  rpcMock,
  getLatestMock,
  openMock,
  runCallMock,
  recoverMock,
  publishV2Mock,
  processOutboxMock,
  verifyPageMock,
  patchOperationMock,
} = vi.hoisted(() => ({
  getMock: vi.fn(),
  writeMock: vi.fn(),
  rpcMock: vi.fn(),
  getLatestMock: vi.fn(),
  openMock: vi.fn(),
  runCallMock: vi.fn(),
  recoverMock: vi.fn(),
  publishV2Mock: vi.fn(),
  processOutboxMock: vi.fn(),
  verifyPageMock: vi.fn(),
  patchOperationMock: vi.fn(),
}));

vi.mock("@/lib/factory/tick/internal-api", () => ({
  checkAuth: () => true,
  dbConfig: () => ({ url: "https://supabase.test", serviceKey: "service-key" }),
  postgrestGet: getMock,
  postgrestWrite: writeMock,
  postgrestRpc: rpcMock,
}));

vi.mock("@/lib/factory/gateway/operations", () => ({
  getLatestOperation: getLatestMock,
  patchOperation: patchOperationMock,
}));

vi.mock("@/lib/factory/tick/gateway-operation-run", () => ({
  GatewayOperationError: class GatewayOperationErrorMock extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  },
  gatewayLogicalOperationId: (workItemId: string, stepKey: string, operationName: string) =>
    `logical-${workItemId}-${stepKey}-${operationName}`,
  openGatewayOperation: openMock,
  runGatewayCallForOperation: runCallMock,
}));

vi.mock("@/lib/factory/tick/gateway-artifact-recovery", () => ({
  recoverGatewayArtifact: recoverMock,
}));

vi.mock("@/lib/factory/gateway/ledger", () => ({
  PostgrestBudgetLedger: class PostgrestBudgetLedgerMock {
    constructor(_cfg: unknown) {}
  },
}));

vi.mock("@/lib/factory/gateway/registry", () => ({
  CURRENT_BUDGET_POLICY: {},
  modelsForCapability: () => ["model-x"],
}));

vi.mock("@/lib/factory/publish-v2", () => ({
  publishUpdateContent: publishV2Mock,
}));

vi.mock("@/lib/factory/tick/process-outbox-batch", () => ({
  processOutboxBatch: processOutboxMock,
}));

vi.mock("@/lib/factory/tick/publish-outbox", () => ({
  verifyPageWithRetries: verifyPageMock,
}));

import {
  runContentStep,
  type ContentStepContext,
} from "@/lib/factory/handlers/content-runtime";

const PAYLOAD: PublishPayload = {
  schema_version: "publish_payload_v1",
  slug: "thailand-visa-guide",
  title: "راهنمای ویزای تایلند",
  h1: null,
  published_at: null,
  excerpt: "لید راهنما",
  category: "راهنما",
  reading_minutes: 5,
  updated_fa: "۱۰ آبان ۱۴۰۵",
  sections: [{ position: 1, heading: "بخش اول", paragraphs: ["پاراگراف اول نسخهٔ تازه."] }],
  faqs: [{ position: 1, question: "سؤال؟", answer: "جواب." }],
  seo: {
    title: "راهنمای ویزای تایلند",
    description: "لید راهنما",
    canonical_path: "/guide/thailand-visa-guide",
  },
};

const HASH = computeContentHash(PAYLOAD);

const ARTIFACT = {
  id: "art-1",
  work_item_id: "wi-1",
  artifact_type: "guide_edit",
  schema_version: "publish_payload_v1",
  payload: PAYLOAD,
  artifact_hash: HASH,
  created_at: "2026-11-01T00:00:00Z",
};

function baseWorkItem(overrides: Record<string, unknown> = {}): ContentStepContext["workItem"] {
  return {
    id: "wi-1",
    work_key: "wk-1",
    work_type: "update_content",
    title: "راهنمای ویزا",
    description: null,
    status: "queued",
    content_id: "doc-1",
    acceptance_criteria: [],
    result_artifact_id: "art-1",
    result_version_id: null,
    publication_id: null,
    last_error: null,
    execution_mode: "tick_managed",
    workflow_version: "guide_content_v1",
    source_id: null,
    detail_url: null,
    created_at: "2026-11-02T00:00:00Z",
    updated_at: "2026-11-02T00:00:00Z",
    completed_at: null,
    ...overrides,
  } as ContentStepContext["workItem"];
}

function baseCtx(
  workItem: ContentStepContext["workItem"],
  stepKey: ContentStepContext["claimed"]["step_key"],
): ContentStepContext {
  return {
    cfg: { url: "https://supabase.test", serviceKey: "service-key" },
    workItem,
    claimed: {
      id: "step-1",
      work_item_id: workItem.id,
      step_key: stepKey,
      attempt_count: 1,
      max_attempts: 5,
      fencing_token: 1,
    },
    attemptId: "att-1",
    runId: "run-1",
    requestOrigin: "http://test",
    switches: {
      factoryPaused: false,
      generationEnabled: true,
      dataPublishingEnabled: true,
      discoveryEnabled: false,
      codeAgentsEnabled: false,
    },
    testCrashAfterPublication: false,
    finishStep: vi.fn().mockResolvedValue(true),
    finishRun: vi.fn().mockResolvedValue(undefined),
    blockWorkItem: vi.fn().mockResolvedValue(undefined),
  };
}

function writeBody(method: string, path: string): Record<string, unknown> {
  const call = writeMock.mock.calls.find((c) => c[1] === method && String(c[2]).startsWith(path));
  if (!call) throw new Error(`no ${method} ${path} write recorded`);
  return call[3] as Record<string, unknown>;
}

describe("content runtime handler (phase 2 step 3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("validate_artifact succeeds on a fixture with a matching hash and writes nothing", async () => {
    getMock.mockImplementation(async (cfg: unknown, path: string) => {
      if (path.startsWith("factory_artifacts")) return [ARTIFACT];
      throw new Error(`unexpected get ${path}`);
    });
    const ctx = baseCtx(baseWorkItem(), "validate_artifact");
    const result = await runContentStep(ctx);
    expect(result).toEqual({
      kind: "completed",
      outputArtifactId: "art-1",
      gatewayOperationId: null,
      gatewayHasExcess: false,
    });
    // قدم اعتبارسنجی فقط می‌خواند؛ دمِ Step با مسیر است، نه Handler.
    expect(writeMock).not.toHaveBeenCalled();
    expect(ctx.finishStep).not.toHaveBeenCalled();
    expect(ctx.finishRun).not.toHaveBeenCalled();
    expect(ctx.blockWorkItem).not.toHaveBeenCalled();
    expect(getMock.mock.calls[0][1]).toBe("factory_artifacts?id=eq.art-1&select=*");
  });

  it("validate_artifact fails the step (not the work item) on a hash mismatch", async () => {
    getMock.mockImplementation(async (cfg: unknown, path: string) => {
      if (path.startsWith("factory_artifacts")) return [{ ...ARTIFACT, artifact_hash: "0".repeat(64) }];
      throw new Error(`unexpected get ${path}`);
    });
    const ctx = baseCtx(baseWorkItem(), "validate_artifact");
    const result = await runContentStep(ctx);
    expect(result.kind).toBe("respond");
    if (result.kind !== "respond") throw new Error("expected respond");
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      run_id: "run-1",
      status: "step_failed",
      error: "artifact content_hash mismatch",
      work_item_id: "wi-1",
      step_key: "validate_artifact",
      attempt_no: 1,
    });
    expect(ctx.finishStep).toHaveBeenCalledWith(
      "queued",
      "failed",
      "not_required",
      "artifact content_hash mismatch",
      null,
      null,
    );
    expect(ctx.finishRun).toHaveBeenCalledWith(1, 0, 1);
    expect(ctx.blockWorkItem).not.toHaveBeenCalled();
  });

  it("auto_approve mirrors the policy decision onto the work item (step-2 mirror, via handler)", async () => {
    getMock.mockImplementation(async (cfg: unknown, path: string) => {
      if (path.startsWith("factory_artifacts")) return [ARTIFACT];
      if (path.startsWith("factory_approvals")) return [];
      throw new Error(`unexpected get ${path}`);
    });
    writeMock.mockImplementation(async (cfg: unknown, method: string, path: string) => {
      if (method === "POST" && path === "factory_approvals") {
        return [{ id: "appr-new", decision: "approved" }];
      }
      if (method === "PATCH" && path.startsWith("factory_work_items")) {
        return [{ id: "wi-1", status: "approved" }];
      }
      throw new Error(`unexpected write ${method} ${path}`);
    });
    const ctx = baseCtx(
      baseWorkItem({ status: "awaiting_approval", workflow_version: "guide_content_auto_v1" }),
      "auto_approve",
    );
    const result = await runContentStep(ctx);
    expect(result.kind).toBe("completed");
    if (result.kind !== "completed") throw new Error("expected completed");
    expect(result.outputArtifactId).toBeNull();
    expect(result.gatewayOperationId).toBeNull();
    expect(result.gatewayHasExcess).toBe(false);
    // first-match پنهان نمی‌کند: هر نوشتن، دقیقاً یک بار رخ داده است.
    expect(writeMock.mock.calls.filter((c) => c[1] === "POST" && c[2] === "factory_approvals")).toHaveLength(1);
    expect(
      writeMock.mock.calls.filter((c) => c[1] === "PATCH" && String(c[2]).startsWith("factory_work_items")),
    ).toHaveLength(1);
    expect(writeBody("POST", "factory_approvals")).toMatchObject({
      work_item_id: "wi-1",
      artifact_id: "art-1",
      artifact_hash: HASH,
      decision: "approved",
      reviewer_id: "system:autonomous",
      decision_reason: expect.any(String),
    });
    expect(writeBody("PATCH", "factory_work_items")).toMatchObject({
      status: "approved",
      policy_decision: "auto",
      policy_decided_by: "system:autonomous",
    });
    expect(typeof (writeBody("PATCH", "factory_work_items") as { policy_decided_at?: unknown }).policy_decided_at).toBe(
      "string",
    );
    // auto_approve، قدم completed برمی‌گرداند؛ دمِ Step با مسیر است.
    expect(ctx.finishStep).not.toHaveBeenCalled();
    expect(ctx.finishRun).not.toHaveBeenCalled();
    expect(ctx.blockWorkItem).not.toHaveBeenCalled();
  });
});

/* ------------------------------------------------------------------ */
/* Step-4 preconditions (phase 2 step 3 decision): handler-direct     */
/* coverage for the branches step 3 deliberately left to the audit.   */
/* All DB/provider calls below are mocked; no DB, no provider.       */
/* ------------------------------------------------------------------ */

function gatewayWorkItem(overrides: Record<string, unknown> = {}): ContentStepContext["workItem"] {
  return baseWorkItem({
    status: "queued",
    result_artifact_id: null,
    workflow_version: "guide_content_gateway_v1",
    ...overrides,
  });
}

function setupArtifactReads(): void {
  getMock.mockImplementation(async (cfg: unknown, path: string) => {
    if (path.startsWith("content_documents")) return [{ id: "doc-1", published_version_id: "ver-pub" }];
    if (path.startsWith("content_versions")) return [{ payload: PAYLOAD }];
    if (path.startsWith("factory_artifacts")) return [];
    throw new Error(`unexpected get ${path}`);
  });
}

function standardWrites(): void {
  writeMock.mockImplementation(async (cfg: unknown, method: string, path: string) => {
    if (method === "POST" && path === "factory_artifacts") return [{ id: "art-new" }];
    if (method === "POST" && path === "factory_approvals") return [{ id: "appr-new" }];
    if (method === "POST" && path === "factory_audit_events") return [{ id: "audit-1" }];
    if (method === "PATCH" && path.startsWith("factory_work_items")) return [{ id: "wi-1" }];
    if (method === "PATCH" && path.startsWith("factory_attempts")) return [{ id: "att-1" }];
    if (method === "PATCH" && path.startsWith("factory_runs")) return [{ id: "run-1" }];
    if (method === "PATCH" && path.startsWith("content_documents")) return [{ id: "doc-1" }];
    throw new Error(`unexpected write ${method} ${path}`);
  });
}

function respondBody(result: Awaited<ReturnType<typeof runContentStep>>): Record<string, unknown> {
  expect(result.kind).toBe("respond");
  if (result.kind !== "respond") throw new Error("expected respond");
  return result.body as Record<string, unknown>;
}

describe("content runtime handler gateway branches (step-4 preconditions, item 1)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("gateway-open: open operation returns gateway_operation_open and leaves the step claimed", async () => {
    getLatestMock.mockResolvedValue(null);
    openMock.mockResolvedValue({ kind: "open", operation: { id: "op-1" } });
    const ctx = baseCtx(gatewayWorkItem(), "generate_draft_mock");
    const result = await runContentStep(ctx);
    expect(result.kind).toBe("respond");
    if (result.kind !== "respond") throw new Error("expected respond");
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      run_id: "run-1",
      status: "gateway_operation_open",
      work_item_id: "wi-1",
      step_key: "generate_draft_mock",
      attempt_no: 1,
    });
    expect(ctx.finishStep).not.toHaveBeenCalled();
    expect(ctx.finishRun).toHaveBeenCalledWith(1, 0, 0);
    expect(ctx.blockWorkItem).not.toHaveBeenCalled();
  });

  it("gateway blocked on debt: blocked open returns gateway_debt_open and leaves the step claimed", async () => {
    getLatestMock.mockResolvedValue(null);
    openMock.mockResolvedValue({ kind: "blocked", operation: null, reason: "debt_open" });
    const ctx = baseCtx(gatewayWorkItem(), "generate_draft_mock");
    const result = await runContentStep(ctx);
    expect(respondBody(result)).toMatchObject({ status: "gateway_debt_open" });
    expect(ctx.finishStep).not.toHaveBeenCalled();
    expect(ctx.finishRun).toHaveBeenCalledWith(1, 0, 0);
  });

  it("gateway-replayed: terminal replay rebuilds the artifact from the stored output without a fresh call", async () => {
    getLatestMock.mockResolvedValue(null);
    openMock.mockResolvedValue({
      kind: "replayed",
      operation: {
        id: "op-r",
        estimated_cost: 10,
        actual_cost: 7,
        response_json: { output: { draft_paragraph: "پاراگراف بازیابی‌شده." } },
      },
    });
    setupArtifactReads();
    standardWrites();
    const ctx = baseCtx(gatewayWorkItem(), "generate_draft_mock");
    const result = await runContentStep(ctx);
    expect(result.kind).toBe("completed");
    if (result.kind !== "completed") throw new Error("expected completed");
    expect(result.outputArtifactId).toBe("art-new");
    expect(result.gatewayOperationId).toBe("op-r");
    expect(result.gatewayHasExcess).toBe(false);
    expect(runCallMock).not.toHaveBeenCalled();
    expect(writeBody("PATCH", "factory_attempts")).toMatchObject({ estimated_cost: 10, actual_cost: 7 });
    expect(ctx.finishStep).not.toHaveBeenCalled();
  });

  it("gateway replayed without a stored paragraph blocks the step as gateway_operation_terminal", async () => {
    getLatestMock.mockResolvedValue(null);
    openMock.mockResolvedValue({
      kind: "replayed",
      operation: { id: "op-r", estimated_cost: 10, actual_cost: 7, response_json: { output: {} } },
    });
    const ctx = baseCtx(gatewayWorkItem(), "generate_draft_mock");
    const result = await runContentStep(ctx);
    expect(respondBody(result)).toMatchObject({ status: "gateway_operation_terminal" });
    expect(ctx.finishStep).toHaveBeenCalledWith(
      "blocked",
      "failed",
      "not_required",
      "gateway_operation_terminal",
      null,
      null,
    );
    expect(ctx.blockWorkItem).toHaveBeenCalledWith(expect.anything(), "gateway_operation_terminal");
    expect(ctx.finishRun).toHaveBeenCalledWith(1, 0, 1);
  });

  it("gateway fresh succeeded with excess: completed carries the operation id and gatewayHasExcess true", async () => {
    getLatestMock.mockResolvedValue(null);
    openMock.mockResolvedValue({ kind: "created", operation: { id: "op-fresh" } });
    runCallMock.mockResolvedValue({
      kind: "succeeded",
      operation: { id: "op-fresh" },
      response: {
        output: { draft_paragraph: "پاراگراف تازه." },
        estimated_cost: 10,
        actual_cost: 9,
        reconciliation: { excess_amount: 5 },
      },
      providerCalls: 1,
      mockCalls: 1,
    });
    setupArtifactReads();
    standardWrites();
    const ctx = baseCtx(gatewayWorkItem(), "generate_draft_mock");
    const result = await runContentStep(ctx);
    expect(result.kind).toBe("completed");
    if (result.kind !== "completed") throw new Error("expected completed");
    expect(result.outputArtifactId).toBe("art-new");
    expect(result.gatewayOperationId).toBe("op-fresh");
    expect(result.gatewayHasExcess).toBe(true);
    expect(writeBody("PATCH", "factory_attempts")).toMatchObject({ estimated_cost: 10, actual_cost: 9 });
  });

  it("gateway-recovered gate_open: recovery gate returns its reason and finishes only the run", async () => {
    getLatestMock.mockResolvedValue({ id: "op-g", state: "sent" });
    recoverMock.mockResolvedValue({ kind: "gate_open", operation: { id: "op-g" }, reason: "gateway_response_unknown" });
    const ctx = baseCtx(gatewayWorkItem(), "generate_draft_mock");
    const result = await runContentStep(ctx);
    expect(respondBody(result)).toMatchObject({ status: "gateway_response_unknown" });
    expect(ctx.finishStep).not.toHaveBeenCalled();
    expect(ctx.finishRun).toHaveBeenCalledWith(1, 0, 0);
  });

  it("gateway-recovered lost_race: recovery race returns gateway_recovery_race without finishing the step", async () => {
    getLatestMock.mockResolvedValue({ id: "op-g", state: "sent" });
    recoverMock.mockResolvedValue({ kind: "lost_race", operation: { id: "op-g" } });
    const ctx = baseCtx(gatewayWorkItem(), "generate_draft_mock");
    const result = await runContentStep(ctx);
    expect(respondBody(result)).toMatchObject({ status: "gateway_recovery_race" });
    expect(ctx.finishStep).not.toHaveBeenCalled();
    expect(ctx.finishRun).toHaveBeenCalledWith(1, 0, 0);
  });

  it("gateway-recovered blocked: recovery block finishes the step blocked and blocks the work item", async () => {
    getLatestMock.mockResolvedValue({ id: "op-g", state: "sent" });
    recoverMock.mockResolvedValue({
      kind: "blocked",
      operation: { id: "op-g" },
      reason: "gateway_response_invalid",
    });
    const ctx = baseCtx(gatewayWorkItem(), "generate_draft_mock");
    const result = await runContentStep(ctx);
    expect(respondBody(result)).toMatchObject({ status: "gateway_recovery_blocked", reason: "gateway_response_invalid" });
    expect(ctx.finishStep).toHaveBeenCalledWith(
      "blocked",
      "failed",
      "not_required",
      "gateway_response_invalid",
      null,
      null,
    );
    expect(ctx.blockWorkItem).toHaveBeenCalledWith(expect.anything(), "gateway_response_invalid");
    expect(ctx.finishRun).toHaveBeenCalledWith(1, 0, 1);
  });

  it("gateway-recovered: recovered outcome finishes the step succeeded and never patches the gateway operation itself", async () => {
    getLatestMock.mockResolvedValue({ id: "op-rec", state: "sent" });
    recoverMock.mockResolvedValue({
      kind: "recovered",
      operation: { id: "op-rec", estimated_cost: 12, actual_cost: 9 },
      paragraph: "پاراگراف بازیابی‌شده.",
      settledFromStored: true,
      excessAmount: null,
    });
    setupArtifactReads();
    standardWrites();
    const ctx = baseCtx(gatewayWorkItem(), "generate_draft_mock");
    const result = await runContentStep(ctx);
    expect(respondBody(result)).toMatchObject({ status: "step_succeeded" });
    // The settled transition lives inside recoverGatewayArtifact (mocked
    // here); the handler's recovered respond path must not settle the
    // operation a second time, and the route tail does not run for a
    // respond path either, so no gateway-operation PATCH may appear.
    expect(writeMock.mock.calls.filter((c) => String(c[2]).startsWith("factory_gateway_operations"))).toHaveLength(0);
    expect(ctx.finishStep).toHaveBeenCalledWith("succeeded", "succeeded", "not_required", null, "art-new", null);
    expect(ctx.finishRun).toHaveBeenCalledWith(1, 1, 0);
  });

  it("gateway-recovered with excess: recovered outcome keeps reconciliation pending", async () => {
    getLatestMock.mockResolvedValue({ id: "op-rec", state: "sent" });
    recoverMock.mockResolvedValue({
      kind: "recovered",
      operation: { id: "op-rec", estimated_cost: 12, actual_cost: 20 },
      paragraph: "پاراگراف بازیابی‌شده.",
      settledFromStored: true,
      excessAmount: 8,
    });
    setupArtifactReads();
    standardWrites();
    const ctx = baseCtx(gatewayWorkItem(), "generate_draft_mock");
    const result = await runContentStep(ctx);
    expect(respondBody(result)).toMatchObject({ status: "step_succeeded" });
    expect(ctx.finishStep).toHaveBeenCalledWith("succeeded", "succeeded", "pending", null, "art-new", null);
    expect(ctx.finishRun).toHaveBeenCalledWith(1, 1, 0);
  });

  it("gateway outcome-unknown: unknown call blocks the step with outcome_unknown and pending reconciliation", async () => {
    getLatestMock.mockResolvedValue(null);
    openMock.mockResolvedValue({ kind: "created", operation: { id: "op-u" } });
    runCallMock.mockResolvedValue({ kind: "unknown", operation: { id: "op-u" }, response: {}, providerCalls: 0, mockCalls: 0 });
    const ctx = baseCtx(gatewayWorkItem(), "generate_draft_mock");
    const result = await runContentStep(ctx);
    expect(respondBody(result)).toMatchObject({ status: "gateway_outcome_unknown" });
    expect(ctx.finishStep).toHaveBeenCalledWith("blocked", "outcome_unknown", "pending", "timeout", null, null);
    expect(ctx.finishRun).toHaveBeenCalledWith(1, 0, 1);
  });

  it("gateway budget-exhausted: budget failure blocks the step and the work item", async () => {
    getLatestMock.mockResolvedValue(null);
    openMock.mockResolvedValue({ kind: "created", operation: { id: "op-b" } });
    runCallMock.mockResolvedValue({
      kind: "failed",
      operation: { id: "op-b" },
      response: { error: { code: "budget_exceeded" } },
      providerCalls: 0,
      mockCalls: 0,
    });
    const ctx = baseCtx(gatewayWorkItem(), "generate_draft_mock");
    const result = await runContentStep(ctx);
    expect(respondBody(result)).toMatchObject({ status: "budget_exhausted" });
    expect(ctx.finishStep).toHaveBeenCalledWith("blocked", "failed", "not_required", "budget_exhausted", null, null);
    expect(ctx.blockWorkItem).toHaveBeenCalledWith(expect.anything(), "budget_exhausted");
    expect(ctx.finishRun).toHaveBeenCalledWith(1, 0, 1);
  });
});

function publishWorkItem(overrides: Record<string, unknown> = {}): ContentStepContext["workItem"] {
  return baseWorkItem({
    status: "approved",
    result_artifact_id: "art-1",
    result_version_id: "ver-1",
    publication_id: null,
    ...overrides,
  });
}

function setupPublishReads(): void {
  getMock.mockImplementation(async (cfg: unknown, path: string) => {
    if (path.startsWith("factory_artifacts")) return [ARTIFACT];
    if (path.startsWith("factory_approvals")) return [{ id: "appr-1", artifact_id: "art-1", artifact_hash: HASH }];
    if (path.startsWith("content_documents")) return [{ id: "doc-1", content_type: "guide", published_version_id: null }];
    if (path.startsWith("content_versions")) return [{ id: "ver-1", schema_version: "publish_payload_v1" }];
    throw new Error(`unexpected get ${path}`);
  });
}

describe("content runtime handler publish_version (step-4 preconditions, item 2)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("publish_version replay shortcut: an existing publication_id completes without any publish call", async () => {
    const ctx = baseCtx(publishWorkItem({ publication_id: "pub-existing" }), "publish_version");
    const result = await runContentStep(ctx);
    expect(result.kind).toBe("completed");
    if (result.kind !== "completed") throw new Error("expected completed");
    expect(result.outputArtifactId).toBeNull();
    expect(getMock).not.toHaveBeenCalled();
    expect(writeMock).not.toHaveBeenCalled();
    expect(publishV2Mock).not.toHaveBeenCalled();
    expect(rpcMock).not.toHaveBeenCalled();
    expect(ctx.finishStep).not.toHaveBeenCalled();
  });

  it("publish_version v2: update_content publishes through publishUpdateContent and records the publication", async () => {
    setupPublishReads();
    standardWrites();
    publishV2Mock.mockResolvedValue({
      publicationId: "pub-v2",
      outboxId: null,
      previousVersionId: null,
      versionId: "ver-1",
      replayed: false,
      dailyCount: 1,
      previousPreserved: null,
    });
    const ctx = baseCtx(publishWorkItem({ work_type: "update_content" }), "publish_version");
    const result = await runContentStep(ctx);
    expect(result.kind).toBe("completed");
    expect(publishV2Mock).toHaveBeenCalledTimes(1);
    expect(publishV2Mock.mock.calls[0][1]).toMatchObject({ workItemId: "wi-1", versionId: "ver-1" });
    expect(rpcMock).not.toHaveBeenCalled();
    expect(writeBody("PATCH", "factory_work_items")).toMatchObject({ publication_id: "pub-v2", status: "publishing" });
    expect(ctx.finishStep).not.toHaveBeenCalled();
  });

  it("publish_version legacy: other work types publish through the publish_content_atomic RPC", async () => {
    setupPublishReads();
    standardWrites();
    rpcMock.mockImplementation(async (cfg: unknown, fn: string) => {
      if (fn === "publish_content_atomic") return { publication_id: "pub-legacy" };
      throw new Error(`unexpected rpc ${fn}`);
    });
    const ctx = baseCtx(publishWorkItem({ work_type: "create_content" }), "publish_version");
    const result = await runContentStep(ctx);
    expect(result.kind).toBe("completed");
    expect(publishV2Mock).not.toHaveBeenCalled();
    expect(rpcMock).toHaveBeenCalledWith(expect.anything(), "publish_content_atomic", expect.objectContaining({ p_version_id: "ver-1" }));
    expect(writeBody("PATCH", "factory_work_items")).toMatchObject({ publication_id: "pub-legacy", status: "publishing" });
  });

  it("publish_version crash-after-publication (v2): run failed, HTTP 500, step left claimed, no work-item PATCH", async () => {
    setupPublishReads();
    standardWrites();
    publishV2Mock.mockResolvedValue({
      publicationId: "pub-v2",
      outboxId: null,
      previousVersionId: null,
      versionId: "ver-1",
      replayed: false,
      dailyCount: 1,
      previousPreserved: null,
    });
    const ctx = baseCtx(publishWorkItem({ work_type: "update_content" }), "publish_version");
    ctx.testCrashAfterPublication = true;
    const result = await runContentStep(ctx);
    expect(result.kind).toBe("respond");
    if (result.kind !== "respond") throw new Error("expected respond");
    expect(result.status).toBe(500);
    expect(result.body).toMatchObject({ status: "crash_after_publication", step_key: "publish_version", fencing_token: 1 });
    expect(writeBody("PATCH", "factory_runs")).toMatchObject({
      run_status: "failed",
      items_claimed: 1,
      items_completed: 0,
      items_failed: 1,
    });
    expect(writeMock.mock.calls.filter((c) => String(c[2]).startsWith("factory_work_items"))).toHaveLength(0);
    expect(ctx.finishStep).not.toHaveBeenCalled();
    expect(ctx.finishRun).not.toHaveBeenCalled();
    expect(ctx.blockWorkItem).not.toHaveBeenCalled();
  });

  it("publish_version crash-after-publication (legacy): same crash contract through the RPC path", async () => {
    setupPublishReads();
    standardWrites();
    rpcMock.mockImplementation(async (cfg: unknown, fn: string) => {
      if (fn === "publish_content_atomic") return { publication_id: "pub-legacy" };
      throw new Error(`unexpected rpc ${fn}`);
    });
    const ctx = baseCtx(publishWorkItem({ work_type: "create_content" }), "publish_version");
    ctx.testCrashAfterPublication = true;
    const result = await runContentStep(ctx);
    expect(result.kind).toBe("respond");
    if (result.kind !== "respond") throw new Error("expected respond");
    expect(result.status).toBe(500);
    expect(result.body).toMatchObject({ status: "crash_after_publication" });
    expect(writeBody("PATCH", "factory_runs")).toMatchObject({ run_status: "failed" });
    expect(writeMock.mock.calls.filter((c) => String(c[2]).startsWith("factory_work_items"))).toHaveLength(0);
    expect(ctx.finishStep).not.toHaveBeenCalled();
  });
});

const PREV_PAYLOAD: PublishPayload = {
  ...PAYLOAD,
  sections: [{ position: 1, heading: "بخش اول", paragraphs: ["پاراگراف قدیمی."] }],
};

function verifyWorkItem(overrides: Record<string, unknown> = {}): ContentStepContext["workItem"] {
  return baseWorkItem({
    status: "publishing",
    workflow_version: "guide_content_auto_v1",
    publication_id: "pub-1",
    result_version_id: "ver-1",
    ...overrides,
  });
}

function setupVerifyReads(previousVersionId: string | null): void {
  getMock.mockImplementation(async (cfg: unknown, path: string) => {
    if (path.startsWith("factory_publications")) return [{ id: "pub-1", previous_version_id: previousVersionId }];
    if (path.startsWith("content_documents")) return [{ id: "doc-1", canonical_path: "/guide/thailand-visa-guide" }];
    if (path.startsWith("content_versions")) {
      if (path.includes("ver-prev")) return [{ payload: PREV_PAYLOAD }];
      return [{ payload: PAYLOAD }];
    }
    throw new Error(`unexpected get ${path}`);
  });
}

function sitemapFetch(): ReturnType<typeof vi.fn> {
  return vi.fn(async (url: unknown) => {
    const u = String(url);
    if (u.includes("/sitemap.xml")) {
      return { status: 200, text: async () => "<urlset><url><loc>http://test/guide/thailand-visa-guide</loc></url></urlset>" };
    }
    throw new Error(`unexpected fetch ${u}`);
  });
}

describe("content runtime handler verify_publication (step-4 preconditions, item 3)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("verify_publication success falls through to completed with no step finish and no audit write", async () => {
    setupVerifyReads(null);
    standardWrites();
    verifyPageMock.mockResolvedValue({ result: { ok: true, reasons: [] }, attemptsUsed: 1 });
    vi.stubGlobal("fetch", sitemapFetch());
    const ctx = baseCtx(verifyWorkItem(), "verify_publication");
    const result = await runContentStep(ctx);
    expect(result.kind).toBe("completed");
    if (result.kind !== "completed") throw new Error("expected completed");
    expect(result.outputArtifactId).toBeNull();
    expect(ctx.finishStep).not.toHaveBeenCalled();
    expect(ctx.finishRun).not.toHaveBeenCalled();
    expect(ctx.blockWorkItem).not.toHaveBeenCalled();
    expect(writeMock.mock.calls.filter((c) => c[2] === "factory_audit_events")).toHaveLength(0);
  });

  it("verify_publication failure with a previous version rolls back, pumps, audits and blocks", async () => {
    setupVerifyReads("ver-prev");
    standardWrites();
    verifyPageMock.mockResolvedValue({ result: { ok: false, reasons: ["page stale"] }, attemptsUsed: 3 });
    processOutboxMock.mockResolvedValue({ status: 200, body: { status: "verified" } });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: unknown) => {
        const u = String(url);
        if (u.includes("/sitemap.xml")) {
          return { status: 200, text: async () => "<urlset><url><loc>http://test/guide/thailand-visa-guide</loc></url></urlset>" };
        }
        if (u.includes("/api/internal/factory/rollback")) {
          return { status: 200, text: async () => JSON.stringify({ publication_id: "pub-rb" }) };
        }
        throw new Error(`unexpected fetch ${u}`);
      }),
    );
    const ctx = baseCtx(verifyWorkItem(), "verify_publication");
    const result = await runContentStep(ctx);
    expect(respondBody(result)).toMatchObject({ status: "auto_verify_failed_rollback" });
    expect(respondBody(result).rollback as string).toContain("rollback publication pub-rb");
    expect(processOutboxMock).toHaveBeenCalledTimes(1);
    expect(writeBody("POST", "factory_audit_events")).toMatchObject({ publication_id: "pub-1", kind: "intervention" });
    expect(ctx.finishStep).toHaveBeenCalledWith("blocked", "failed", "not_required", "auto_verify_failed", null, null);
    expect(ctx.blockWorkItem).toHaveBeenCalledWith(expect.anything(), "auto_verify_failed");
    expect(ctx.finishRun).toHaveBeenCalledWith(1, 0, 1);
  });

  it("verify_publication failure without a previous version unpublishes and audits, with no rollback call", async () => {
    setupVerifyReads(null);
    standardWrites();
    verifyPageMock.mockResolvedValue({ result: { ok: false, reasons: ["page stale"] }, attemptsUsed: 3 });
    const fetchMock = vi.fn(async (url: unknown) => {
      const u = String(url);
      if (u.includes("/sitemap.xml")) {
        return { status: 200, text: async () => "<urlset><url><loc>http://test/guide/thailand-visa-guide</loc></url></urlset>" };
      }
      throw new Error(`unexpected fetch ${u}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    const ctx = baseCtx(verifyWorkItem(), "verify_publication");
    const result = await runContentStep(ctx);
    expect(respondBody(result)).toMatchObject({ status: "auto_verify_failed_rollback" });
    expect(respondBody(result).rollback).toBe("unpublished (no previous version)");
    expect(fetchMock.mock.calls.filter((c) => String(c[0]).includes("/rollback"))).toHaveLength(0);
    expect(writeBody("PATCH", "content_documents")).toMatchObject({ status: "draft", published_version_id: null });
    expect(writeBody("POST", "factory_audit_events")).toMatchObject({ kind: "intervention" });
    expect(ctx.finishStep).toHaveBeenCalledWith("blocked", "failed", "not_required", "auto_verify_failed", null, null);
    expect(ctx.blockWorkItem).toHaveBeenCalledWith(expect.anything(), "auto_verify_failed");
  });

  it("verify_publication rollback failure throws before audit and the generic catch requeues the step", async () => {
    setupVerifyReads("ver-prev");
    standardWrites();
    verifyPageMock.mockResolvedValue({ result: { ok: false, reasons: ["page stale"] }, attemptsUsed: 3 });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: unknown) => {
        const u = String(url);
        if (u.includes("/sitemap.xml")) {
          return { status: 200, text: async () => "<urlset><url><loc>http://test/guide/thailand-visa-guide</loc></url></urlset>" };
        }
        if (u.includes("/api/internal/factory/rollback")) {
          return { status: 500, text: async () => JSON.stringify({ error: "boom" }) };
        }
        throw new Error(`unexpected fetch ${u}`);
      }),
    );
    const ctx = baseCtx(verifyWorkItem(), "verify_publication");
    const result = await runContentStep(ctx);
    expect(result.kind).toBe("respond");
    if (result.kind !== "respond") throw new Error("expected respond");
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ status: "step_failed" });
    expect(result.body as Record<string, unknown>).toMatchObject({ error: expect.stringContaining("auto rollback failed") });
    // No audit row: the throw happens before the audit write, exactly as
    // recorded in the step-3 QA (S-Q6); the retry-covers-it reading is
    // that the requeued step retries verification and therefore the
    // rollback on the next tick.
    expect(writeMock.mock.calls.filter((c) => c[2] === "factory_audit_events")).toHaveLength(0);
    expect(ctx.finishStep).toHaveBeenCalledWith("queued", "failed", "not_required", expect.stringContaining("auto rollback failed"), null, null);
    expect(ctx.blockWorkItem).not.toHaveBeenCalled();
    expect(ctx.finishRun).toHaveBeenCalledWith(1, 0, 1);
  });
});

describe("content runtime handler process_publication and complete_work (step-4 preconditions, items 4-5)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function processWorkItem(): ContentStepContext["workItem"] {
    return baseWorkItem({ status: "publishing", publication_id: "pub-1" });
  }

  it("process_publication verified shortcut completes without pumping the outbox", async () => {
    getMock.mockImplementation(async (cfg: unknown, path: string) => {
      if (path.startsWith("factory_publications")) return [{ id: "pub-1", status: "verified" }];
      throw new Error(`unexpected get ${path}`);
    });
    const ctx = baseCtx(processWorkItem(), "process_publication");
    const result = await runContentStep(ctx);
    expect(result.kind).toBe("completed");
    expect(processOutboxMock).not.toHaveBeenCalled();
    expect(ctx.finishStep).not.toHaveBeenCalled();
  });

  it("process_publication needs_intervention blocks the step and the work item", async () => {
    getMock.mockImplementation(async (cfg: unknown, path: string) => {
      if (path.startsWith("factory_publications")) return [{ id: "pub-1", status: "pending" }];
      throw new Error(`unexpected get ${path}`);
    });
    processOutboxMock.mockResolvedValue({ status: 200, body: { status: "needs_intervention" } });
    const ctx = baseCtx(processWorkItem(), "process_publication");
    const result = await runContentStep(ctx);
    expect(respondBody(result)).toMatchObject({ status: "publication_needs_intervention" });
    expect(ctx.finishStep).toHaveBeenCalledWith(
      "blocked",
      "failed",
      "needs_intervention",
      "publication_needs_intervention",
      null,
      null,
    );
    expect(ctx.blockWorkItem).toHaveBeenCalledWith(expect.anything(), "publication_needs_intervention");
    expect(ctx.finishRun).toHaveBeenCalledWith(1, 0, 1);
  });

  it("process_publication verification_pending requeues with the pump next_attempt_at", async () => {
    getMock.mockImplementation(async (cfg: unknown, path: string) => {
      if (path.startsWith("factory_publications")) return [{ id: "pub-1", status: "pending" }];
      throw new Error(`unexpected get ${path}`);
    });
    processOutboxMock.mockResolvedValue({ status: 200, body: { status: "pending", next_attempt_at: "2026-11-03T00:00:00Z" } });
    const ctx = baseCtx(processWorkItem(), "process_publication");
    const result = await runContentStep(ctx);
    expect(respondBody(result)).toMatchObject({ status: "verification_pending", next_attempt_at: "2026-11-03T00:00:00Z" });
    expect(ctx.finishStep).toHaveBeenCalledWith(
      "queued",
      "failed",
      "not_required",
      "verification_pending",
      null,
      "2026-11-03T00:00:00Z",
    );
    expect(ctx.finishRun).toHaveBeenCalledWith(1, 0, 0);
  });

  it("complete_work not_ready: a complete response whose work item is not succeeded requeues", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: unknown) => {
        const u = String(url);
        if (u.includes("/api/internal/work-items/")) {
          return { status: 200, text: async () => JSON.stringify({ work_item: { status: "queued" } }) };
        }
        throw new Error(`unexpected fetch ${u}`);
      }),
    );
    const ctx = baseCtx(baseWorkItem({ status: "publishing" }), "complete_work");
    const result = await runContentStep(ctx);
    expect(respondBody(result)).toMatchObject({ status: "complete_not_ready" });
    expect(ctx.finishStep).toHaveBeenCalledWith("queued", "failed", "not_required", "complete_not_ready", null, null);
    expect(ctx.finishRun).toHaveBeenCalledWith(1, 0, 0);
  });
});

describe("content runtime handler generic catch (step-4 preconditions, item 6)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("generic catch simulated-crash: a simulated crash returns 500 and leaves the step claimed", async () => {
    getMock.mockImplementation(async () => {
      throw new SimulatedCrashError("artifact");
    });
    const ctx = baseCtx(baseWorkItem(), "validate_artifact");
    const result = await runContentStep(ctx);
    expect(result.kind).toBe("respond");
    if (result.kind !== "respond") throw new Error("expected respond");
    expect(result.status).toBe(500);
    expect(result.body).toMatchObject({ status: "crash_after_artifact", step_key: "validate_artifact" });
    expect(writeBody("PATCH", "factory_runs")).toMatchObject({
      run_status: "failed",
      items_claimed: 1,
      items_completed: 0,
      items_failed: 1,
    });
    expect(ctx.finishStep).not.toHaveBeenCalled();
    expect(ctx.finishRun).not.toHaveBeenCalled();
    expect(ctx.blockWorkItem).not.toHaveBeenCalled();
  });

  it("generic catch exhausted: attempt at the cap blocks the step and the work item with attempts_exhausted", async () => {
    getMock.mockImplementation(async (cfg: unknown, path: string) => {
      if (path.startsWith("factory_artifacts")) return [{ ...ARTIFACT, artifact_hash: "0".repeat(64) }];
      throw new Error(`unexpected get ${path}`);
    });
    const ctx = baseCtx(baseWorkItem(), "validate_artifact");
    ctx.claimed.attempt_count = 5;
    ctx.claimed.max_attempts = 5;
    const result = await runContentStep(ctx);
    expect(respondBody(result)).toMatchObject({ status: "attempts_exhausted", attempt_no: 5 });
    expect(ctx.finishStep).toHaveBeenCalledWith("blocked", "failed", "not_required", "artifact content_hash mismatch", null, null);
    expect(ctx.blockWorkItem).toHaveBeenCalledWith(expect.anything(), "attempts_exhausted");
    expect(ctx.finishRun).toHaveBeenCalledWith(1, 0, 1);
  });

  it("generic catch non-exhausted: an ordinary failure requeues the step as step_failed", async () => {
    getMock.mockImplementation(async (cfg: unknown, path: string) => {
      if (path.startsWith("content_documents")) return [];
      throw new Error(`unexpected get ${path}`);
    });
    const ctx = baseCtx(baseWorkItem(), "prepare_context");
    const result = await runContentStep(ctx);
    expect(respondBody(result)).toMatchObject({ status: "step_failed", error: "content document not found" });
    expect(ctx.finishStep).toHaveBeenCalledWith("queued", "failed", "not_required", "content document not found", null, null);
    expect(ctx.blockWorkItem).not.toHaveBeenCalled();
    expect(ctx.finishRun).toHaveBeenCalledWith(1, 0, 1);
  });
});

describe("content runtime handler auto_approve replay and unknown-key fallthrough (items 8-9)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("auto_approve replay direct: an existing system approval creates no second row but the policy PATCH still runs", async () => {
    getMock.mockImplementation(async (cfg: unknown, path: string) => {
      if (path.startsWith("factory_artifacts")) return [ARTIFACT];
      if (path.startsWith("factory_approvals")) return [{ id: "appr-existing" }];
      throw new Error(`unexpected get ${path}`);
    });
    standardWrites();
    const ctx = baseCtx(
      baseWorkItem({ status: "awaiting_approval", workflow_version: "guide_content_auto_v1" }),
      "auto_approve",
    );
    const result = await runContentStep(ctx);
    expect(result.kind).toBe("completed");
    if (result.kind !== "completed") throw new Error("expected completed");
    expect(result.outputArtifactId).toBeNull();
    expect(writeMock.mock.calls.filter((c) => c[1] === "POST" && c[2] === "factory_approvals")).toHaveLength(0);
    expect(writeMock.mock.calls.filter((c) => c[1] === "PATCH" && String(c[2]).startsWith("factory_work_items"))).toHaveLength(1);
    expect(writeBody("PATCH", "factory_work_items")).toMatchObject({
      status: "approved",
      policy_decision: "auto",
      policy_decided_by: "system:autonomous",
    });
  });

  it("unknown-key fallthrough: an unmatched step key completes with null output (documented pre-existing behavior, not changed)", async () => {
    // Step-3 QA A-Q7: the route gate blocks unknown keys before claim,
    // so this fallthrough is unreachable from the route; the handler
    // deliberately preserves the HEAD behavior instead of throwing.
    // This test pins that behavior as-is; it is not a fix.
    const ctx = baseCtx(
      baseWorkItem(),
      "bogus_step" as unknown as ContentStepContext["claimed"]["step_key"],
    );
    const result = await runContentStep(ctx);
    expect(result).toEqual({
      kind: "completed",
      outputArtifactId: null,
      gatewayOperationId: null,
      gatewayHasExcess: false,
    });
    expect(ctx.finishStep).not.toHaveBeenCalled();
    expect(ctx.finishRun).not.toHaveBeenCalled();
    expect(ctx.blockWorkItem).not.toHaveBeenCalled();
    expect(writeMock).not.toHaveBeenCalled();
  });
});

describe("content runtime handler close-out additions (step-4 close-out)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("complete_work success: a complete response whose work item is succeeded completes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: unknown) => {
        const u = String(url);
        if (u.includes("/api/internal/work-items/")) {
          return { status: 200, text: async () => JSON.stringify({ work_item: { status: "succeeded" } }) };
        }
        throw new Error(`unexpected fetch ${u}`);
      }),
    );
    const ctx = baseCtx(baseWorkItem({ status: "publishing" }), "complete_work");
    const result = await runContentStep(ctx);
    expect(result.kind).toBe("completed");
    expect(ctx.finishStep).not.toHaveBeenCalled();
    expect(ctx.finishRun).not.toHaveBeenCalled();
    expect(ctx.blockWorkItem).not.toHaveBeenCalled();
  });

  it("process_publication pump-verified completes without a step finish", async () => {
    getMock.mockImplementation(async (cfg: unknown, path: string) => {
      if (path.startsWith("factory_publications")) return [{ id: "pub-1", status: "pending" }];
      throw new Error(`unexpected get ${path}`);
    });
    processOutboxMock.mockResolvedValue({ status: 200, body: { status: "verified" } });
    const ctx = baseCtx(baseWorkItem({ status: "publishing", publication_id: "pub-1" }), "process_publication");
    const result = await runContentStep(ctx);
    expect(result.kind).toBe("completed");
    expect(processOutboxMock).toHaveBeenCalledTimes(1);
    expect(ctx.finishStep).not.toHaveBeenCalled();
  });

  it("generic catch simulated-crash after artifact_registered returns 500 and leaves the step claimed", async () => {
    getMock.mockImplementation(async () => {
      throw new SimulatedCrashError("artifact_registered");
    });
    const ctx = baseCtx(baseWorkItem(), "validate_artifact");
    const result = await runContentStep(ctx);
    expect(result.kind).toBe("respond");
    if (result.kind !== "respond") throw new Error("expected respond");
    expect(result.status).toBe(500);
    expect(result.body).toMatchObject({ status: "crash_after_artifact_registered", step_key: "validate_artifact" });
    expect(writeBody("PATCH", "factory_runs")).toMatchObject({
      run_status: "failed",
      items_claimed: 1,
      items_completed: 0,
      items_failed: 1,
    });
    expect(ctx.finishStep).not.toHaveBeenCalled();
    expect(ctx.finishRun).not.toHaveBeenCalled();
    expect(ctx.blockWorkItem).not.toHaveBeenCalled();
  });

  it("verify_publication rollback failure at the attempt cap blocks with attempts_exhausted", async () => {
    setupVerifyReads("ver-prev");
    standardWrites();
    verifyPageMock.mockResolvedValue({ result: { ok: false, reasons: ["page stale"] }, attemptsUsed: 3 });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: unknown) => {
        const u = String(url);
        if (u.includes("/sitemap.xml")) {
          return { status: 200, text: async () => "<urlset><url><loc>http://test/guide/thailand-visa-guide</loc></url></urlset>" };
        }
        if (u.includes("/api/internal/factory/rollback")) {
          return { status: 500, text: async () => JSON.stringify({ error: "boom" }) };
        }
        throw new Error(`unexpected fetch ${u}`);
      }),
    );
    const ctx = baseCtx(verifyWorkItem(), "verify_publication");
    ctx.claimed.attempt_count = 5;
    ctx.claimed.max_attempts = 5;
    const result = await runContentStep(ctx);
    expect(respondBody(result)).toMatchObject({ status: "attempts_exhausted", attempt_no: 5 });
    expect(respondBody(result)).toMatchObject({ error: expect.stringContaining("auto rollback failed") });
    // No audit row even at the cap: the step's last_error (recorded by
    // the finishStep call below) plus this step_failed-family response
    // is the audit trail, exactly as recorded in the step-4 QA. This
    // test pins that visibility, it does not add an audit write.
    expect(writeMock.mock.calls.filter((c) => c[2] === "factory_audit_events")).toHaveLength(0);
    expect(ctx.finishStep).toHaveBeenCalledWith("blocked", "failed", "not_required", expect.stringContaining("auto rollback failed"), null, null);
    expect(ctx.blockWorkItem).toHaveBeenCalledWith(expect.anything(), "attempts_exhausted");
    expect(ctx.finishRun).toHaveBeenCalledWith(1, 0, 1);
  });
});
