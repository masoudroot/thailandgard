import { describe, expect, it } from "vitest";
import {
  GATEWAY_CONTRACT_VERSION,
} from "@/lib/factory/gateway/gateway";
import {
  throwIfCrashAfter,
  SimulatedCrashError,
} from "@/lib/factory/gateway/crash-test";
import {
  OPEN_OPERATION_STATES,
  computeInputFingerprint,
  computeLogicalOperationId,
  type OperationInput,
} from "@/lib/factory/gateway/operations";
import {
  CYCLE_EXECUTOR_KEY,
  GATEWAY_TEST_OPERATION,
  GATEWAY_TEST_STEP_KEY,
  GATEWAY_TEST_WORKFLOW,
} from "@/lib/factory/tick/gateway-attempt-cycle";

const WORK_ITEM_ID = "11111111-1111-4111-8111-111111111111";
const WORK_STEP_ID = "22222222-2222-4222-8222-222222222222";

function baseInput(key: string, input: unknown = { q: "x" }): OperationInput {
  return {
    work_item_id: WORK_ITEM_ID,
    work_step_id: WORK_STEP_ID,
    operation_name: GATEWAY_TEST_OPERATION,
    idempotency_key: key,
    capability: "test-cap",
    provider: "mock",
    model_id: "mock-1",
    prompt_version: "v1",
    token_limit: 30,
    timeout: 5000,
    input,
  };
}

describe("r3b logical operation identity", () => {
  it("contract version is r3-gateway-4", () => {
    expect(GATEWAY_CONTRACT_VERSION).toBe("r3-gateway-4");
  });

  it("logical id is deterministic and independent of key and attempt", () => {
    const a = computeLogicalOperationId(
      WORK_ITEM_ID,
      GATEWAY_TEST_STEP_KEY,
      GATEWAY_TEST_OPERATION,
    );
    const b = computeLogicalOperationId(
      WORK_ITEM_ID,
      GATEWAY_TEST_STEP_KEY,
      GATEWAY_TEST_OPERATION,
    );
    expect(a).toBe(b);
    expect(a.startsWith("gwop1:")).toBe(true);
    expect(a.slice("gwop1:".length)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("logical id changes with step key or operation name", () => {
    const base = computeLogicalOperationId(
      WORK_ITEM_ID,
      GATEWAY_TEST_STEP_KEY,
      GATEWAY_TEST_OPERATION,
    );
    expect(
      computeLogicalOperationId(WORK_ITEM_ID, "other_step", GATEWAY_TEST_OPERATION),
    ).not.toBe(base);
    expect(
      computeLogicalOperationId(WORK_ITEM_ID, GATEWAY_TEST_STEP_KEY, "other_op"),
    ).not.toBe(base);
  });

  it("fingerprint is stable for the same content", () => {
    expect(computeInputFingerprint(baseInput("k1"))).toBe(
      computeInputFingerprint(baseInput("k2")),
    );
  });

  it("fingerprint changes with input content or token limit", () => {
    const base = computeInputFingerprint(baseInput("k1"));
    expect(computeInputFingerprint(baseInput("k1", { q: "y" }))).not.toBe(base);
    expect(
      computeInputFingerprint({ ...baseInput("k1"), token_limit: 31 }),
    ).not.toBe(base);
  });

  it("open states are exactly the six non-terminal states", () => {
    expect([...OPEN_OPERATION_STATES].sort()).toEqual(
      [
        "pending",
        "reserved",
        "sent",
        "unknown",
        "response_recorded",
        "settled_unreturned",
      ].sort(),
    );
  });

  it("cycle constants name the test workflow and step", () => {
    expect(GATEWAY_TEST_WORKFLOW).toBe("gateway_test_v1");
    expect(GATEWAY_TEST_STEP_KEY).toBe("gateway_model_call");
    expect(CYCLE_EXECUTOR_KEY).toBe("r3b-gateway-cycle");
  });
});

describe("r3b crash hooks are off by default", () => {
  it("does nothing without R3B_TEST_MODE", () => {
    delete process.env.R3B_TEST_MODE;
    delete process.env.R3B_TEST_CRASH_AFTER;
    expect(() => throwIfCrashAfter("reserve")).not.toThrow();
    expect(() => throwIfCrashAfter("send")).not.toThrow();
    expect(() => throwIfCrashAfter("response")).not.toThrow();
    expect(() => throwIfCrashAfter("settle")).not.toThrow();
    expect(() => throwIfCrashAfter("return")).not.toThrow();
  });

  it("throws only for the named stage when test mode is on", () => {
    process.env.R3B_TEST_MODE = "1";
    process.env.R3B_TEST_CRASH_AFTER = "reserve";
    try {
      expect(() => throwIfCrashAfter("send")).not.toThrow();
      let caught: unknown;
      try {
        throwIfCrashAfter("reserve");
      } catch (error) {
        caught = error;
      }
      expect(caught).toBeInstanceOf(SimulatedCrashError);
      expect((caught as SimulatedCrashError).stage).toBe("reserve");
    } finally {
      delete process.env.R3B_TEST_MODE;
      delete process.env.R3B_TEST_CRASH_AFTER;
    }
  });
});
