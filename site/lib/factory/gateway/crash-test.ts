import "./server-guard";

/**
 * قلاب تزریق Crash برای تست‌های R3B. فقط آزمایشی است و پیش‌فرض
 * خاموش: وقتی R3B_TEST_MODE برابر "1" نباشد، هیچ کاری نمی‌کند و
 * وقتی R3B_TEST_CRASH_AFTER هم نام مرحله نباشد، هیچ کاری نمی‌کند.
 * در مسیر واقعی سرور (بدون این متغیرها) این قلاب اصلاً فعال نیست
 * و هیچ رفتاری را عوض نمی‌کند.
 *
 * مرحله‌ها:
 * - reserve: پس از رزرو، پیش از فراخوان Provider؛
 * - send: پس از فراخوان Provider، پیش از ثبت بادوام پاسخ؛
 * - response: پس از بازگشت Provider، پیش از تسویه؛
 * - settle: پس از تسویه، پیش از بازگشت نتیجه به Work Item؛
 * - return: پس از فراخوان Gateway، پیش از finish شدن Step؛
 * - artifact: پس از تسویه و موفقیت Gateway در مسیر Tick، پیش از
 *   درج Artifact (پنجرهٔ R3C-RECOVERY)؛
 * - artifact_registered: پس از درج Artifact در مسیر Tick، پیش از
 *   finish شدن Step.
 */
export type CrashStage = "reserve" | "send" | "response" | "settle" | "return" | "artifact" | "artifact_registered";

export class SimulatedCrashError extends Error {
  readonly stage: CrashStage;

  constructor(stage: CrashStage) {
    super(`simulated crash after ${stage}`);
    this.name = "SimulatedCrashError";
    this.stage = stage;
  }
}

export function throwIfCrashAfter(stage: CrashStage): void {
  if (process.env.R3B_TEST_MODE !== "1") {
    return;
  }
  if (process.env.R3B_TEST_CRASH_AFTER !== stage) {
    return;
  }
  throw new SimulatedCrashError(stage);
}

export function isSimulatedCrash(error: unknown): error is SimulatedCrashError {
  return error instanceof SimulatedCrashError;
}
