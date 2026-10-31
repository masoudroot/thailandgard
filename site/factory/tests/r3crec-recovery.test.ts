import { describe, expect, it } from "vitest";
import { z } from "zod";
import { parseStoredResponse } from "@/lib/factory/tick/gateway-artifact-recovery";
import {
  remainingDailyBudget,
  summarizeOpenReconciliations,
  summarizeOpenReservations,
  summarizeSettledSimulated,
} from "@/lib/factory-dashboard/data";

const DRAFT_SCHEMA = z.object({ draft_paragraph: z.string().min(1) });

function storedResponse(overrides: Record<string, unknown> = {}) {
  return {
    output: { draft_paragraph: "پاراگراف آزمایشی" },
    usage: { prompt_tokens: 10, completion_tokens: 5 },
    cost: 30,
    cost_basis: "simulated",
    cost_unit: "mock-unit",
    ...overrides,
  };
}

describe("parseStoredResponse", () => {
  it("accepts a complete valid mock response", () => {
    const parsed = parseStoredResponse(storedResponse(), DRAFT_SCHEMA);
    expect(parsed).not.toBeNull();
    expect(parsed?.paragraph).toBe("پاراگراف آزمایشی");
    expect(parsed?.actualCost).toBe(30);
    expect(parsed?.costBasis).toBe("simulated");
    expect(parsed?.costUnit).toBe("mock-unit");
  });

  it("rejects a missing output", () => {
    expect(parseStoredResponse({ cost: 30, cost_basis: "simulated" }, DRAFT_SCHEMA)).toBeNull();
  });

  it("rejects an empty paragraph", () => {
    expect(
      parseStoredResponse(storedResponse({ output: { draft_paragraph: "" } }), DRAFT_SCHEMA),
    ).toBeNull();
  });

  it("coerces numeric strings but rejects NaN and negative costs", () => {
    expect(parseStoredResponse(storedResponse({ cost: "30" }), DRAFT_SCHEMA)).not.toBeNull();
    expect(parseStoredResponse(storedResponse({ cost: Number.NaN }), DRAFT_SCHEMA)).toBeNull();
    expect(parseStoredResponse(storedResponse({ cost: -5 }), DRAFT_SCHEMA)).toBeNull();
  });

  it("rejects an unknown cost basis", () => {
    expect(parseStoredResponse(storedResponse({ cost_basis: "real_usd" }), DRAFT_SCHEMA)).toBeNull();
  });

  it("rejects a null response", () => {
    expect(parseStoredResponse(null, DRAFT_SCHEMA)).toBeNull();
  });
});

describe("summarizeSettledSimulated", () => {
  it("sums only settled simulated operations", () => {
    expect(
      summarizeSettledSimulated([
        { state: "settled", settled_amount: 30, cost_basis: "simulated" },
        { state: "settled", settled_amount: 10, cost_basis: "simulated" },
        { state: "settled_unreturned", settled_amount: 100, cost_basis: "simulated" },
        { state: "released", settled_amount: 0, cost_basis: "simulated" },
      ]),
    ).toBe(40);
  });

  it("returns null when a settled operation has a non-simulated basis", () => {
    expect(
      summarizeSettledSimulated([
        { state: "settled", settled_amount: 30, cost_basis: "simulated" },
        { state: "settled", settled_amount: 50, cost_basis: "provider_actual" },
      ]),
    ).toBeNull();
  });

  it("returns null when a settled operation has no settled amount", () => {
    expect(
      summarizeSettledSimulated([{ state: "settled", settled_amount: null, cost_basis: "simulated" }]),
    ).toBeNull();
  });
});

describe("summarizeOpenReservations", () => {
  it("sums only states that still hold a reservation", () => {
    expect(
      summarizeOpenReservations([
        { state: "reserved", reserved_amount: 100 },
        { state: "sent", reserved_amount: 100 },
        { state: "unknown", reserved_amount: 100 },
        { state: "response_recorded", reserved_amount: 100 },
        { state: "settled", reserved_amount: 100 },
        { state: "released", reserved_amount: 100 },
        { state: "pending", reserved_amount: 0 },
      ]),
    ).toBe(400);
  });
});

describe("summarizeOpenReconciliations", () => {
  it("counts pending rows and sums excess amounts", () => {
    expect(
      summarizeOpenReconciliations([
        { kind: "excess", excess_amount: 20 },
        { kind: "excess", excess_amount: 5 },
        { kind: "unknown", excess_amount: null },
      ]),
    ).toEqual({ count: 3, excessTotal: 25 });
  });

  it("returns a null total when an excess row has no amount", () => {
    expect(
      summarizeOpenReconciliations([{ kind: "excess", excess_amount: null }]),
    ).toEqual({ count: 1, excessTotal: null });
  });
});

describe("remainingDailyBudget", () => {
  it("returns limit minus spent for the current day with simulated bases", () => {
    expect(remainingDailyBudget(1000000, 61950, "2026-10-31", ["simulated"], "2026-10-31")).toBe(938050);
  });

  it("returns null for a stale day row", () => {
    expect(remainingDailyBudget(1000000, 61950, "2026-10-30", ["simulated"], "2026-10-31")).toBeNull();
  });

  it("returns null when spent exceeds the limit", () => {
    expect(remainingDailyBudget(100, 200, "2026-10-31", ["simulated"], "2026-10-31")).toBeNull();
  });

  it("returns null when a non-simulated basis exists", () => {
    expect(
      remainingDailyBudget(1000000, 61950, "2026-10-31", ["simulated", "provider_actual"], "2026-10-31"),
    ).toBeNull();
  });

  it("returns null when limit or spent is missing", () => {
    expect(remainingDailyBudget(null, 100, "2026-10-31", ["simulated"], "2026-10-31")).toBeNull();
    expect(remainingDailyBudget(1000, null, "2026-10-31", ["simulated"], "2026-10-31")).toBeNull();
  });
});
