/**
 * تست‌های مسیر POST /api/internal/work-items/[id]/update-artifact با
 * PostgREST ساختگی: آینهٔ تست‌های first-artifact با گیت وارونه (سند
 * باید نسخهٔ منتشرشده داشته باشد؛ سند بدون نسخه ۴۰۹ می‌گیرد).
 * احراز (checkAuth) و پیکربندی (dbConfig) واقعی‌اند و با متغیرهای
 * محیطی ساختگی تغذیه می‌شوند. هیچ انتشار واقعی و هیچ فراخوان شبکه‌ای
 * از این تست بیرون نمی‌رود.
 */
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { computeContentHash, type PublishPayload } from "@/lib/content-versioning";
import { postgrestGet, postgrestWrite } from "@/lib/factory/tick/internal-api";

vi.mock("@/lib/factory/tick/internal-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/factory/tick/internal-api")>();
  return { ...actual, postgrestGet: vi.fn(), postgrestWrite: vi.fn() };
});

const mockedGet = vi.mocked(postgrestGet);
const mockedWrite = vi.mocked(postgrestWrite);

const TOKEN = "test-token";
const WI_ID = "22222222-2222-4222-8222-222222222222";
const DOC_ID = "33333333-3333-4333-8333-333333333333";
const ART_ID = "44444444-4444-4444-8444-444444444444";
const VER_ID = "66666666-6666-4666-8666-666666666666";

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

const DOC = {
  id: DOC_ID,
  slug: "thailand-visa-guide",
  content_type: "guide",
  canonical_path: "/guide/thailand-visa-guide",
  published_version_id: VER_ID,
  is_test_fixture: false,
};

function baseWorkItem(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: WI_ID,
    work_key: "guide-update-thailand-visa-guide",
    work_type: "update_content",
    title: "راهنمای ویزا",
    description: null,
    status: "queued",
    content_id: DOC_ID,
    acceptance_criteria: [],
    result_artifact_id: null,
    result_version_id: null,
    publication_id: null,
    last_error: null,
    execution_mode: "manual",
    workflow_version: null,
    ...overrides,
  };
}

function postReq(url: string, body: unknown, token: string | null = TOKEN): NextRequest {
  return new NextRequest(url, {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      ...(token ? { "x-internal-publish-token": token } : {}),
    },
  });
}

const savedEnv = {
  token: process.env.INTERNAL_PUBLISH_TOKEN,
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  key: process.env.SUPABASE_SERVICE_ROLE_KEY,
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env.INTERNAL_PUBLISH_TOKEN = TOKEN;
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
  vi.unstubAllGlobals();
});

async function callUpdateArtifact(req: NextRequest) {
  const { POST } = await import("@/app/api/internal/work-items/[id]/update-artifact/route");
  return POST(req, { params: Promise.resolve({ id: WI_ID }) });
}

