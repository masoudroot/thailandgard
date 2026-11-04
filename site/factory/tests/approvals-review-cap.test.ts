/**
 * تست سقف بازبینی (M5، گیت کیفیت): حداکثر ۳ دور بازبینی برای یک Work
 * Item. دور چهارم با 409 رد می‌شود و هیچ Approvalای ثبت نمی‌کند.
 * مسیر approvals با internal-api ساختگی تست می‌شود (بدون دیتابیس).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

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

import { POST } from "@/app/api/internal/work-items/[id]/approvals/route";
import { POST as tickPOST } from "@/app/api/factory/tick/route";
import { isReviewLimitReached, MAX_REVIEWS_PER_WORK_ITEM } from "@/lib/factory/tick/work-items";

process.env.INTERNAL_PUBLISH_TOKEN = "test-token";

const workItem = {
  id: "wi-1",
  work_key: "wk-1",
  status: "awaiting_approval",
  content_id: "doc-1",
};

const artifact = {
  id: "art-1",
  work_item_id: "wi-1",
  artifact_hash: "a".repeat(64),
};

function setup(priorCount: number): void {
  getMock.mockImplementation(async (cfg: unknown, path: string) => {
    if (path.startsWith("factory_work_items")) return [workItem];
    if (path.startsWith("factory_artifacts")) return [artifact];
    if (path.startsWith("factory_approvals")) {
      return Array.from({ length: priorCount }, (_, i) => ({ id: `appr-${i}` }));
    }
    throw new Error(`unexpected get ${path}`);
  });
  writeMock.mockImplementation(async (cfg: unknown, method: string, path: string) => {
    if (method === "POST" && path === "factory_approvals") {
      return [{ id: "appr-new", work_item_id: "wi-1", decision: "approved" }];
    }
    if (method === "PATCH" && path.startsWith("factory_work_items")) {
      return [{ ...workItem, status: "approved" }];
    }
    throw new Error(`unexpected write ${method} ${path}`);
  });
}

function postApproval(): Promise<Response> {
  const req = new NextRequest("http://test/api/internal/work-items/wi-1/approvals", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      artifact_id: "art-1",
      artifact_hash: "a".repeat(64),
      decision: "approved",
      reviewer_id: "reviewer-1",
    }),
  });
  return POST(req, { params: Promise.resolve({ id: "wi-1" }) });
}

describe("isReviewLimitReached", () => {
  it("caps reviews at 3", () => {
    expect(MAX_REVIEWS_PER_WORK_ITEM).toBe(3);
    expect(isReviewLimitReached(2)).toBe(false);
    expect(isReviewLimitReached(3)).toBe(true);
    expect(isReviewLimitReached(4)).toBe(true);
  });
});

function postApprovalWith(extra: Record<string, unknown>): Promise<Response> {
  const req = new NextRequest("http://test/api/internal/work-items/wi-1/approvals", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      artifact_id: "art-1",
      artifact_hash: "a".repeat(64),
      decision: "approved",
      reviewer_id: "reviewer-1",
      ...extra,
    }),
  });
  return POST(req, { params: Promise.resolve({ id: "wi-1" }) });
}

function writeBody(method: string, path: string): Record<string, unknown> {
  const call = writeMock.mock.calls.find((c) => c[1] === method && String(c[2]).startsWith(path));
  if (!call) throw new Error(`no ${method} ${path} write recorded`);
  return call[3] as Record<string, unknown>;
}

describe("approvals route policy mirror (THG-TEAM-ARCHITECTURE-01 P2 step 2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("mirrors the human policy decision onto the work item", async () => {
    setup(0);
    const res = await postApproval();
    expect(res.status).toBe(200);
    const patch = writeBody("PATCH", "factory_work_items");
    expect(patch).toMatchObject({ status: "approved", policy_decision: "human" });
    expect(typeof patch.policy_decided_at).toBe("string");
    expect(patch.policy_decided_by).toBe(writeBody("POST", "factory_approvals").reviewer_id);
  });

  it("carries review fields when the reviewer supplies them", async () => {
    setup(0);
    const res = await postApprovalWith({ review_type: "factual", severity: "high", confidence: 0.8 });
    expect(res.status).toBe(200);
    expect(writeBody("POST", "factory_approvals")).toMatchObject({
      review_type: "factual",
      severity: "high",
      confidence: 0.8,
    });
  });

  it("leaves review fields null when no review metadata is supplied", async () => {
    setup(0);
    const res = await postApproval();
    expect(res.status).toBe(200);
    expect(writeBody("POST", "factory_approvals")).toMatchObject({
      review_type: null,
      severity: null,
      confidence: null,
    });
  });

  it("rejects an out-of-range confidence without writing", async () => {
    setup(0);
    const res = await postApprovalWith({ confidence: 1.5 });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/confidence/);
    expect(writeMock).not.toHaveBeenCalled();
  });

  it("mirrors a human rejection with status blocked and last_error", async () => {
    setup(0);
    const res = await postApprovalWith({ decision: "rejected", decision_reason: "too thin" });
    expect(res.status).toBe(200);
    expect(writeBody("POST", "factory_approvals")).toMatchObject({ decision: "rejected" });
    const patch = writeBody("PATCH", "factory_work_items");
    expect(patch).toMatchObject({
      status: "blocked",
      policy_decision: "human",
      last_error: "too thin",
    });
    expect(patch.policy_decided_by).toBe(writeBody("POST", "factory_approvals").reviewer_id);
    expect(typeof patch.policy_decided_at).toBe("string");
  });

  it("accepts confidence exactly 0", async () => {
    setup(0);
    const res = await postApprovalWith({ confidence: 0 });
    expect(res.status).toBe(200);
    expect(writeBody("POST", "factory_approvals")).toMatchObject({ confidence: 0 });
  });

  it("accepts confidence exactly 1", async () => {
    setup(0);
    const res = await postApprovalWith({ confidence: 1 });
    expect(res.status).toBe(200);
    expect(writeBody("POST", "factory_approvals")).toMatchObject({ confidence: 1 });
  });

  it("rejects a string confidence without writing", async () => {
    setup(0);
    const res = await postApprovalWith({ confidence: "0.8" });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/confidence/);
    expect(writeMock).not.toHaveBeenCalled();
  });

  it("rejects a boolean confidence without writing", async () => {
    setup(0);
    const res = await postApprovalWith({ confidence: true });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/confidence/);
    expect(writeMock).not.toHaveBeenCalled();
  });

  it("treats an explicit null confidence as missing", async () => {
    setup(0);
    const res = await postApprovalWith({ confidence: null });
    expect(res.status).toBe(200);
    expect(writeBody("POST", "factory_approvals")).toMatchObject({ confidence: null });
  });

  it("maps a whitespace-only review_type to null", async () => {
    setup(0);
    const res = await postApprovalWith({ review_type: "   " });
    expect(res.status).toBe(200);
    expect(writeBody("POST", "factory_approvals")).toMatchObject({ review_type: null });
  });

  it("maps a whitespace-only severity to null", async () => {
    setup(0);
    const res = await postApprovalWith({ severity: "  \t " });
    expect(res.status).toBe(200);
    expect(writeBody("POST", "factory_approvals")).toMatchObject({ severity: null });
  });
});

describe("approvals route review cap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects the fourth review without inserting", async () => {
    setup(3);
    const res = await postApproval();
    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/review limit/);
    expect(writeMock).not.toHaveBeenCalled();
  });

  it("accepts the third review", async () => {
    setup(2);
    const res = await postApproval();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { approval: { id: string } };
    expect(body.approval.id).toBe("appr-new");
    expect(writeMock).toHaveBeenCalledWith(
      expect.anything(),
      "POST",
      "factory_approvals",
      expect.objectContaining({ decision: "approved" }),
    );
  });
});

const autoWorkItem = {
  id: "wi-auto",
  work_key: "wk-auto",
  status: "awaiting_approval",
  content_id: "doc-1",
  execution_mode: "tick_managed",
  workflow_version: "guide_content_auto_v1",
  created_at: "2026-11-02T00:00:00Z",
  result_artifact_id: "art-1",
};

const autoArtifact = {
  id: "art-1",
  work_item_id: "wi-auto",
  artifact_hash: "b".repeat(64),
};

const autoStep = {
  id: "step-auto",
  work_item_id: "wi-auto",
  step_key: "auto_approve",
  sequence_no: 3,
  status: "queued",
  attempt_count: 0,
  max_attempts: 5,
  scheduled_at: "2026-11-01T00:00:00Z",
  lease_until: null,
};

function setupTick(existingApproval: boolean): void {
  getMock.mockImplementation(async (cfg: unknown, path: string) => {
    if (path.startsWith("factory_settings")) {
      return [
        { key: "factory_paused", value: "false" },
        { key: "generation_enabled", value: "true" },
      ];
    }
    if (path.startsWith("factory_work_items?id=eq.")) return [autoWorkItem];
    if (path.startsWith("factory_work_items")) return [];
    if (path.startsWith("factory_work_steps?status=in.")) return [autoStep];
    if (path.startsWith("factory_work_steps?work_item_id=eq.")) {
      return [
        { step_key: "generate_draft", sequence_no: 1, status: "succeeded" },
        { step_key: "validate_artifact", sequence_no: 2, status: "succeeded" },
        { step_key: "auto_approve", sequence_no: 3, status: "queued" },
      ];
    }
    if (path.startsWith("factory_artifacts")) return [autoArtifact];
    if (path.startsWith("factory_approvals")) {
      return existingApproval ? [{ id: "appr-existing" }] : [];
    }
    throw new Error(`unexpected tick get ${path}`);
  });
  writeMock.mockImplementation(async (cfg: unknown, method: string, path: string) => {
    if (method === "POST" && path === "factory_runs") return [{ id: "run-1" }];
    if (method === "POST" && path === "factory_attempts") return [{ id: "att-1" }];
    if (method === "POST" && path === "factory_approvals") {
      return [{ id: "appr-new", decision: "approved" }];
    }
    if (method === "PATCH" && path.startsWith("factory_work_items")) {
      return [{ ...autoWorkItem, status: "approved" }];
    }
    if (method === "PATCH" && path.startsWith("factory_runs")) return [{ id: "run-1" }];
    throw new Error(`unexpected tick write ${method} ${path}`);
  });
  rpcMock.mockImplementation(async (cfg: unknown, fn: string) => {
    if (fn === "claim_work_step_by_id") {
      return [{ ...autoStep, attempt_count: 1, fencing_token: 1 }];
    }
    if (fn === "finish_work_step") return [{ id: "step-auto" }];
    throw new Error(`unexpected tick rpc ${fn}`);
  });
}

function postTick(): Promise<Response> {
  const req = new NextRequest("http://test/api/factory/tick", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({}),
  });
  return tickPOST(req);
}

describe("tick route auto_approve policy mirror (THG-TEAM-ARCHITECTURE-01 P2 step 2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("mirrors the auto policy decision onto the work item", async () => {
    setupTick(false);
    const res = await postTick();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string; step_key: string };
    expect(body.status).toBe("step_succeeded");
    expect(body.step_key).toBe("auto_approve");
    expect(writeBody("POST", "factory_approvals")).toMatchObject({
      decision: "approved",
      reviewer_id: "system:autonomous",
    });
    const patch = writeBody("PATCH", "factory_work_items");
    expect(patch).toMatchObject({
      status: "approved",
      policy_decision: "auto",
      policy_decided_by: "system:autonomous",
    });
    expect(typeof patch.policy_decided_at).toBe("string");
  });

  it("replays an existing system approval and still runs the policy PATCH", async () => {
    setupTick(true);
    const res = await postTick();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string; step_key: string };
    expect(body.status).toBe("step_succeeded");
    expect(body.step_key).toBe("auto_approve");
    expect(
      writeMock.mock.calls.filter((c) => c[1] === "POST" && c[2] === "factory_approvals"),
    ).toHaveLength(0);
    const patch = writeBody("PATCH", "factory_work_items");
    expect(patch).toMatchObject({
      status: "approved",
      policy_decision: "auto",
      policy_decided_by: "system:autonomous",
    });
    expect(typeof patch.policy_decided_at).toBe("string");
  });
});
