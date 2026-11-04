/**
 * Content runtime recovery with the REAL recovery module
 * (THG-TEAM-ARCHITECTURE-01 Phase 2, step 4 close-out).
 *
 * The step-4 critique round found the settled-PATCH transition
 * unproven at the Handler boundary: every earlier recovered-path
 * test mocked recoverGatewayArtifact, so the state-filtered PATCH
 * inside claimSettledTransition never ran. This file does NOT mock
 * gateway-artifact-recovery: the real recoverGatewayArtifact runs
 * against mocked PostgREST and mocked gateway operations, and the
 * test asserts the exact settled PATCH (filter included) plus the
 * Handler's recovered response. Fixtures only: no database, no
 * provider call, no tick route.
 *
 * This file deliberately does NOT import the handler test file's
 * helpers; it carries the small copies it needs so the two files
 * stay independent.
 */
import { describe, expect, it, vi } from "vitest";
import type { PublishPayload } from "@/lib/content-versioning";

const { getMock, writeMock, getLatestMock, patchOperationMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  writeMock: vi.fn(),
  getLatestMock: vi.fn(),
  patchOperationMock: vi.fn(),
}));

vi.mock("@/lib/factory/tick/internal-api", () => ({
  checkAuth: () => true,
  dbConfig: () => ({ url: "https://supabase.test", serviceKey: "service-key" }),
  postgrestGet: getMock,
  postgrestWrite: writeMock,
  postgrestRpc: vi.fn(),
}));

vi.mock("@/lib/factory/gateway/operations", () => ({
  computeLogicalOperationId: () => "logical-wi-1-generate_draft_mock-generate_draft_mock",
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
  openGatewayOperation: vi.fn(),
  runGatewayCallForOperation: vi.fn(),
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
  publishUpdateContent: vi.fn(),
}));

vi.mock("@/lib/factory/tick/process-outbox-batch", () => ({
  processOutboxBatch: vi.fn(),
}));

vi.mock("@/lib/factory/tick/publish-outbox", () => ({
  verifyPageWithRetries: vi.fn(),
}));

// NOTE: gateway-artifact-recovery is intentionally NOT mocked here.
// The real module runs; only its PostgREST and operations boundaries
// above are mocked.
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

function gatewayWorkItem(): ContentStepContext["workItem"] {
  return {
    id: "wi-1",
    work_key: "wk-1",
    work_type: "update_content",
    title: "راهنمای ویزا",
    description: null,
    status: "queued",
    content_id: "doc-1",
    acceptance_criteria: [],
    result_artifact_id: null,
    result_version_id: null,
    publication_id: null,
    last_error: null,
    execution_mode: "tick_managed",
    workflow_version: "guide_content_gateway_v1",
    source_id: null,
    detail_url: null,
    created_at: "2026-11-02T00:00:00Z",
    updated_at: "2026-11-02T00:00:00Z",
    completed_at: null,
  } as ContentStepContext["workItem"];
}

