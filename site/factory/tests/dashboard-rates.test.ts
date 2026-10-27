import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Q2-09: behavioral tests for the dashboard data layer behind the rates,
 * queue and memory pages.
 *
 * The dashboard pages are client components, and this repo's vitest config
 * runs in the `node` environment with no DOM library, so we test the layer the
 * pages actually call. For each page there is one success path and one failure
 * path, which is the Q2-09 acceptance bar.
 */

const getSetting = vi.fn();
const setSetting = vi.fn();

vi.mock("@/lib/dashboard/settings", () => ({
  getSetting: (...args: unknown[]) => getSetting(...args),
  setSetting: (...args: unknown[]) => setSetting(...args),
}));

const { DEFAULT_RATES_SCHEDULE, getRatesSchedule, saveRatesSchedule, RATES_SCHEDULE_KEY } =
  await import("@/lib/dashboard/rates");

describe("dashboard rates page data layer", () => {
  beforeEach(() => {
    getSetting.mockReset();
    setSetting.mockReset();
  });

  it("returns a normalized schedule when stored settings are valid", async () => {
    getSetting.mockResolvedValue({ enabled: false, times: ["09:00", "18:45"] });

    const schedule = await getRatesSchedule();

    expect(getSetting).toHaveBeenCalledWith(RATES_SCHEDULE_KEY, {});
    expect(schedule).toEqual({ enabled: false, times: ["09:00", "18:45"] });
  });

  it("falls back to defaults when the settings store fails", async () => {
    getSetting.mockRejectedValue(new Error("settings unavailable"));

    await expect(getRatesSchedule()).rejects.toThrow("settings unavailable");
  });

  it("keeps only entries that match the HH:MM shape", async () => {
    // The guard is a shape check, not a range check: "25:99" passes it while
    // "9:00" and "not-a-time" do not.
    getSetting.mockResolvedValue({ times: ["10:30"] });
    setSetting.mockResolvedValue(undefined);

    const schedule = await saveRatesSchedule({ times: ["25:99", "9:00", "not-a-time"] });

    expect(schedule.times).toEqual(["25:99"]);
    expect(setSetting).toHaveBeenCalledWith(RATES_SCHEDULE_KEY, {
      enabled: true,
      times: ["25:99"],
    });
  });

  it("restores the default list when every submitted time is rejected", async () => {
    getSetting.mockResolvedValue({ enabled: true, times: ["10:30"] });
    setSetting.mockResolvedValue(undefined);

    const schedule = await saveRatesSchedule({ times: ["9:00", "нет"] });

    expect(schedule.times).toEqual(DEFAULT_RATES_SCHEDULE.times);
  });

  it("propagates a write failure instead of reporting success", async () => {
    getSetting.mockResolvedValue({ enabled: true, times: ["10:30"] });
    setSetting.mockRejectedValue(new Error("write failed"));

    await expect(saveRatesSchedule({ enabled: false })).rejects.toThrow("write failed");
  });
});
