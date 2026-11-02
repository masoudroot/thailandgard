/**
 * تست‌های Workflow خودمختار محتوا (THG-AUTO-01).
 *
 * فقط قراردادهای خالص factory-tick پین می‌شوند:
 * - نسخهٔ guide_content_auto_v1 و فهرست دقیق ۸ قدم آن؛
 * - نبود قدم تأیید انسانی در این Workflow (جای آن auto_approve
 *   سیستمی و verify_publication است)؛
 * - عضویت قدم‌ها در Workflow درست و پشتیبانی نسخه؛
 * - گیت Generation همان v2 (paused یا generation خاموش، قدم را
 *   مسدود می‌کند)؛
 * - قدم‌های Workflow رسمی و v2 دست نخورده‌اند.
 */

import { describe, expect, it } from "vitest";
import {
  AUTO_TICK_STEP_KEYS,
  AUTO_WORKFLOW_VERSION,
  GATEWAY_V2_TICK_STEP_KEYS,
  GATEWAY_V2_WORKFLOW_VERSION,
  TICK_STEP_KEYS,
  WORKFLOW_VERSION,
  evaluateKillSwitches,
  gatewayStepBlockReason,
  isStepKeyOfWorkflow,
  isSupportedWorkflowVersion,
  isValidWorkflowStepKey,
  stepMaxAttempts,
} from "@/lib/factory/tick/factory-tick";

describe("autonomous workflow version and steps", () => {
  it("pins the auto workflow version and its exact 8 steps in order", () => {
    expect(AUTO_WORKFLOW_VERSION).toBe("guide_content_auto_v1");
    expect([...AUTO_TICK_STEP_KEYS]).toEqual([
      "generate_draft",
      "validate_artifact",
      "auto_approve",
      "create_version",
      "publish_version",
      "process_publication",
      "verify_publication",
      "complete_work",
    ]);
  });

  it("has no human approval step anywhere in the auto workflow", () => {
    expect((AUTO_TICK_STEP_KEYS as readonly string[]).includes("await_human_approval")).toBe(false);
    expect((AUTO_TICK_STEP_KEYS as readonly string[]).includes("auto_approve")).toBe(true);
    expect((AUTO_TICK_STEP_KEYS as readonly string[]).includes("verify_publication")).toBe(true);
  });

  it("supports the auto version and its steps, and keeps v1 and v2 intact", () => {
    expect(isSupportedWorkflowVersion(AUTO_WORKFLOW_VERSION)).toBe(true);
    for (const step of AUTO_TICK_STEP_KEYS) {
      expect(isValidWorkflowStepKey(step)).toBe(true);
      expect(isStepKeyOfWorkflow(step, AUTO_WORKFLOW_VERSION)).toBe(true);
    }
    expect(isStepKeyOfWorkflow("auto_approve", WORKFLOW_VERSION)).toBe(false);
    expect(isStepKeyOfWorkflow("auto_approve", GATEWAY_V2_WORKFLOW_VERSION)).toBe(false);
    expect(isStepKeyOfWorkflow("verify_publication", WORKFLOW_VERSION)).toBe(false);
    expect(isStepKeyOfWorkflow("await_human_approval", AUTO_WORKFLOW_VERSION)).toBe(false);
    expect([...TICK_STEP_KEYS]).toHaveLength(8);
    expect([...GATEWAY_V2_TICK_STEP_KEYS]).toEqual([
      "generate_draft",
      "validate_artifact",
      "await_human_approval",
    ]);
  });

  it("applies the same generation gate to auto steps as to gateway v2 steps", () => {
    const paused = evaluateKillSwitches({
      factory_paused: "true",
      generation_enabled: "true",
    });
    expect(gatewayStepBlockReason(paused, AUTO_WORKFLOW_VERSION, "generate_draft")).toBe("factory_paused");
    const genOff = evaluateKillSwitches({
      factory_paused: "false",
      generation_enabled: "false",
    });
    expect(gatewayStepBlockReason(genOff, AUTO_WORKFLOW_VERSION, "generate_draft")).toBe(
      "generation_disabled",
    );
    const open = evaluateKillSwitches({
      factory_paused: "false",
      generation_enabled: "true",
    });
    expect(gatewayStepBlockReason(open, AUTO_WORKFLOW_VERSION, "generate_draft")).toBeNull();
    expect(gatewayStepBlockReason(open, AUTO_WORKFLOW_VERSION, "complete_work")).toBeNull();
  });

  it("keeps attempt caps: publication processing gets 10, other auto steps 5", () => {
    expect(stepMaxAttempts("process_publication")).toBe(10);
    expect(stepMaxAttempts("verify_publication")).toBe(5);
    expect(stepMaxAttempts("auto_approve")).toBe(5);
    expect(stepMaxAttempts("generate_draft")).toBe(5);
  });
});
