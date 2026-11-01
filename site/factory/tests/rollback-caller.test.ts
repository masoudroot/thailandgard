/**
 * تست Caller مسیر Rollback داخلی: بدون دیتابیس واقعی و بدون شبکه.
 * خواندن‌های PostgREST و سرویس rollbackUpdateContent ساختگی‌اند؛
 * احراز (checkAuth) و پیکربندی (dbConfig) واقعی‌اند و با متغیرهای
 * محیطی ساختگی تغذیه می‌شوند. هیچ Rollback واقعی اجرا نمی‌شود و
 * هیچ فراخوان شبکه‌ای از این تست بیرون نمی‌رود.
 */
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  publishV2RollbackIdempotencyKey,
  rollbackUpdateContent,
} from "@/lib/factory/publish-v2";
import { postgrestGet } from "@/lib/factory/tick/internal-api";

vi.mock("@/lib/factory/tick/internal-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/factory/tick/internal-api")>();
  return { ...actual, postgrestGet: vi.fn() };
});

vi.mock("@/lib/factory/publish-v2", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/factory/publish-v2")>();
  return { ...actual, rollbackUpdateContent: vi.fn() };
});

const mockedGet = vi.mocked(postgrestGet);
const mockedRollback = vi.mocked(rollbackUpdateContent);

const PUBLICATION_ID = "11111111-1111-4111-8111-111111111111";
const WORK_ITEM_ID = "22222222-2222-4222-8222-222222222222";
const CONTENT_ID = "33333333-3333-4333-8333-333333333333";
const TARGET_VERSION_ID = "44444444-4444-4444-8444-444444444444";
const CURRENT_VERSION_ID = "55555555-5555-4555-8555-555555555555";
const WORK_KEY = "m5-staging-02-r2b-update-01";
const APPROVAL_ID = "66666666-6666-4666-8666-666666666666";

const basePublication = {
  id: PUBLICATION_ID,
  content_id: CONTENT_ID,
  version_id: CURRENT_VERSION_ID,
  previous_version_id: TARGET_VERSION_ID,
  publication_kind: "publish",
  status: "verified",
  work_item_id: WORK_ITEM_ID,
  approval_id: APPROVAL_ID,
};

function payloadWithFirstParagraph(text: string): unknown {
  return { sections: [{ paragraphs: [text] }] };
}

function installReads(publication: unknown): void {
  mockedGet.mockImplementation(async (_cfg, path) => {
    if (path.startsWith("factory_publications")) return [publication];
    if (path.startsWith("factory_work_items")) return [{ id: WORK_ITEM_ID, work_key: WORK_KEY }];
    if (path.includes(`content_versions?id=eq.${TARGET_VERSION_ID}`)) {
      return [{ id: TARGET_VERSION_ID, payload: payloadWithFirstParagraph("پاراگراف اول نسخهٔ هدف.") }];
    }
    if (path.includes(`content_versions?id=eq.${CURRENT_VERSION_ID}`)) {
      return [{ id: CURRENT_VERSION_ID, payload: payloadWithFirstParagraph("پاراگراف اول نسخهٔ جاری.") }];
    }
    throw new Error(`unexpected read ${path}`);
  });
  mockedRollback.mockResolvedValue({
    publicationId: "77777777-7777-4777-8777-777777777777",
    outboxId: "88888888-8888-4888-8888-888888888888",
    previousVersionId: CURRENT_VERSION_ID,
    versionId: TARGET_VERSION_ID,
    replayed: false,
    dailyCount: 0,
    previousPreserved: null,
  });
}

function post(body: unknown, token?: string): NextRequest {
  return new NextRequest("http://localhost/api/internal/factory/rollback", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      ...(token ? { "x-internal-publish-token": token } : {}),
    },
  });
}

async function callRoute(req: NextRequest) {
  const { POST } = await import("@/app/api/internal/factory/rollback/route");
  return POST(req);
}

const savedEnv = {
  token: process.env.INTERNAL_PUBLISH_TOKEN,
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  key: process.env.SUPABASE_SERVICE_ROLE_KEY,
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env.INTERNAL_PUBLISH_TOKEN = "test-token";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.test";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
});

