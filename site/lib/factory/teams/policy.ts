/**
 * سیاست‌های تیم‌ها. همهٔ تابع‌ها خالص‌اند و هیچ چیزی را تغییر
 * نمی‌دهند. ترتیب بررسی ابزار: اول فهرست ممنوع همگانی، بعد فهرست
 * مجاز همان تیم. ابزار ممنوع حتی اگر جایی در فهرست مجاز آمده
 * باشد، باز هم رد می‌شود.
 */

import {
  FORBIDDEN_TOOLS,
  TEAM_CONTRACT_MAP,
  type TeamContract,
  type TeamKey,
} from "./registry";
import { getWorkflow, type WorkflowDefinition } from "./workflows";

export interface PolicyDecision {
  allowed: boolean;
  reason: string;
}

export function checkToolAccess(teamKey: TeamKey, tool: string): PolicyDecision {
  const contract = TEAM_CONTRACT_MAP[teamKey];
  if (!contract) return { allowed: false, reason: "unknown team" };
  if (FORBIDDEN_TOOLS.includes(tool)) {
    return { allowed: false, reason: "forbidden tool for every team" };
  }
  if (!contract.allowed_tools.includes(tool)) {
    return { allowed: false, reason: "tool not in team allowed list" };
  }
  return { allowed: true, reason: "tool allowed for team" };
}

export function isToolAllowed(teamKey: TeamKey, tool: string): boolean {
  return checkToolAccess(teamKey, tool).allowed;
}

export function resolveWorkflowDefinition(workflowVersion: string): WorkflowDefinition | null {
  return getWorkflow(workflowVersion);
}

/**
 * وضعیت Workflow: نسخهٔ ناشناخته blocked است؛ نسخهٔ موکول‌شده
 * deferred است و نه اجرا می‌شود و نه مسدود است؛ نسخهٔ رسمی
 * executable است و نسخهٔ تازهٔ فاز ۳ defined_not_wired است.
 */
export function resolveWorkflowStatus(
  workflowVersion: string,
): "executable" | "deferred" | "defined_not_wired" | "blocked" {
  const def = getWorkflow(workflowVersion);
  if (!def) return "blocked";
  return def.tick_execution;
}

export function isWorkflowBlocked(workflowVersion: string): boolean {
  return resolveWorkflowStatus(workflowVersion) === "blocked";
}

/**
 * Tick فقط آیتم tick_managed مسیر رسمی را اجرا می‌کند. تیم manual
 * با هیچ Workflowای توسط Tick اجرا نمی‌شود و Workflow موکول‌شده
 * یا وصل‌نشده هم توسط Tick اجرا نمی‌شود.
 */
export function canTickExecute(executionMode: string, workflowVersion: string): PolicyDecision {
  if (executionMode !== "tick_managed") {
    return { allowed: false, reason: "manual teams are not executed by Tick" };
  }
  const def = getWorkflow(workflowVersion);
  if (!def) return { allowed: false, reason: "unknown workflow is blocked" };
  if (def.tick_execution !== "executable") {
    return { allowed: false, reason: "workflow is not tick-executable" };
  }
  return { allowed: true, reason: "tick-managed official workflow" };
}

export function hasHumanGate(workflowVersion: string): boolean {
  return getWorkflow(workflowVersion)?.requires_approval ?? false;
}

export function isProductionActive(contract: TeamContract): boolean {
  return contract.enabled_environment === "production" && contract.status === "active";
}

/**
 * خودمختاری فقط وقتی است که تیم در Production فعال باشد و همهٔ
 * Workflowهایش Gate انسانی داشته باشند. تیم بدون Human Gate
 * هرگز خودمختار نمی‌شود و تیم‌های فعلی با وضعیت configured و
 * محیط staging خودمختار نیستند.
 */
export function canRunAutonomously(contract: TeamContract): PolicyDecision {
  if (contract.enabled_environment !== "production") {
    return { allowed: false, reason: "team is not enabled in production" };
  }
  if (contract.status !== "active") {
    return { allowed: false, reason: "team status is not active" };
  }
  const gated = contract.workflow_versions.every((v) => hasHumanGate(v));
  if (!gated) {
    return { allowed: false, reason: "team workflow lacks a human gate" };
  }
  return { allowed: true, reason: "active production team with human gate" };
}
