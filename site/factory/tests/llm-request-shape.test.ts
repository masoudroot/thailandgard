import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * 9router (and some other OpenAI-compatible gateways) stream SSE by default
 * when `stream` is omitted, so `res.json()` parsed an empty body and the call
 * looked like "no content". The client must always ask for a single JSON
 * answer explicitly; this test pins that down.
 */

const ENDPOINT = {
  id: "ep-1",
  name: "9router",
  baseUrl: "https://gateway.test/v1",
  apiKey: "sk-test",
};

vi.mock("@/lib/dashboard/llm-endpoints", () => ({
  getTeamModelMap: async () => ({}),
  getDefaultModel: async () => null,
  listEndpoints: async () => [ENDPOINT],
  getEndpoint: async () => ENDPOINT,
  readModelHealthCache: async () => ({}),
  saveTeamModelMap: async () => undefined,
  resolveEmbeddingChain: async () => [],
  EXPECTED_EMBEDDING_DIM: 1536,
}));

vi.mock("@/lib/dashboard/model-health", () => ({
  getCooldownKeys: async () => new Set<string>(),
  recordModelFailure: async () => undefined,
  recordModelSuccess: async () => undefined,
}));

const { callLLM } = await import("@/lib/dashboard/llm");

describe("callLLM request shape", () => {
  const bodies: string[] = [];

  beforeEach(() => {
    bodies.length = 0;
    vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
      bodies.push(String(init.body));
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: "سالم" } }],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it("asks for a non-streamed JSON answer", async () => {
    const text = await callLLM("سلام", {
      task: { endpointId: ENDPOINT.id, model: "me-9router" },
    });

    expect(text).toBe("سالم");
    expect(bodies).toHaveLength(1);
    const body = JSON.parse(bodies[0]) as Record<string, unknown>;
    expect(body.stream).toBe(false);
    expect(body.model).toBe("me-9router");
  });
});