afterEach(() => {
  if (savedEnv.token === undefined) delete process.env.INTERNAL_PUBLISH_TOKEN;
  else process.env.INTERNAL_PUBLISH_TOKEN = savedEnv.token;
  if (savedEnv.url === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  else process.env.NEXT_PUBLIC_SUPABASE_URL = savedEnv.url;
  if (savedEnv.key === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  else process.env.SUPABASE_SERVICE_ROLE_KEY = savedEnv.key;
});

describe("POST /api/internal/factory/rollback", () => {
  it("rejects a request without the token with 401 and never calls the service", async () => {
    installReads(basePublication);
    const res = await callRoute(post({ publication_id: PUBLICATION_ID, reason: "بازگردانی آزمایشی" }));
    expect(res.status).toBe(401);
    expect(mockedRollback).not.toHaveBeenCalled();
    expect(mockedGet).not.toHaveBeenCalled();
  });

  it("rejects a request with a wrong token with 401", async () => {
    installReads(basePublication);
    const res = await callRoute(
      post({ publication_id: PUBLICATION_ID, reason: "بازگردانی آزمایشی" }, "wrong-token"),
    );
    expect(res.status).toBe(401);
    expect(mockedRollback).not.toHaveBeenCalled();
  });

  it("returns 503 when the internal token is not configured", async () => {
    delete process.env.INTERNAL_PUBLISH_TOKEN;
    installReads(basePublication);
    const res = await callRoute(
      post({ publication_id: PUBLICATION_ID, reason: "بازگردانی آزمایشی" }, "test-token"),
    );
    expect(res.status).toBe(503);
    expect(mockedRollback).not.toHaveBeenCalled();
  });

  it.each([
    ["missing publication_id", {}, "publication_id must be a uuid"],
    ["malformed publication_id", { publication_id: "not-a-uuid", reason: "x" }, "publication_id must be a uuid"],
    ["missing reason", { publication_id: PUBLICATION_ID }, "reason must be a non-empty string"],
    ["empty reason", { publication_id: PUBLICATION_ID, reason: "" }, "reason must be a non-empty string"],
    [
      "reason over 500 characters",
      { publication_id: PUBLICATION_ID, reason: "x".repeat(501) },
      "reason must be a non-empty string",
    ],
  ])("rejects invalid input with 400: %s", async (_name, body, message) => {
    installReads(basePublication);
    const res = await callRoute(post(body, "test-token"));
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toContain(message);
    expect(mockedRollback).not.toHaveBeenCalled();
  });

  it("returns 404 when the publication does not exist", async () => {
    mockedGet.mockResolvedValue([]);
    const res = await callRoute(
      post({ publication_id: PUBLICATION_ID, reason: "بازگردانی آزمایشی" }, "test-token"),
    );
    expect(res.status).toBe(404);
    expect(mockedRollback).not.toHaveBeenCalled();
  });

  it.each([
    [
      "a rollback publication cannot be rolled back again",
      { ...basePublication, publication_kind: "rollback" },
      "only a forward publication can be rolled back",
    ],
    [
      "an unverified publication cannot be rolled back",
      { ...basePublication, status: "pending" },
      "publication is not verified",
    ],
    [
      "a publication without a previous version has nothing to restore",
      { ...basePublication, previous_version_id: null },
      "publication has no previous version to restore",
    ],
    [
      "a publication without a work item cannot be rolled back",
      { ...basePublication, work_item_id: null },
      "publication has no work item",
    ],
  ])("returns 409: %s", async (_name, publication, message) => {
    installReads(publication);
    const res = await callRoute(
      post({ publication_id: PUBLICATION_ID, reason: "بازگردانی آزمایشی" }, "test-token"),
    );
    expect(res.status).toBe(409);
    expect(((await res.json()) as { error: string }).error).toContain(message);
    expect(mockedRollback).not.toHaveBeenCalled();
  });

  it("calls the service with the derived arguments when authorized", async () => {
    installReads(basePublication);
    const res = await callRoute(
      post({ publication_id: PUBLICATION_ID, reason: "بازگردانی آزمایشی" }, "test-token"),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.publication_id).toBe("77777777-7777-4777-8777-777777777777");
    expect(body.version_id).toBe(TARGET_VERSION_ID);
    expect(body.replayed).toBe(false);
    expect(mockedRollback).toHaveBeenCalledTimes(1);
    expect(mockedRollback).toHaveBeenCalledWith(
      { url: "https://supabase.test", serviceKey: "service-key" },
      {
        workItemId: WORK_ITEM_ID,
        workKey: WORK_KEY,
        contentId: CONTENT_ID,
        targetVersionId: TARGET_VERSION_ID,
        rollbackOfPublicationId: PUBLICATION_ID,
        reason: "بازگردانی آزمایشی",
        approvalId: APPROVAL_ID,
        expectedMarker: "پاراگراف اول نسخهٔ هدف.",
        previousUniqueText: "پاراگراف اول نسخهٔ جاری.",
      },
    );
  });

  it("builds the rollback idempotency key from the work key in its own namespace", () => {
    expect(publishV2RollbackIdempotencyKey(WORK_KEY)).toBe(
      "publish-v2-rollback-m5-staging-02-r2b-update-01",
    );
    expect(publishV2RollbackIdempotencyKey(WORK_KEY)).not.toBe(
      publishV2RollbackIdempotencyKey("another-work-key"),
    );
  });

  it("returns 500 when the service fails and does not claim success", async () => {
    installReads(basePublication);
    mockedRollback.mockRejectedValue(new Error("rpc failed"));
    const res = await callRoute(
      post({ publication_id: PUBLICATION_ID, reason: "بازگردانی آزمایشی" }, "test-token"),
    );
    expect(res.status).toBe(500);
    expect(((await res.json()) as { error: string }).error).toContain("rpc failed");
  });
});
