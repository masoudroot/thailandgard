/**
 * تست سرویس M5 با fetch ساختگی (PostgREST ساختگی): ترتیب فراخوان‌ها،
 * حفظ وضعیت قبلی در خطا، سقف روزانه، Replay پس از خطا و نبودِ هیچ
 * DELETEای روی این مسیر. بدون دیتابیس واقعی و بدون Secret واقعی.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  publishUpdateContent,
  PublishV2Error,
  rollbackUpdateContent,
} from "@/lib/factory/publish-v2";
import type { DbCfg } from "@/lib/factory/tick/internal-api";

const cfg: DbCfg = { url: "https://supabase.test", serviceKey: "service-key" };

const validation = {
  workItemStatus: "approved",
  workItemArtifactId: "art-1",
  approvalArtifactId: "art-1",
  approvalArtifactHash: "a".repeat(64),
  artifactHash: "a".repeat(64),
  approvalDecision: "approved",
  contentType: "guide",
  schemaVersion: "publish_payload_v1",
};

const baseReq = {
  workItemId: "wi-1",
  workKey: "wk-1",
  contentId: "doc-1",
  versionId: "v-new",
  approvalId: "appr-1",
  expectedMarker: "first paragraph",
  previousUniqueText: "old first paragraph",
  previousVersionId: "v-old",
  validation,
};

interface Call {
  method: string;
  url: string;
  body: unknown;
  signal: unknown;
}

function jsonResponse(data: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => data,
    text: async () => JSON.stringify(data),
  } as Response;
}

function installFetch(handler: (call: Call) => Response | Promise<Response> | never): Call[] {
  const calls: Call[] = [];
  const stub = (async (url: unknown, options: Record<string, unknown> = {}) => {
    const call: Call = {
      method: String(options.method ?? "GET"),
      url: String(url),
      body: options.body ? JSON.parse(String(options.body)) : undefined,
      signal: options.signal,
    };
    calls.push(call);
    return handler(call);
  }) as unknown as typeof fetch;
  vi.stubGlobal("fetch", stub);
  return calls;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

function rpcOk(replayed: boolean): Response {
  return jsonResponse({
    publication_id: "pub-1",
    outbox_id: "ob-1",
    previous_version_id: "v-old",
    version_id: "v-new",
    status: "pending",
    replayed,
  });
}

describe("publishUpdateContent", () => {
  it("publishes in order, with a timeout signal, and no DELETE", async () => {
    const calls = installFetch((call) => {
      if (call.url.includes("idempotency_key=eq.")) return jsonResponse([]);
      if (call.url.includes("publication_kind=eq.publish")) return jsonResponse([]);
      if (call.url.includes("/rpc/publish_v2_content_atomic")) return rpcOk(false);
      if (call.url.includes("content_versions?id=eq.v-old")) return jsonResponse([{ id: "v-old" }]);
      throw new Error(`unexpected call ${call.url}`);
    });
    const result = await publishUpdateContent(cfg, baseReq);
    expect(result.publicationId).toBe("pub-1");
    expect(result.outboxId).toBe("ob-1");
    expect(result.replayed).toBe(false);
    expect(result.dailyCount).toBe(0);
    expect(result.previousPreserved).toBe(true);
    expect(calls.some((c) => c.method === "DELETE")).toBe(false);
    const rpc = calls.find((c) => c.url.includes("/rpc/publish_v2_content_atomic"));
    expect(rpc).toBeDefined();
    expect((rpc?.body as Record<string, unknown>).p_publication_kind).toBe("publish");
    expect((rpc?.body as Record<string, unknown>).p_idempotency_key).toBe("publish-v2-wk-1");
    expect(rpc?.signal).toBeInstanceOf(AbortSignal);
    // ترتیب: بررسی Replay، بعد سقف روزانه، بعد RPC، بعد بررسی حفظ نسخهٔ پیشین.
    const order = calls.map((c) =>
      c.url.includes("idempotency_key=eq.")
        ? "replay-check"
        : c.url.includes("publication_kind=eq.publish")
          ? "daily-count"
          : c.url.includes("/rpc/")
            ? "rpc"
            : "verify",
    );
    expect(order).toEqual(["replay-check", "daily-count", "rpc", "verify"]);
  });

  it("rejects at the daily limit without calling the RPC", async () => {
    const calls = installFetch((call) => {
      if (call.url.includes("idempotency_key=eq.")) return jsonResponse([]);
      if (call.url.includes("publication_kind=eq.publish")) {
        return jsonResponse(Array.from({ length: 70 }, (_, i) => ({ id: `pub-${i}` })));
      }
      throw new Error(`unexpected call ${call.url}`);
    });
    await expect(publishUpdateContent(cfg, baseReq)).rejects.toMatchObject({
      code: "daily_publish_limit",
    });
    expect(calls.some((c) => c.url.includes("/rpc/"))).toBe(false);
  });

  it("skips the daily gate for a replayed publication", async () => {
    const calls = installFetch((call) => {
      if (call.url.includes("idempotency_key=eq.")) return jsonResponse([{ id: "pub-0" }]);
      if (call.url.includes("/rpc/publish_v2_content_atomic")) return rpcOk(true);
      if (call.url.includes("content_versions?id=eq.v-old")) return jsonResponse([{ id: "v-old" }]);
      throw new Error(`unexpected call ${call.url}`);
    });
    const result = await publishUpdateContent(cfg, baseReq);
    expect(result.replayed).toBe(true);
    expect(calls.some((c) => c.url.includes("publication_kind=eq.publish"))).toBe(false);
  });

  it("replays once after an RPC error and uses the replayed result", async () => {
    let rpcCalls = 0;
    installFetch((call) => {
      if (call.url.includes("idempotency_key=eq.")) return jsonResponse([]);
      if (call.url.includes("publication_kind=eq.publish")) return jsonResponse([]);
      if (call.url.includes("/rpc/publish_v2_content_atomic")) {
        rpcCalls += 1;
        if (rpcCalls === 1) throw new Error("network down");
        return rpcOk(true);
      }
      if (call.url.includes("content_versions?id=eq.v-old")) return jsonResponse([{ id: "v-old" }]);
      throw new Error(`unexpected call ${call.url}`);
    });
    const result = await publishUpdateContent(cfg, baseReq);
    expect(result.replayed).toBe(true);
    expect(rpcCalls).toBe(2);
  });

  it("reports outcome_unknown when the replay also fails", async () => {
    installFetch((call) => {
      if (call.url.includes("idempotency_key=eq.")) return jsonResponse([]);
      if (call.url.includes("publication_kind=eq.publish")) return jsonResponse([]);
      if (call.url.includes("/rpc/publish_v2_content_atomic")) throw new Error("network down");
      throw new Error(`unexpected call ${call.url}`);
    });
    const err = await publishUpdateContent(cfg, baseReq).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(PublishV2Error);
    expect((err as PublishV2Error).code).toBe("publish_outcome_unknown");
  });

  it("makes no calls when prerequisites are invalid", async () => {
    const calls = installFetch(() => {
      throw new Error("must not be called");
    });
    await expect(
      publishUpdateContent(cfg, { ...baseReq, validation: { ...validation, workItemStatus: "drafting" } }),
    ).rejects.toMatchObject({ code: "invalid_prerequisites" });
    expect(calls).toEqual([]);
  });
});

describe("rollbackUpdateContent", () => {
  it("calls the RPC with kind rollback and skips the daily gate", async () => {
    const calls = installFetch((call) => {
      if (call.url.includes("/rpc/publish_v2_content_atomic")) {
        return jsonResponse({
          publication_id: "pub-rb",
          outbox_id: "ob-rb",
          previous_version_id: "v-current",
          version_id: "v-target",
          status: "pending",
          replayed: false,
        });
      }
      throw new Error(`unexpected call ${call.url}`);
    });
    const result = await rollbackUpdateContent(cfg, {
      workItemId: "wi-1",
      workKey: "wk-1",
      contentId: "doc-1",
      targetVersionId: "v-target",
      rollbackOfPublicationId: "pub-cur",
      reason: "bad publish, restore previous",
      approvalId: "appr-1",
      expectedMarker: "target first paragraph",
      previousUniqueText: null,
    });
    expect(result.publicationId).toBe("pub-rb");
    expect(result.dailyCount).toBe(0);
    const rpc = calls.find((c) => c.url.includes("/rpc/"));
    expect((rpc?.body as Record<string, unknown>).p_publication_kind).toBe("rollback");
    expect((rpc?.body as Record<string, unknown>).p_idempotency_key).toBe("publish-v2-rollback-wk-1");
    expect(calls.some((c) => c.url.includes("publication_kind=eq.publish"))).toBe(false);
  });
});
