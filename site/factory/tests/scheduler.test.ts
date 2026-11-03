/**
 * تست ساعت داخلی (THG-SCHED-02): محاسبهٔ سررسید و وضعیت نگهبانی.
 * فقط توابع خالص lib/scheduler/jobs تست می‌شوند؛ دیتابیس و شبکه این‌جا نیستند.
 */
import { describe, expect, it } from "vitest";
import {
  computeNextDue,
  watchdogStatus,
  plainErrorFa,
  type SchedulerJob,
  type SchedulerRun,
} from "../../lib/scheduler/jobs";

function job(partial: Partial<SchedulerJob>): SchedulerJob {
  return {
    id: "job-1",
    job_key: "tick_pump",
    display_name: "تیک و پمپ",
    kind: "interval",
    interval_minutes: 5,
    daily_utc_time: null,
    enabled: true,
    next_due: "2026-11-03T06:00:00.000Z",
    last_run_at: null,
    last_status: null,
    last_result: null,
    last_error: null,
    ...partial,
  };
}

function run(partial: Partial<SchedulerRun>): SchedulerRun {
  return {
    id: "run-1",
    job_key: "tick_pump",
    trigger: "worker_loop",
    source: "internal_worker",
    status: "success",
    started_at: "2026-11-03T06:00:00.000Z",
    finished_at: "2026-11-03T06:00:30.000Z",
    result: null,
    error: null,
    ...partial,
  };
}

describe("computeNextDue", () => {
  it("کار فاصله‌ای: لحظه به‌اضافهٔ فاصله", () => {
    const next = computeNextDue(
      { kind: "interval", interval_minutes: 5, daily_utc_time: null },
      new Date("2026-11-03T06:00:00.000Z"),
    );
    expect(next.toISOString()).toBe("2026-11-03T06:05:00.000Z");
  });

  it("کار روزانه: اگر زمان امروز هنوز نیامده، همان امروز", () => {
    const next = computeNextDue(
      { kind: "daily", interval_minutes: null, daily_utc_time: "02:00" },
      new Date("2026-11-03T01:00:00.000Z"),
    );
    expect(next.toISOString()).toBe("2026-11-03T02:00:00.000Z");
  });

  it("کار روزانه: اگر زمان امروز گذشته، فردا", () => {
    const next = computeNextDue(
      { kind: "daily", interval_minutes: null, daily_utc_time: "02:00" },
      new Date("2026-11-03T03:00:00.000Z"),
    );
    expect(next.toISOString()).toBe("2026-11-04T02:00:00.000Z");
  });

  it("کار روزانه: دقیقاً سر زمان، فردا (نه همان لحظه)", () => {
    const next = computeNextDue(
      { kind: "daily", interval_minutes: null, daily_utc_time: "02:00" },
      new Date("2026-11-03T02:00:00.000Z"),
    );
    expect(next.toISOString()).toBe("2026-11-04T02:00:00.000Z");
  });
});

describe("watchdogStatus", () => {
  const now = new Date("2026-11-03T06:10:00.000Z");

  it("اجرای داخلی در پنجره: healthy", () => {
    expect(
      watchdogStatus([job({})], [run({ started_at: "2026-11-03T06:05:00.000Z" })], now),
    ).toBe("healthy");
  });

  it("بدون اجرای داخلی در پنجره: down", () => {
    expect(
      watchdogStatus([job({})], [run({ started_at: "2026-11-03T05:00:00.000Z" })], now),
    ).toBe("down");
  });

  it("اجرای دیسپچر بیرونی، نگهبانی را سبز نمی‌کند", () => {
    expect(
      watchdogStatus(
        [job({})],
        [run({ started_at: "2026-11-03T06:09:00.000Z", source: "github_actions" })],
        now,
      ),
    ).toBe("down");
  });

  it("کار خاموش از داشبورد: paused نه down", () => {
    expect(watchdogStatus([job({ enabled: false })], [], now)).toBe("paused");
  });

  it("نبودن کار تیک و پمپ: unknown", () => {
    expect(watchdogStatus([], [], now)).toBe("unknown");
  });
});

describe("plainErrorFa", () => {
  it("خرابی ارائه‌دهنده به جملهٔ ساده می‌رسد", () => {
    expect(plainErrorFa("provider_unavailable: Arrearage")).toBe(
      "سرویس مدل پاسخ نمی‌دهد؛ چیزی منتشر نشده است.",
    );
  });

  it("نبودن حساب سرویس سرچ کنسول به جملهٔ ساده می‌رسد", () => {
    expect(plainErrorFa("gsc service_account not created")).toBe(
      "حساب سرویس سرچ کنسول هنوز ساخته نشده است؛ داده‌ای درج نشد.",
    );
  });

  it("خطای خالی، خالی برمی‌گردد", () => {
    expect(plainErrorFa(null)).toBeNull();
  });
});
