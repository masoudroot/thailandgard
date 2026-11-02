/**
 * تست آداپتور ReformBoss (THG-RB-01).
 *
 * بدون شبکهٔ واقعی: fetch بدل می‌شود و env بدل گذاشته می‌شود.
 * اثبات‌شده‌ها: نبود هر متغیر یعنی blocked با ذکر نام همان متغیر؛
 * فراخوان موفق، URL و هدر و بدنهٔ درست را می‌فرستد و سیگنال Abort
 * را پاس می‌دهد؛ محتوای JSON متنی، پارس می‌شود؛ usage با fallback
 * جمع به total می‌رسد؛ نبود قیمت یعنی cost برابر null و بودن
 * قیمت یعنی provider_actual؛ خطای HTTP بدون retry بالا می‌آید.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ReformBossProvider,
  REFORMBOSS_ENV_VARS,
} from "@/lib/factory/gateway/reformboss";

const BASE_URL = "https://api.reformboss.test/v1";
const API_KEY = "test-key-not-real";

function mockFetch(payload: unknown, ok = true, status = 200) {
  const fn = vi.fn(async () => ({
    ok,
    status,
    json: async () => payload,
  }));
  vi.stubGlobal("fetch", fn);
  return fn;
}

describe("ReformBoss provider env gating", () => {
  beforeEach(() => {
    process.env.REFORMBOSS_API_BASE_URL = BASE_URL;
    process.env.REFORMBOSS_API_KEY = API_KEY;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.REFORMBOSS_API_BASE_URL;
    delete process.env.REFORMBOSS_API_KEY;
  });

  it("is blocked naming the missing var when the key is absent", () => {
    delete process.env.REFORMBOSS_API_KEY;
    const provider = new ReformBossProvider();
    expect(provider.status).toBe("blocked");
    expect(provider.blockedReason).toContain("REFORMBOSS_API_KEY");
    expect(REFORMBOSS_ENV_VARS).toContain("REFORMBOSS_API_KEY");
  });

  it("is blocked naming the missing var when the base URL is absent", () => {
    delete process.env.REFORMBOSS_API_BASE_URL;
    const provider = new ReformBossProvider();
    expect(provider.status).toBe("blocked");
    expect(provider.blockedReason).toContain("REFORMBOSS_API_BASE_URL");
  });

  it("rejects the call without touching the network when blocked", async () => {
    delete process.env.REFORMBOSS_API_KEY;
    const fetchSpy = mockFetch({});
    const provider = new ReformBossProvider();
    await expect(
      provider.call({
        request: {
          model_id: "qwen3.8-flash",
          token_limit: 100,
          input: { prompt: "hi" },
        } as never,
        signal: new AbortController().signal,
      }),
    ).rejects.toThrow("REFORMBOSS_API_KEY");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("posts an OpenAI-compatible body and maps usage with total fallback", async () => {
    const fetchSpy = mockFetch({
      choices: [
        { message: { content: JSON.stringify({ text: "draft" }) } },
      ],
      usage: { prompt_tokens: 10, completion_tokens: 20 },
    });
    const controller = new AbortController();
    const provider = new ReformBossProvider();
    const result = await provider.call({
      request: {
        model_id: "qwen3.8-flash",
        token_limit: 500,
        input: { prompt: "write a draft" },
      } as never,
      signal: controller.signal,
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, options] = fetchSpy.mock.calls[0] as unknown as [string, Record<string, unknown>];
    expect(url).toBe(`${BASE_URL}/chat/completions`);
    expect((options.headers as Record<string, string>).Authorization).toBe(
      `Bearer ${API_KEY}`,
    );
    expect(options.signal).toBe(controller.signal);
    const body = JSON.parse(options.body as string) as Record<string, unknown>;
    expect(body.model).toBe("qwen3.8-flash");
    expect(body.max_tokens).toBe(500);
    expect(body.messages).toEqual([{ role: "user", content: "write a draft" }]);
    expect(result.output).toEqual({ text: "draft" });
    expect(result.usage).toEqual({
      promptTokens: 10,
      completionTokens: 20,
      totalTokens: 30,
    });
    expect(result.cost).toBeNull();
  });

  it("keeps non-JSON content as a string for schema validation downstream", async () => {
    mockFetch({
      choices: [{ message: { content: "not json" } }],
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
    });
    const provider = new ReformBossProvider();
    const result = await provider.call({
      request: {
        model_id: "qwen3.8-flash",
        token_limit: 100,
        input: { prompt: "hi" },
      } as never,
      signal: new AbortController().signal,
    });
    expect(result.output).toBe("not json");
  });

  it("reports a provider cost as provider_actual when the response carries one", async () => {
    mockFetch({
      choices: [{ message: { content: JSON.stringify({ text: "draft" }) } }],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 20,
        total_tokens: 30,
        cost: 0.012,
      },
    });
    const provider = new ReformBossProvider();
    const result = await provider.call({
      request: {
        model_id: "qwen3.8-flash",
        token_limit: 100,
        input: { prompt: "hi" },
      } as never,
      signal: new AbortController().signal,
    });
    expect(result.cost).toBe(0.012);
    expect(result.cost_basis).toBe("provider_actual");
  });

  it("throws once on HTTP errors without retrying", async () => {
    const fetchSpy = mockFetch({ error: "no access" }, false, 403);
    const provider = new ReformBossProvider();
    await expect(
      provider.call({
        request: {
          model_id: "qwen3.8-flash",
          token_limit: 100,
          input: { prompt: "hi" },
        } as never,
        signal: new AbortController().signal,
      }),
    ).rejects.toThrow("403");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
