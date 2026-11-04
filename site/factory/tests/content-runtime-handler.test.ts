/**
 * تست مستقیم Handler محتوای Tick (THG-TEAM-ARCHITECTURE-01 فاز ۲، گام ۳):
 * Handler با PostgREST ساختگی، بدون دیتابیس و بدون فراخوان ارائه‌دهنده،
 * مستقیم رانده می‌شود. قدم validate_artifact (غیرتولیدی) و قدم
 * auto_approve (آینهٔ Policy گام ۲) همان نتیجه‌ای را می‌دهند که مسیر
 * Tick پیش از استخراج می‌داد: دمِ Step (finishStep و finishRun) در
 * مسیر می‌ماند و Handler فقط نتیجه را برمی‌گرداند.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { computeContentHash, type PublishPayload } from "@/lib/content-versioning";

const { getMock, writeMock, rpcMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  writeMock: vi.fn(),
  rpcMock: vi.fn(),
}));

vi.mock("@/lib/factory/tick/internal-api", () => ({
  checkAuth: () => true,
  dbConfig: () => ({ url: "https://supabase.test", serviceKey: "service-key" }),
  postgrestGet: getMock,
  postgrestWrite: writeMock,
  postgrestRpc: rpcMock,
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
