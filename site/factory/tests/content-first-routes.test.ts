/**
 * تست‌های مسیرهای CONTENT-FIRST-PUBLICATION با PostgREST ساختگی:
 * content-documents، گیت تعمیم‌یافتهٔ work-items، first-artifact،
 * publish و تگ versioned-guides در process-outbox.
 * احراز (checkAuth) و پیکربندی (dbConfig) واقعی‌اند و با متغیرهای
 * محیطی ساختگی تغذیه می‌شوند. هیچ انتشار واقعی و هیچ فراخوان شبکه‌ای
 * از این تست بیرون نمی‌رود.
 */
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { computeContentHash, type PublishPayload } from "@/lib/content-versioning";
import { PublishV2Error } from "@/lib/factory/publish-v2";
import { postgrestGet, postgrestRpc, postgrestWrite } from "@/lib/factory/tick/internal-api";
import { publishUpdateContent } from "@/lib/factory/publish-v2";
import { revalidatePath, revalidateTag } from "next/cache";

vi.mock("@/lib/factory/tick/internal-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/factory/tick/internal-api")>();
  return { ...actual, postgrestGet: vi.fn(), postgrestWrite: vi.fn(), postgrestRpc: vi.fn() };
});

vi.mock("@/lib/factory/publish-v2", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/factory/publish-v2")>();
  return { ...actual, publishUpdateContent: vi.fn() };
});

vi.mock("next/cache", () => ({ revalidateTag: vi.fn(), revalidatePath: vi.fn() }));

const mockedGet = vi.mocked(postgrestGet);
const mockedWrite = vi.mocked(postgrestWrite);
const mockedRpc = vi.mocked(postgrestRpc);
const mockedPublish = vi.mocked(publishUpdateContent);
const mockedTag = vi.mocked(revalidateTag);
const mockedPath = vi.mocked(revalidatePath);

const TOKEN = "test-token";
const WI_ID = "22222222-2222-4222-8222-222222222222";
const DOC_ID = "33333333-3333-4333-8333-333333333333";
const ART_ID = "44444444-4444-4444-8444-444444444444";
const ART_B_ID = "44444444-4444-4444-8444-444444444445";
const APPR_ID = "55555555-5555-4555-8555-555555555555";
const VER_ID = "66666666-6666-4666-8666-666666666666";
const PUB_ID = "77777777-7777-4777-8777-777777777777";

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
  published_version_id: null,
  is_test_fixture: false,
};

