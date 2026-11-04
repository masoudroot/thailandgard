/**
 * تست دمِ مسیر Tick برای قدم Gateway (THG-TEAM-ARCHITECTURE-01
 * فاز ۲، گام ۴، پیش‌شرط ۷): نتیجهٔ completed از Handler با
 * gatewayOperationId، از دمِ مسیر می‌گذرد: finishStep با
 * reconciliation برابر pending (چون اضافه‌هزینه باز است)، وصلهٔ
 * settled روی عملیات Gateway و finishRun با (1,1,0). همه‌چیز
 * ساختگی است؛ بدون دیتابیس و بدون فراخوان ارائه‌دهنده.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { computeContentHash, type PublishPayload } from "@/lib/content-versioning";

const { getMock, writeMock, rpcMock, getLatestMock, openMock, runCallMock, patchOperationMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  writeMock: vi.fn(),
  rpcMock: vi.fn(),
  getLatestMock: vi.fn(),
  openMock: vi.fn(),
  runCallMock: vi.fn(),
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
  recoverGatewayArtifact: vi.fn().mockResolvedValue({ kind: "no_operation" }),
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

import { POST as tickPOST } from "@/app/api/factory/tick/route";

process.env.INTERNAL_PUBLISH_TOKEN = "test-token";

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

const gwWorkItem = {
  id: "wi-gw",
  work_key: "wk-gw",
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
};

const gwStep = {
  id: "step-gw",
  work_item_id: "wi-gw",
  step_key: "generate_draft_mock",
  sequence_no: 2,
  status: "queued",
  attempt_count: 0,
  max_attempts: 5,
  scheduled_at: "2026-11-01T00:00:00Z",
  lease_until: null,
  fencing_token: 1,
};

function setupTick(): void {
  getMock.mockImplementation(async (cfg: unknown, path: string) => {
    if (path.startsWith("factory_settings")) {
      return [
        { key: "factory_paused", value: "false" },
        { key: "generation_enabled", value: "true" },
        { key: "data_publishing_enabled", value: "true" },
      ];
    }
    // بوت‌استرپ: آیتم از پیش Step دارد پس بوت‌استرپ زنجیرهٔ تازه نمی‌سازد.
    if (path.startsWith("factory_work_steps?work_item_id=eq.wi-gw&select=id&limit=1")) return [gwStep];
    if (path.startsWith("factory_work_steps?work_item_id=eq.wi-gw&select=step_key")) {
      return [
        { step_key: "prepare_context", sequence_no: 1, status: "succeeded" },
        { step_key: "generate_draft_mock", sequence_no: 2, status: "queued" },
      ];
    }
    if (path.startsWith("factory_work_steps?status=in.")) return [gwStep];
    if (path.startsWith("factory_work_items?id=eq.")) return [gwWorkItem];
    if (path.startsWith("factory_work_items")) return [];
    if (path.startsWith("content_documents")) return [{ id: "doc-1", published_version_id: "ver-pub" }];
    if (path.startsWith("content_versions")) return [{ payload: PAYLOAD }];
    if (path.startsWith("factory_artifacts")) return [];
    throw new Error(`unexpected tick get ${path}`);
  });
  writeMock.mockImplementation(async (cfg: unknown, method: string, path: string) => {
    if (method === "POST" && path === "factory_runs") return [{ id: "run-1" }];
    if (method === "POST" && path === "factory_attempts") return [{ id: "att-1" }];
    if (method === "POST" && path === "factory_artifacts") return [{ id: "art-new" }];
    if (method === "PATCH" && path.startsWith("factory_work_items")) return [{ id: "wi-gw" }];
    if (method === "PATCH" && path.startsWith("factory_attempts")) return [{ id: "att-1" }];
    if (method === "PATCH" && path.startsWith("factory_runs")) return [{ id: "run-1" }];
    throw new Error(`unexpected tick write ${method} ${path}`);
  });
  rpcMock.mockImplementation(async (cfg: unknown, fn: string) => {
    if (fn === "claim_work_step_by_id") return [{ ...gwStep, attempt_count: 1, fencing_token: 1 }];
    if (fn === "finish_work_step") return [{ id: "step-gw" }];
    throw new Error(`unexpected tick rpc ${fn}`);
  });
  getLatestMock.mockResolvedValue(null);
  openMock.mockResolvedValue({ kind: "created", operation: { id: "op-tail" } });
  runCallMock.mockResolvedValue({
    kind: "succeeded",
    operation: { id: "op-tail" },
    response: {
      output: { draft_paragraph: "پاراگراف تازه." },
      estimated_cost: 10,
      actual_cost: 9,
      reconciliation: { excess_amount: 5 },
    },
    providerCalls: 1,
    mockCalls: 1,
  });
  patchOperationMock.mockResolvedValue({ id: "op-tail", state: "settled" });
}

describe("tick route gateway completed tail (step-4 precondition, item 7)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("a handler completed gateway result settles the operation and keeps reconciliation pending in the tail", async () => {
    setupTick();
    const req = new NextRequest("http://test/api/factory/tick", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await tickPOST(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string; step_key: string };
    expect(body).toMatchObject({ status: "step_succeeded", step_key: "generate_draft_mock" });
    // دمِ مسیر: finishStep با reconciliation برابر pending، چون
    // Handler، gatewayHasExcess برابر true برگردانده است.
    expect(rpcMock).toHaveBeenCalledWith(
      expect.anything(),
      "finish_work_step",
      expect.objectContaining({
        p_new_status: "succeeded",
        p_finish_status: "succeeded",
        p_reconciliation_status: "pending",
        p_output_artifact_id: "art-new",
      }),
    );
    // دم R3C عملیات Gateway را با وضعیت settled ثبت می‌کند.
    expect(patchOperationMock).toHaveBeenCalledWith(expect.anything(), "op-tail", { state: "settled" });
    // Run با (1,1,0) خاتمه می‌یابد.
    const runPatch = writeMock.mock.calls.find(
      (c) => c[1] === "PATCH" && String(c[2]).startsWith("factory_runs"),
    );
    expect(runPatch).toBeDefined();
    expect(runPatch?.[3]).toMatchObject({
      run_status: "completed",
      items_claimed: 1,
      items_completed: 1,
      items_failed: 0,
    });
    // Artifact تازه، بار منتشرشده با پاراگراف جای‌گذاری‌شده از
    // خروجی Gateway است و Hash آن، Hash واقعی همان بار است.
    const artifactPost = writeMock.mock.calls.find(
      (c) => c[1] === "POST" && c[2] === "factory_artifacts",
    );
    expect(artifactPost).toBeDefined();
    const postedPayload = (artifactPost?.[3] as { payload: PublishPayload }).payload;
    expect(postedPayload.sections[0].paragraphs[0]).toBe("پاراگراف تازه.");
    expect((artifactPost?.[3] as { artifact_hash: string }).artifact_hash).toBe(
      computeContentHash(postedPayload),
    );
  });

  it("a handler completed gateway result without excess keeps reconciliation not_required in the tail", async () => {
    setupTick();
    runCallMock.mockResolvedValue({
      kind: "succeeded",
      operation: { id: "op-tail" },
      response: {
        output: { draft_paragraph: "پاراگراف تازه." },
        estimated_cost: 10,
        actual_cost: 9,
        // No excess_amount field at all: the Handler treats excess as
        // the presence of the field, not its value, so a zero here
        // would still count as excess.
        reconciliation: {},
      },
      providerCalls: 1,
      mockCalls: 1,
    });
    const req = new NextRequest("http://test/api/factory/tick", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await tickPOST(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string; step_key: string };
    expect(body).toMatchObject({ status: "step_succeeded", step_key: "generate_draft_mock" });
    expect(rpcMock).toHaveBeenCalledWith(
      expect.anything(),
      "finish_work_step",
      expect.objectContaining({
        p_new_status: "succeeded",
        p_finish_status: "succeeded",
        p_reconciliation_status: "not_required",
        p_output_artifact_id: "art-new",
      }),
    );
    expect(patchOperationMock).toHaveBeenCalledWith(expect.anything(), "op-tail", { state: "settled" });
    const runPatch = writeMock.mock.calls.find(
      (c) => c[1] === "PATCH" && String(c[2]).startsWith("factory_runs"),
    );
    expect(runPatch?.[3]).toMatchObject({
      run_status: "completed",
      items_claimed: 1,
      items_completed: 1,
      items_failed: 0,
    });
  });

  it("an unknown step key never reaches claim: the route gate returns unknown_step_key", async () => {
    const bogusStep = { ...gwStep, id: "step-bogus", work_item_id: "wi-bogus", step_key: "bogus_step" };
    const bogusWorkItem = { ...gwWorkItem, id: "wi-bogus", work_key: "wk-bogus" };
    getMock.mockImplementation(async (cfg: unknown, path: string) => {
      if (path.startsWith("factory_settings")) {
        return [
          { key: "factory_paused", value: "false" },
          { key: "generation_enabled", value: "true" },
          { key: "data_publishing_enabled", value: "true" },
        ];
      }
      if (path.startsWith("factory_work_steps?work_item_id=eq.wi-bogus&select=id&limit=1")) return [bogusStep];
      if (path.startsWith("factory_work_steps?work_item_id=eq.wi-bogus&select=step_key")) {
        return [{ step_key: "bogus_step", sequence_no: 1, status: "queued" }];
      }
      if (path.startsWith("factory_work_steps?status=in.")) return [bogusStep];
      if (path.startsWith("factory_work_items?id=eq.")) return [bogusWorkItem];
      if (path.startsWith("factory_work_items")) return [];
      throw new Error(`unexpected tick get ${path}`);
    });
    writeMock.mockImplementation(async (cfg: unknown, method: string, path: string) => {
      if (method === "POST" && path === "factory_runs") return [{ id: "run-1" }];
      if (method === "PATCH" && path.startsWith("factory_work_items")) return [{ id: "wi-bogus" }];
      if (method === "PATCH" && path.startsWith("factory_runs")) return [{ id: "run-1" }];
      throw new Error(`unexpected tick write ${method} ${path}`);
    });
    rpcMock.mockImplementation(async () => {
      throw new Error("no rpc may run for an unknown step key");
    });
    const req = new NextRequest("http://test/api/factory/tick", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await tickPOST(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string; claimed: number; work_item_id: string };
    expect(body).toMatchObject({ status: "unknown_step_key", claimed: 0, work_item_id: "wi-bogus" });
    // The gate blocks the work item (expected), but never claims the
    // step and never finishes one: no claim_work_step_by_id rpc and
    // no finish_work_step rpc ran, or rpcMock would have thrown.
    expect(rpcMock).not.toHaveBeenCalled();
    expect(writeMock.mock.calls.filter((c) => c[1] === "POST" && c[2] === "factory_artifacts")).toHaveLength(0);
    const runPatch = writeMock.mock.calls.find(
      (c) => c[1] === "PATCH" && String(c[2]).startsWith("factory_runs"),
    );
    expect(runPatch?.[3]).toMatchObject({
      run_status: "completed",
      items_claimed: 0,
      items_completed: 0,
      items_failed: 0,
    });
  });
});
