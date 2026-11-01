/**
 * تست سقف بازبینی (M5، گیت کیفیت): حداکثر ۳ دور بازبینی برای یک Work
 * Item. دور چهارم با 409 رد می‌شود و هیچ Approvalای ثبت نمی‌کند.
 * مسیر approvals با internal-api ساختگی تست می‌شود (بدون دیتابیس).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { getMock, writeMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  writeMock: vi.fn(),
}));

vi.mock("@/lib/factory/tick/internal-api", () => ({
  checkAuth: () => true,
  dbConfig: () => ({ url: "https://supabase.test", serviceKey: "service-key" }),
  postgrestGet: getMock,
  postgrestWrite: writeMock,
}));

import { POST } from "@/app/api/internal/work-items/[id]/approvals/route";
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