function baseWorkItem(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: WI_ID,
    work_key: "p2-base-01",
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

async function callContentDocuments(req: NextRequest) {
  const { POST } = await import("@/app/api/internal/content-documents/route");
  return POST(req);
}

async function callWorkItems(req: NextRequest) {
  const { POST } = await import("@/app/api/internal/work-items/route");
  return POST(req);
}

async function callFirstArtifact(req: NextRequest) {
  const { POST } = await import("@/app/api/internal/work-items/[id]/first-artifact/route");
  return POST(req, { params: Promise.resolve({ id: WI_ID }) });
}

async function callUpdateArtifact(req: NextRequest) {
  const { POST } = await import("@/app/api/internal/work-items/[id]/update-artifact/route");
  return POST(req, { params: Promise.resolve({ id: WI_ID }) });
}

async function callPublish(req: NextRequest) {
  const { POST } = await import("@/app/api/internal/work-items/[id]/publish/route");
  return POST(req, { params: Promise.resolve({ id: WI_ID }) });
}

async function callOutbox(req: NextRequest) {
  const { POST } = await import("@/app/api/internal/process-outbox/route");
  return POST(req);
}

describe("POST /api/internal/content-documents", () => {
  it("بدون توکن ۴۰۱ و با توکن اشتباه ۴۰۱ می‌دهد", async () => {
    const noToken = await callContentDocuments(
      postReq("http://localhost/api/internal/content-documents", { slug: "thailand-visa-guide" }, null),
    );
    expect(noToken.status).toBe(401);
    const wrongToken = await callContentDocuments(
      postReq("http://localhost/api/internal/content-documents", { slug: "thailand-visa-guide" }, "wrong"),
    );
    expect(wrongToken.status).toBe(401);
    expect(mockedWrite).not.toHaveBeenCalled();
  });

  it("نبودن توکن در env یعنی ۵۰۳", async () => {
    delete process.env.INTERNAL_PUBLISH_TOKEN;
    const res = await callContentDocuments(
      postReq("http://localhost/api/internal/content-documents", { slug: "thailand-visa-guide" }),
    );
    expect(res.status).toBe(503);
  });

  it.each(["ABC", "-lead", "trail-", "double--dash", "has space", "", "under_score"])(
    "slug نامعتبر %s با ۴۰۰ رد می‌شود",
    async (slug) => {
      const res = await callContentDocuments(
        postReq("http://localhost/api/internal/content-documents", { slug }),
      );
      expect(res.status).toBe(400);
      expect(mockedWrite).not.toHaveBeenCalled();
    },
  );

  it("slug معتبر، سند draft با canonical_path درست می‌سازد", async () => {
    mockedWrite.mockResolvedValue([{ ...DOC, status: "draft" }]);
    const res = await callContentDocuments(
      postReq("http://localhost/api/internal/content-documents", { slug: "thailand-visa-guide" }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      document: {
        id: DOC_ID,
        slug: "thailand-visa-guide",
        canonical_path: "/guide/thailand-visa-guide",
        status: "draft",
      },
    });
    expect(mockedWrite).toHaveBeenCalledWith(expect.anything(), "POST", "content_documents", {
      slug: "thailand-visa-guide",
      content_type: "guide",
      status: "draft",
      canonical_path: "/guide/thailand-visa-guide",
      published_version_id: null,
      is_test_fixture: false,
    });
  });

  it("slug تکراری ۴۰۹ می‌دهد", async () => {
    mockedWrite.mockRejectedValue(
      new Error("postgrest POST content_documents failed with 409: duplicate key value"),
    );
    const res = await callContentDocuments(
      postReq("http://localhost/api/internal/content-documents", { slug: "thailand-visa-guide" }),
    );
    expect(res.status).toBe(409);
  });
});

describe("POST /api/internal/work-items با گیت تعمیم‌یافته", () => {
  const body = {
    work_key: "p2-base-01",
    work_type: "update_content",
    title: "راهنمای ویزا",
    content_id: DOC_ID,
  };

  function installDoc(doc: unknown) {
    mockedGet.mockImplementation(async (_cfg, path) => {
      if (path.startsWith("content_documents")) return [doc];
      throw new Error(`unexpected read ${path}`);
    });
    mockedWrite.mockResolvedValue([baseWorkItem({ status: "queued" })]);
  }

  it("راهنمای واقعی با slug تازه (بیرون از برش M2) پذیرفته می‌شود", async () => {
    installDoc(DOC);
    const res = await callWorkItems(postReq("http://localhost/api/internal/work-items", body));
    expect(res.status).toBe(200);
    expect(mockedWrite).toHaveBeenCalledWith(
      expect.anything(),
      "POST",
      "factory_work_items",
      expect.objectContaining({ content_id: DOC_ID, status: "queued" }),
    );
  });

  it("سند غیرراهنما ۴۰۳ می‌گیرد", async () => {
    installDoc({ ...DOC, content_type: "page" });
    const res = await callWorkItems(postReq("http://localhost/api/internal/work-items", body));
    expect(res.status).toBe(403);
    expect(mockedWrite).not.toHaveBeenCalled();
  });

  it("سند فیکسچر ۴۰۳ می‌گیرد", async () => {
    installDoc({ ...DOC, is_test_fixture: true });
    const res = await callWorkItems(postReq("http://localhost/api/internal/work-items", body));
    expect(res.status).toBe(403);
    expect(mockedWrite).not.toHaveBeenCalled();
  });

  it("سند ناموجود ۴۰۴ می‌گیرد", async () => {
    mockedGet.mockResolvedValue([]);
    const res = await callWorkItems(postReq("http://localhost/api/internal/work-items", body));
    expect(res.status).toBe(404);
  });

  it("بدون توکن ۵۰۳ نیست، ۴۰۱ است؛ نبودن توکن در env ۵۰۳ است", async () => {
    installDoc(DOC);
    const noToken = await callWorkItems(postReq("http://localhost/api/internal/work-items", body, null));
    expect(noToken.status).toBe(401);
    delete process.env.INTERNAL_PUBLISH_TOKEN;
    const unconfigured = await callWorkItems(postReq("http://localhost/api/internal/work-items", body));
    expect(unconfigured.status).toBe(503);
  });

  it("work_key تکراری با کد 23505 هم ۴۰۹ می‌دهد، نه ۵۰۰", async () => {
    installDoc(DOC);
    mockedWrite.mockRejectedValue(
      new Error('postgrest POST factory_work_items failed with 409: {"code":"23505","message":"violates unique constraint"}'),
    );
    const res = await callWorkItems(postReq("http://localhost/api/internal/work-items", body));
    expect(res.status).toBe(409);
  });

  it("budget_limit معتبر، در درج می‌نشیند و مقدار نامعتبر ۴۰۰ می‌گیرد", async () => {
    installDoc(DOC);
    const res = await callWorkItems(
      postReq("http://localhost/api/internal/work-items", { ...body, budget_limit: 1000000 }),
    );
    expect(res.status).toBe(200);
    expect(mockedWrite).toHaveBeenCalledWith(
      expect.anything(),
      "POST",
      "factory_work_items",
      expect.objectContaining({ budget_limit: 1000000 }),
    );
    const bad = await callWorkItems(
      postReq("http://localhost/api/internal/work-items", { ...body, budget_limit: -5 }),
    );
    expect(bad.status).toBe(400);
  });
});

describe("POST /api/internal/work-items/[id]/first-artifact", () => {
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
    const res = await callFirstArtifact(
      postReq("http://localhost/api/internal/work-items/x/first-artifact", { payload: PAYLOAD }),
    );
    expect(res.status).toBe(404);
  });

  it("payload نامعتبر ۴۰۰ می‌گیرد", async () => {
    installReads({ workItem: baseWorkItem() });
    const res = await callFirstArtifact(
      postReq("http://localhost/api/internal/work-items/x/first-artifact", {
        payload: { ...PAYLOAD, title: "" },
      }),
    );
    expect(res.status).toBe(400);
  });

  it("وضعیت نامجاز (succeeded) ۴۰۹ می‌گیرد", async () => {
    installReads({ workItem: baseWorkItem({ status: "succeeded" }) });
    const res = await callFirstArtifact(
      postReq("http://localhost/api/internal/work-items/x/first-artifact", { payload: PAYLOAD }),
    );
    expect(res.status).toBe(409);
    expect(mockedWrite).not.toHaveBeenCalled();
  });

  it("سند با نسخهٔ منتشرشده ۴۰۹ با پیام مسیر به‌روزرسانی می‌گیرد", async () => {
    installReads({
      workItem: baseWorkItem(),
      doc: { ...DOC, published_version_id: "ver-old" },
    });
    const res = await callFirstArtifact(
      postReq("http://localhost/api/internal/work-items/x/first-artifact", { payload: PAYLOAD }),
    );
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "از مسیر به‌روزرسانی استفاده کن" });
  });

  it("slug ناهمخوان payload با سند ۴۰۰ می‌گیرد", async () => {
    installReads({ workItem: baseWorkItem() });
    const res = await callFirstArtifact(
      postReq("http://localhost/api/internal/work-items/x/first-artifact", {
        payload: { ...PAYLOAD, slug: "other-guide", seo: { ...PAYLOAD.seo, canonical_path: "/guide/other-guide" } },
      }),
    );
    expect(res.status).toBe(400);
  });

  it("Artifact اول با Hash درست درج و به Work Item پیوند می‌خورد", async () => {
    installReads({ workItem: baseWorkItem() });
    mockedWrite.mockImplementation(async (_cfg, method, path) => {
      if (method === "POST" && path === "factory_artifacts") return [ART];
      if (method === "PATCH" && path.startsWith("factory_work_items")) return [baseWorkItem()];
      throw new Error(`unexpected write ${method} ${path}`);
    });
    const res = await callFirstArtifact(
      postReq("http://localhost/api/internal/work-items/x/first-artifact", { payload: PAYLOAD }),
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
    const res = await callFirstArtifact(
      postReq("http://localhost/api/internal/work-items/x/first-artifact", { payload: PAYLOAD }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ artifact_id: ART_ID, artifact_hash: HASH, existing: true });
    expect(mockedWrite).not.toHaveBeenCalled();
  });

  it("Artifact پیوندیافته با Hash متفاوت ۴۰۹ می‌گیرد", async () => {
    installReads({
      workItem: baseWorkItem({ status: "awaiting_approval", result_artifact_id: ART_ID }),
      linked: [{ ...ART, artifact_hash: "c".repeat(64) }],
    });
    const res = await callFirstArtifact(
      postReq("http://localhost/api/internal/work-items/x/first-artifact", { payload: PAYLOAD }),
    );
    expect(res.status).toBe(409);
  });

  it("Artifact هم‌Hashِ پیوندنخورده، به‌جای درج تکراری پیوند می‌خورد", async () => {
    installReads({ workItem: baseWorkItem(), sameHash: [{ id: ART_ID }] });
    mockedWrite.mockResolvedValue([baseWorkItem()]);
    const res = await callFirstArtifact(
      postReq("http://localhost/api/internal/work-items/x/first-artifact", { payload: PAYLOAD }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ artifact_id: ART_ID, artifact_hash: HASH, existing: true });
    expect(mockedWrite).not.toHaveBeenCalledWith(
      expect.anything(),
      "POST",
      "factory_artifacts",
      expect.anything(),
    );
  });
});

