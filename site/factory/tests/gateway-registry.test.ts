/**
 * تست‌های خالص رجیستری سیاست Model Gateway (نسخهٔ ۲).
 *
 * این تست‌ها بدون دیتابیس و بدون هیچ فراخوان شبکه‌ای اجرا می‌شوند؛
 * شواهد T1 تا T4 فقط به‌عنوان رکورد تاریخی خوانده می‌شوند و هرگز
 * دوباره اجرا نمی‌شوند. قاعده‌های اثبات‌شده: سقف نامحدود مصوب در
 * نسخهٔ ۲، سقف صفر نسخهٔ ۱ که برای سابقه مانده، Timeout
 * ۳۰ ثانیه‌ای، نبود retry کور برای outcome_unknown، صفر فرض نشدن
 * هزینهٔ unknown، و حذف reasoning_content از خروجی ذخیره‌شده.
 */
import { describe, expect, it } from "vitest";
import {
  containsReasoningContent,
  costForDisplay,
  CURRENT_BUDGET_POLICY,
  decideAfterOutcome,
  GATEWAY_MODELS,
  GATEWAY_PENDING_DECISIONS,
  GATEWAY_REGISTRY_ID,
  GATEWAY_REGISTRY_VERSION,
  GATEWAY_V1_BUDGET_POLICY,
  GATEWAY_V2_BUDGET_POLICY,
  isCallAllowed,
  isCostKnown,
  MODEL_TIMEOUT_MS,
  modelsForCapability,
  REFERENCE_ACCOUNT_EVIDENCE,
  stripReasoningContent,
  sumCosts,
  TEAM_GATEWAY_PROVIDER,
  TEAM_GATEWAY_PROVIDERS,
  timeoutForModel,
} from "@/lib/factory/gateway/registry";

describe("registry version", () => {
  it("is version 2 with a stable id", () => {
    expect(GATEWAY_REGISTRY_VERSION).toBe(2);
    expect(GATEWAY_REGISTRY_ID).toBe("gateway-registry-v2");
  });
});

describe("provider record", () => {
  it("records exactly one real provider, connected, with no fallback", () => {
    expect(TEAM_GATEWAY_PROVIDERS).toHaveLength(1);
    expect(TEAM_GATEWAY_PROVIDER.id).toBe("reformboss");
    expect(TEAM_GATEWAY_PROVIDER.status).toBe("connected");
    expect(TEAM_GATEWAY_PROVIDER.fallbackProvider).toBeNull();
  });

  it("contains no mock provider entry", () => {
    expect(
      TEAM_GATEWAY_PROVIDERS.some((provider) =>
        provider.id.toLowerCase().includes("mock"),
      ),
    ).toBe(false);
  });

  it("marks the vault account deprecated", () => {
    expect(TEAM_GATEWAY_PROVIDER.vaultAccountStatus).toBe("deprecated");
  });
});

describe("consumption cap (v1 retained, v2 current)", () => {
  it("keeps the v1 zero cap locked for history", () => {
    expect(GATEWAY_V1_BUDGET_POLICY.consumptionCap).toBe(0);
    expect(GATEWAY_V1_BUDGET_POLICY.budgetApproved).toBe(false);
    expect(isCallAllowed(GATEWAY_V1_BUDGET_POLICY)).toBe(false);
  });

  it("sets the current policy to unlimited with explicit approval (v2)", () => {
    expect(CURRENT_BUDGET_POLICY).toBe(GATEWAY_V2_BUDGET_POLICY);
    expect(CURRENT_BUDGET_POLICY.consumptionCap).toBeNull();
    expect(CURRENT_BUDGET_POLICY.budgetApproved).toBe(true);
    expect(isCallAllowed(CURRENT_BUDGET_POLICY)).toBe(true);
  });

  it("stays forbidden with cap zero even if a budget were approved", () => {
    expect(
      isCallAllowed({ consumptionCap: 0, budgetApproved: true }),
    ).toBe(false);
  });

  it("stays forbidden with an unlimited cap but no explicit approval", () => {
    expect(
      isCallAllowed({ consumptionCap: null, budgetApproved: false }),
    ).toBe(false);
  });

  it("stays forbidden with a positive cap but no explicit approval", () => {
    expect(
      isCallAllowed({ consumptionCap: 1000, budgetApproved: false }),
    ).toBe(false);
  });

  it("allows calls only with a cap (positive or unlimited) and explicit approval together", () => {
    expect(
      isCallAllowed({ consumptionCap: 1000, budgetApproved: true }),
    ).toBe(true);
    expect(
      isCallAllowed({ consumptionCap: null, budgetApproved: true }),
    ).toBe(true);
  });
});

describe("capability-based model selection", () => {
  it("returns capability-specific extraction candidates", () => {
    const models = modelsForCapability("extraction");
    expect(models).toContain("qwen3.8-flash");
    expect(models).toContain("deepseek-v4.1-flash");
    expect(models).not.toContain("qwen3.8-max");
  });

  it("returns capability-specific generation candidates", () => {
    const models = modelsForCapability("generation");
    expect(models).toContain("qwen-flash");
    expect(models).not.toContain("qwen3.8-max");
    expect(models).not.toContain("qwen3.8-flash");
    expect(models).not.toContain("deepseek-v4.1-flash");
  });

  it("does not force one shared model across capabilities", () => {
    const extraction = modelsForCapability("extraction");
    const generation = modelsForCapability("generation");
    expect(extraction).not.toEqual(generation);
  });
});