function baseCtx(workItem: ContentStepContext["workItem"]): ContentStepContext {
  return {
    cfg: { url: "https://supabase.test", serviceKey: "service-key" },
    workItem,
    claimed: {
      id: "step-1",
      work_item_id: workItem.id,
      step_key: "generate_draft_mock",
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

function settledUnreturnedOperation(): Record<string, unknown> {
  return {
    id: "op-rec",
    logical_operation_id: "logical-wi-1-generate_draft_mock-generate_draft_mock",
    work_item_id: "wi-1",
    work_step_id: "step-1",
    factory_attempt_id: "att-1",
    gateway_attempt_id: "gw-att-1",
    attempt_no: 1,
    operation_name: "generate_draft_mock",
    idempotency_key: "r3c-wk-1-generate_draft_mock-1",
    input_fingerprint: "fp-1",
    state: "settled_unreturned",
    reserved_amount: 10,
    settled_amount: 9,
    actual_cost: 9,
    estimated_cost: 10,
    unresolved_excess: null,
    cost_basis: "simulated",
    cost_unit: "",
    provider_calls: 1,
    response_json: {
      output: { draft_paragraph: "پاراگراف بازیابی‌شده." },
      cost: 9,
      cost_basis: "simulated",
      cost_unit: "",
    },
    prior_operation_id: null,
    retry_reason: null,
    created_at: "2026-11-02T00:00:00Z",
    updated_at: "2026-11-02T00:00:00Z",
  };
}

function setupReads(): void {
  getMock.mockImplementation(async (cfg: unknown, path: string) => {
    if (path.startsWith("content_documents")) return [{ id: "doc-1", published_version_id: "ver-pub" }];
    if (path.startsWith("content_versions")) return [{ payload: PAYLOAD }];
    if (path.startsWith("factory_artifacts")) return [];
    throw new Error(`unexpected get ${path}`);
  });
}

function setupWrites(transitionRows: Record<string, unknown>[]): void {
  writeMock.mockImplementation(async (cfg: unknown, method: string, path: string) => {
    if (method === "PATCH" && path.startsWith("factory_gateway_operations")) return transitionRows;
    if (method === "POST" && path === "factory_artifacts") return [{ id: "art-new" }];
    if (method === "PATCH" && path.startsWith("factory_work_items")) return [{ id: "wi-1" }];
    if (method === "PATCH" && path.startsWith("factory_attempts")) return [{ id: "att-1" }];
    throw new Error(`unexpected write ${method} ${path}`);
  });
}

describe("content runtime real recovery (step-4 close-out)", () => {
  it("settled_unreturned with a stored response recovers through the real state-filtered PATCH", async () => {
    setupReads();
    setupWrites([{ updated_at: "2026-11-03T00:00:00Z" }]);
    getLatestMock.mockResolvedValue(settledUnreturnedOperation());
    const ctx = baseCtx(gatewayWorkItem());
    const result = await runContentStep(ctx);
    expect(result.kind).toBe("respond");
    if (result.kind !== "respond") throw new Error("expected respond");
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ status: "step_succeeded", step_key: "generate_draft_mock" });
    // The one transition that matters: exactly one PATCH, filtered by
    // the pre-transition state, setting the operation to settled.
    const settlePatches = writeMock.mock.calls.filter(
      (c) => c[1] === "PATCH" && String(c[2]).startsWith("factory_gateway_operations"),
    );
    expect(settlePatches).toHaveLength(1);
    expect(String(settlePatches[0][2])).toContain("state=eq.settled_unreturned");
    expect(settlePatches[0][3]).toMatchObject({ state: "settled" });
    // The Handler never settles through patchOperation for gateway
    // operations; the settled PATCH travels via postgrestWrite above.
    expect(patchOperationMock).not.toHaveBeenCalled();
    // The recovered attempt carries the stored costs, and the step
    // finishes succeeded with no excess reconciliation pending.
    const attemptPatch = writeMock.mock.calls.find(
      (c) => c[1] === "PATCH" && String(c[2]).startsWith("factory_attempts"),
    );
    expect(attemptPatch?.[3]).toMatchObject({ estimated_cost: 10, actual_cost: 9 });
    expect(ctx.finishStep).toHaveBeenCalledWith(
      "succeeded",
      "succeeded",
      "not_required",
      null,
      "art-new",
      null,
    );
    expect(ctx.finishRun).toHaveBeenCalledWith(1, 1, 0);
    expect(ctx.blockWorkItem).not.toHaveBeenCalled();
  });

  it("a lost race on the state-filtered PATCH returns gateway_recovery_race with no step finish", async () => {
    setupReads();
    setupWrites([]);
    getLatestMock.mockResolvedValue(settledUnreturnedOperation());
    const ctx = baseCtx(gatewayWorkItem());
    const result = await runContentStep(ctx);
    expect(result.kind).toBe("respond");
    if (result.kind !== "respond") throw new Error("expected respond");
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ status: "gateway_recovery_race", step_key: "generate_draft_mock" });
    const settlePatches = writeMock.mock.calls.filter(
      (c) => c[1] === "PATCH" && String(c[2]).startsWith("factory_gateway_operations"),
    );
    expect(settlePatches).toHaveLength(1);
    expect(writeMock.mock.calls.filter((c) => c[1] === "POST" && c[2] === "factory_artifacts")).toHaveLength(0);
    expect(ctx.finishStep).not.toHaveBeenCalled();
    expect(ctx.finishRun).toHaveBeenCalledWith(1, 0, 0);
    expect(ctx.blockWorkItem).not.toHaveBeenCalled();
  });
});