describe("POST /api/internal/work-items/[id]/publish", () => {
  const ART = {
    id: ART_ID,
    work_item_id: WI_ID,
    artifact_type: "guide_edit",
    schema_version: "publish_payload_v1",
    payload: PAYLOAD,
    artifact_hash: HASH,
  };
  const APPR = {
    id: APPR_ID,
    work_item_id: WI_ID,
    artifact_id: ART_ID,
    artifact_hash: HASH,
    decision: "approved",
    reviewer_id: "pm",
    decision_reason: null,
    created_at: "2026-11-01T00:00:00Z",
  };
  const VER = {
    id: VER_ID,
    content_id: DOC_ID,
    version_no: 1,
    schema_version: "publish_payload_v1",
    payload: PAYLOAD,
    content_hash: HASH,
  };

  function installReads(options: {
    workItem: Record<string, unknown>;
    artifact?: unknown;
    approvals?: unknown[];
    doc?: unknown;
    version?: unknown;
  }) {
    mockedGet.mockImplementation(async (_cfg, path) => {
      if (path.startsWith("factory_work_items")) return [options.workItem];
      if (path.startsWith("factory_artifacts")) return options.artifact === undefined ? [ART] : [options.artifact];
      if (path.startsWith("factory_approvals")) return options.approvals ?? [APPR];
      if (path.startsWith("content_documents")) return options.doc === undefined ? [DOC] : [options.doc];
      if (path.startsWith("content_versions")) return options.version === undefined ? [VER] : [options.version];
      throw new Error(`unexpected read ${path}`);
    });
    mockedRpc.mockResolvedValue(VER);
    mockedPublish.mockResolvedValue({
      publicationId: PUB_ID,
      outboxId: "out-1",
      previousVersionId: null,
      versionId: VER_ID,
      replayed: false,
      dailyCount: 1,
      previousPreserved: true,
    });
    mockedWrite.mockResolvedValue([options.workItem]);
  }

  it("Work Item ناموجود ۴۰۴ می‌گیرد", async () => {
    mockedGet.mockResolvedValue([]);
    const res = await callPublish(postReq("http://localhost/api/internal/work-items/x/publish", {}));
    expect(res.status).toBe(404);
  });

  it("وضعیت غیرapproved (queued) ۴۰۹ می‌گیرد و سرویس صدا زده نمی‌شود", async () => {
    installReads({ workItem: baseWorkItem({ status: "queued", result_artifact_id: ART_ID }) });
    const res = await callPublish(postReq("http://localhost/api/internal/work-items/x/publish", {}));
    expect(res.status).toBe(409);
    expect(mockedPublish).not.toHaveBeenCalled();
    expect(mockedRpc).not.toHaveBeenCalled();
  });

  it("بدون Approval تأییدشده ۴۰۹ می‌گیرد", async () => {
    installReads({
      workItem: baseWorkItem({ status: "approved", result_artifact_id: ART_ID }),
      approvals: [],
    });
    const res = await callPublish(postReq("http://localhost/api/internal/work-items/x/publish", {}));
    expect(res.status).toBe(409);
    expect(mockedPublish).not.toHaveBeenCalled();
  });

  it("Hash ناهمخوان Approval با Artifact ۴۰۹ می‌گیرد", async () => {
    installReads({
      workItem: baseWorkItem({ status: "approved", result_artifact_id: ART_ID }),
      approvals: [{ ...APPR, artifact_hash: "d".repeat(64) }],
    });
    const res = await callPublish(postReq("http://localhost/api/internal/work-items/x/publish", {}));
    expect(res.status).toBe(409);
    expect(mockedPublish).not.toHaveBeenCalled();
  });

  it("تغییر Artifact پس از تأیید، مجوز را باطل می‌کند (Approval روی Artifact تازه نیست)", async () => {
    installReads({
      workItem: baseWorkItem({ status: "approved", result_artifact_id: ART_B_ID }),
      artifact: { ...ART, id: ART_B_ID },
      approvals: [],
    });
    const res = await callPublish(postReq("http://localhost/api/internal/work-items/x/publish", {}));
    expect(res.status).toBe(409);
    expect(mockedPublish).not.toHaveBeenCalled();
  });

  it("انتشار اول موفق: نسخه با RPC ساخته و Publication با وضعیت publishing ثبت می‌شود", async () => {
    installReads({ workItem: baseWorkItem({ status: "approved", result_artifact_id: ART_ID }) });
    const res = await callPublish(postReq("http://localhost/api/internal/work-items/x/publish", {}));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      version_id: VER_ID,
      publication_id: PUB_ID,
      status: "publishing",
    });
    expect(mockedRpc).toHaveBeenCalledWith(expect.anything(), "create_approved_version_v2", {
      p_content_id: DOC_ID,
      p_payload: PAYLOAD,
      p_content_hash: HASH,
      p_work_item_id: WI_ID,
      p_artifact_id: ART_ID,
    });
    expect(mockedPublish).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        workItemId: WI_ID,
        workKey: "p2-base-01",
        contentId: DOC_ID,
        versionId: VER_ID,
        approvalId: APPR_ID,
        previousUniqueText: null,
        previousVersionId: null,
        validation: expect.objectContaining({
          workItemStatus: "approved",
          workItemArtifactId: ART_ID,
          approvalArtifactId: ART_ID,
          approvalArtifactHash: HASH,
          artifactHash: HASH,
          approvalDecision: "approved",
          contentType: "guide",
          schemaVersion: "publish_payload_v1",
        }),
      }),
    );
    expect(mockedWrite).toHaveBeenCalledWith(
      expect.anything(),
      "PATCH",
      expect.stringContaining("factory_work_items"),
      expect.objectContaining({ publication_id: PUB_ID, status: "publishing" }),
    );
  });

  it("تلاش دوباره با نسخهٔ موجود، RPC را دوباره صدا نمی‌زند (Replay بدون Publication تکراری)", async () => {
    installReads({
      workItem: baseWorkItem({ status: "publishing", result_artifact_id: ART_ID, result_version_id: VER_ID }),
    });
    mockedPublish.mockResolvedValue({
      publicationId: PUB_ID,
      outboxId: "out-1",
      previousVersionId: null,
      versionId: VER_ID,
      replayed: true,
      dailyCount: 1,
      previousPreserved: true,
    });
    const res = await callPublish(postReq("http://localhost/api/internal/work-items/x/publish", {}));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      version_id: VER_ID,
      publication_id: PUB_ID,
      status: "publishing",
    });
    expect(mockedRpc).not.toHaveBeenCalled();
    expect(mockedPublish).toHaveBeenCalledTimes(1);
  });

  it("خطای publish_outcome_unknown با ۵۰۲ بالا می‌آید و Work Item به‌روز نمی‌شود", async () => {
    installReads({ workItem: baseWorkItem({ status: "approved", result_artifact_id: ART_ID }) });
    mockedPublish.mockRejectedValue(new PublishV2Error("publish_outcome_unknown", "outcome unknown"));
    const res = await callPublish(postReq("http://localhost/api/internal/work-items/x/publish", {}));
    expect(res.status).toBe(502);
    expect(mockedWrite).not.toHaveBeenCalled();
  });

  it("سقف روزانه با ۴۲۹ برمی‌گردد", async () => {
    installReads({ workItem: baseWorkItem({ status: "approved", result_artifact_id: ART_ID }) });
    mockedPublish.mockRejectedValue(new PublishV2Error("daily_publish_limit", "limit reached"));
    const res = await callPublish(postReq("http://localhost/api/internal/work-items/x/publish", {}));
    expect(res.status).toBe(429);
  });
});