describe("per-model timeout", () => {
  it("is 30 seconds", () => {
    expect(MODEL_TIMEOUT_MS).toBe(30_000);
  });

  it("is 30 seconds for every registered model", () => {
    for (const entry of GATEWAY_MODELS) {
      expect(timeoutForModel(entry.model)).toBe(30_000);
    }
  });

  it("rejects unknown models instead of silently timing them", () => {
    expect(() => timeoutForModel("no-such-model")).toThrow();
  });
});

describe("outcome_unknown handling", () => {
  it("holds outcome_unknown for reconciliation with no blind retry", () => {
    expect(decideAfterOutcome("outcome_unknown")).toEqual({
      retryBlindly: false,
      nextStep: "hold_for_reconciliation",
    });
  });

  it("never allows a blind retry for any outcome", () => {
    for (const outcome of ["succeeded", "failed", "outcome_unknown"] as const) {
      expect(decideAfterOutcome(outcome).retryBlindly).toBe(false);
    }
  });
});

describe("unknown cost", () => {
  it("is not displayed as zero", () => {
    expect(costForDisplay(null)).toBe("نامشخص");
    expect(costForDisplay(null)).not.toBe("0");
  });

  it("is reported unknown, never known-zero", () => {
    expect(isCostKnown(null)).toBe(false);
    expect(isCostKnown(0)).toBe(true);
  });

  it("is not counted as zero in sums", () => {
    expect(sumCosts([100, null, 50])).toEqual({
      total: 150,
      unknownCount: 1,
    });
    expect(sumCosts([null, null])).toEqual({ total: 0, unknownCount: 2 });
  });
});

describe("reasoning stripping", () => {
  it("removes reasoning_content at top level, nested, and inside arrays", () => {
    const raw = {
      output: { text: "سلام" },
      reasoning_content: "hidden chain",
      choices: [
        { text: "a", reasoning_content: "hidden nested" },
        { text: "b" },
      ],
    };
    const stripped = stripReasoningContent(raw);
    expect(containsReasoningContent(stripped)).toBe(false);
    expect(stripped).toEqual({
      output: { text: "سلام" },
      choices: [{ text: "a" }, { text: "b" }],
    });
  });

  it("does not mutate the input", () => {
    const raw = { reasoning_content: "hidden", kept: 1 };
    stripReasoningContent(raw);
    expect(containsReasoningContent(raw)).toBe(true);
  });

  it("detects reasoning in the raw response", () => {
    expect(containsReasoningContent({ reasoning_content: "x" })).toBe(true);
    expect(containsReasoningContent({ output: "clean" })).toBe(false);
  });
});

describe("reference account evidence (historical record only)", () => {
  it("records exactly T1 to T4 with their models and capabilities", () => {
    expect(REFERENCE_ACCOUNT_EVIDENCE.map((entry) => entry.id)).toEqual([
      "T1",
      "T2",
      "T3",
      "T4",
    ]);
    expect(REFERENCE_ACCOUNT_EVIDENCE).toContainEqual(
      expect.objectContaining({
        id: "T1",
        model: "qwen3.8-flash",
        capability: "extraction",
        httpStatus: 200,
        totalTokens: 653,
      }),
    );
    expect(REFERENCE_ACCOUNT_EVIDENCE).toContainEqual(
      expect.objectContaining({
        id: "T2",
        model: "deepseek-v4.1-flash",
        capability: "extraction",
        httpStatus: 200,
        totalTokens: 401,
      }),
    );
    expect(REFERENCE_ACCOUNT_EVIDENCE).toContainEqual(
      expect.objectContaining({
        id: "T3",
        model: "qwen3.8-max",
        capability: "generation",
        httpStatus: 200,
        totalTokens: 274,
      }),
    );
    expect(REFERENCE_ACCOUNT_EVIDENCE).toContainEqual(
      expect.objectContaining({
        id: "T4",
        model: "qwen3.8-flash",
        capability: "generation",
        httpStatus: 200,
        totalTokens: 459,
      }),
    );
  });

  it("marks every evidence row usage-detail inconsistent and reasoning-bearing", () => {
    for (const entry of REFERENCE_ACCOUNT_EVIDENCE) {
      expect(entry.usageDetailConsistent).toBe(false);
      expect(entry.reasoningInRawResponse).toBe(true);
    }
  });
});

describe("pending decisions", () => {
  it("keeps the pre-Production key rotation item open", () => {
    expect(GATEWAY_PENDING_DECISIONS.length).toBeGreaterThan(0);
    expect(
      GATEWAY_PENDING_DECISIONS.some(
        (item) =>
          item.includes("Panachat secure card") &&
          item.includes("rotated key"),
      ),
    ).toBe(true);
  });
});