describe("POST /api/internal/work-items/[id]/update-artifact", () => {
  const ART = {
    id: ART_ID,
    work_item_id: WI_ID,
    artifact_type: "guide_edit",
    schema_version: "publish_payload_v1",
    payload: PAYLOAD,
    artifact_hash: HASH,
  };

  function installReads(options: {
    workItem: Record<string, unknown>;
    linked?: unknown[];
    sameHash?: unknown[];
    doc?: unknown;
  }) {
    mockedGet.mockImplementation(async (_cfg, path) => {
      if (path.startsWith("factory_work_items")) return [options.workItem];
      if (path.startsWith("factory_artifacts?id=eq.")) return options.linked ?? [];
      if (path.startsWith("factory_artifacts?work_item_id=")) return options.sameHash ?? [];
      if (path.startsWith("content_documents")) return options.doc === undefined ? [DOC] : [options.doc];
      throw new Error(`unexpected read ${path}`);
    });
  }

  it("Work Item ناموجود ۴۰۴ می‌گیرد", async () => {
    mockedGet.mockResolvedValue([]);
    const res = await callUpdateArtifact(
      postReq("http://localhost/api/internal/work-items/x/update-artifact", { payload: PAYLOAD }),
    );
    expect(res.status).toBe(404);
  });

  it("payload نامعتبر ۴۰۰ می‌گیرد", async () => {
    installReads({ workItem: baseWorkItem() });
    const res = await callUpdateArtifact(
      postReq("http://localhost/api/internal/work-items/x/update-artifact", {
        payload: { ...PAYLOAD, title: "" },
      }),
    );
    expect(res.status).toBe(400);
  });

  it("وضعیت نامجاز (succeeded) ۴۰۹ می‌گیرد", async () => {
    installReads({ workItem: baseWorkItem({ status: "succeeded" }) });
    const res = await callUpdateArtifact(
      postReq("http://localhost/api/internal/work-items/x/update-artifact", { payload: PAYLOAD }),
    );
    expect(res.status).toBe(409);
    expect(mockedWrite).not.toHaveBeenCalled();
  });

  it("سند بدون نسخهٔ منتشرشده ۴۰۹ با پیام مسیر انتشار اول می‌گیرد", async () => {
    installReads({
      workItem: baseWorkItem(),
      doc: { ...DOC, published_version_id: null },
    });
    const res = await callUpdateArtifact(
      postReq("http://localhost/api/internal/work-items/x/update-artifact", { payload: PAYLOAD }),
    );
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "از مسیر انتشار اول استفاده کن" });
  });

  it("slug ناهمخوان payload با سند ۴۰۰ می‌گیرد", async () => {
    installReads({ workItem: baseWorkItem() });
    const res = await callUpdateArtifact(
      postReq("http://localhost/api/internal/work-items/x/update-artifact", {
        payload: { ...PAYLOAD, slug: "other-guide", seo: { ...PAYLOAD.seo, canonical_path: "/guide/other-guide" } },
      }),
    );
    expect(res.status).toBe(400);
  });

  it("Artifact به‌روزرسانی با Hash درست درج و به Work Item پیوند می‌خورد", async () => {
    installReads({ workItem: baseWorkItem() });
    mockedWrite.mockImplementation(async (_cfg, method, path) => {
      if (method === "POST" && path === "factory_artifacts") return [ART];
      if (method === "PATCH" && path.startsWith("factory_work_items")) return [baseWorkItem()];
      throw new Error(`unexpected write ${method} ${path}`);
    });
    const res = await callUpdateArtifact(
      postReq("http://localhost/api/internal/work-items/x/update-artifact", { payload: PAYLOAD }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ artifact_id: ART_ID, artifact_hash: HASH, existing: false });
    expect(mockedWrite).toHaveBeenCalledWith(expect.anything(), "POST", "factory_artifacts", {
      work_item_id: WI_ID,
      artifact_type: "guide_edit",
      schema_version: "publish_payload_v1",
      payload: PAYLOAD,
      artifact_hash: HASH,
    });
    expect(mockedWrite).toHaveBeenCalledWith(
      expect.anything(),
      "PATCH",
      expect.stringContaining("factory_work_items"),
      expect.objectContaining({ result_artifact_id: ART_ID, status: "awaiting_approval" }),
    );
  });

  it("تکرار با همان Hash، همان Artifact را بدون درج تازه برمی‌گرداند", async () => {
    installReads({
      workItem: baseWorkItem({ status: "awaiting_approval", result_artifact_id: ART_ID }),
      linked: [ART],
    });
    const res = await callUpdateArtifact(
      postReq("http://localhost/api/internal/work-items/x/update-artifact", { payload: PAYLOAD }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ artifact_id: ART_ID, artifact_hash: HASH, existing: true });
    expect(mockedWrite).not.toHaveBeenCalled();
  });

  it("بدون توکن ۴۰۱ و نبودن توکن در env ۵۰۳ است", async () => {
    installReads({ workItem: baseWorkItem() });
    const noToken = await callUpdateArtifact(
      postReq("http://localhost/api/internal/work-items/x/update-artifact", { payload: PAYLOAD }, null),
    );
    expect(noToken.status).toBe(401);
    delete process.env.INTERNAL_PUBLISH_TOKEN;
    const unconfigured = await callUpdateArtifact(
      postReq("http://localhost/api/internal/work-items/x/update-artifact", { payload: PAYLOAD }),
    );
    expect(unconfigured.status).toBe(503);
  });
});