describe("POST /api/internal/process-outbox و تگ versioned-guides", () => {
  const EVENT = {
    id: "event-1",
    publication_id: PUB_ID,
    event_type: "published",
    payload: {
      content_id: DOC_ID,
      version_id: VER_ID,
      previous_version_id: null,
      slug: "thailand-visa-guide",
      canonical_path: "/guide/thailand-visa-guide",
      version_no: 1,
      content_hash: HASH,
      expected_marker: "پاراگراف اول نسخهٔ تازه.",
      previous_unique_text: null,
    },
    status: "claimed",
    attempts: 1,
    max_attempts: 5,
    lease_owner: "runner",
    fencing_token: 7,
    dispatch_attempts: 0,
    verification_attempts: 0,
    redispatch_attempts: 0,
    dispatch_instance_id: null,
    dispatch_done: false,
  };

  function installOutbox(event: Record<string, unknown>) {
    mockedRpc.mockImplementation(async (_cfg, fn) => {
      if (fn === "claim_outbox_event") return event;
      throw new Error(`unexpected rpc ${fn}`);
    });
    mockedWrite.mockResolvedValue([{}]);
    mockedGet.mockImplementation(async (_cfg, path) => {
      if (path.startsWith("factory_publications")) return [{ last_error: null }];
      throw new Error(`unexpected read ${path}`);
    });
    vi.stubGlobal(
      "fetch",
      async () =>
        ({
          status: 200,
          text: async () =>
            `<link rel="canonical" href="/guide/thailand-visa-guide" />پاراگراف اول نسخهٔ تازه.`,
        }) as unknown as Response,
    );
  }

  it("در Dispatch، تگ versioned-guides با expire:0 باطل می‌شود", async () => {
    installOutbox(EVENT);
    const res = await callOutbox(postReq("http://localhost/api/internal/process-outbox", {}));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ processed: 1, status: "verified" });
    expect(mockedTag).toHaveBeenCalledWith("versioned-guides", { expire: 0 });
    expect(mockedPath).toHaveBeenCalledWith("/guide/thailand-visa-guide");
  });

  it("در Redispatch پس از Restart هم تگ versioned-guides باطل می‌شود", async () => {
    installOutbox({ ...EVENT, dispatch_done: true, dispatch_instance_id: "other-instance" });
    const res = await callOutbox(postReq("http://localhost/api/internal/process-outbox", {}));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ processed: 1, status: "verified" });
    expect(mockedTag).toHaveBeenCalledWith("versioned-guides", { expire: 0 });
  });
});

describe("POST /api/internal/work-items/[id]/update-artifact (بازیابی خرابی پس از درج)", () => {
  const ART = {
    id: ART_ID,
    work_item_id: WI_ID,
    artifact_type: "guide_edit",
    schema_version: "publish_payload_v1",
    payload: PAYLOAD,
    artifact_hash: HASH,
  };
  const PUBLISHED_DOC = { ...DOC, published_version_id: VER_ID };

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
      if (path.startsWith("content_documents")) return options.doc === undefined ? [PUBLISHED_DOC] : [options.doc];
      throw new Error(`unexpected read ${path}`);
    });
  }

  it("Artifact هم‌Hashِ پیوندنخورده (خرابی میان درج و پیوند)، به‌جای درج تکراری پیوند می‌خورد", async () => {
    installReads({ workItem: baseWorkItem(), sameHash: [{ id: ART_ID }] });
    mockedWrite.mockResolvedValue([baseWorkItem()]);
    const res = await callUpdateArtifact(
      postReq("http://localhost/api/internal/work-items/x/update-artifact", { payload: PAYLOAD }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ artifact_id: ART_ID, artifact_hash: HASH, existing: true });
    expect(mockedWrite).not.toHaveBeenCalledWith(
      expect.anything(),
      "POST",
      "factory_artifacts",
      expect.anything(),
    );
  });

  it("Artifact پیوندیافته با Hash متفاوت ۴۰۹ می‌گیرد و Artifact تازه درج نمی‌شود", async () => {
    installReads({
      workItem: baseWorkItem({ status: "awaiting_approval", result_artifact_id: ART_ID }),
      linked: [{ ...ART, artifact_hash: "c".repeat(64) }],
    });
    const res = await callUpdateArtifact(
      postReq("http://localhost/api/internal/work-items/x/update-artifact", { payload: PAYLOAD }),
    );
    expect(res.status).toBe(409);
    expect(mockedWrite).not.toHaveBeenCalled();
  });
});
