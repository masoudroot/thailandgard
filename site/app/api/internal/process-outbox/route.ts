import { NextRequest, NextResponse } from "next/server";
import {
  checkAuth,
  dbConfig,
} from "@/lib/factory/tick/internal-api";
import {
  processOutboxBatch,
  type ProcessOutboxHooks,
} from "@/lib/factory/tick/process-outbox-batch";

/**
 * POST /api/internal/process-outbox
 * پوستهٔ نازک روی سرویس مشترک processOutboxBatch؛ منطق این‌جا نیست.
 * احراز هویت با INTERNAL_PUBLISH_TOKEN؛ همان قرارداد پیشین (بدنهٔ
 * خالی یعنی بدون Test Hook؛ Test Hookها فقط وقتی
 * M2_TEST_HOOKS_ENABLED=true است عمل می‌کنند).
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!process.env.INTERNAL_PUBLISH_TOKEN) {
    return NextResponse.json({ error: "outbox processor not configured" }, { status: 503 });
  }
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const cfg = dbConfig();
  if (!cfg) {
    return NextResponse.json({ error: "outbox processor not configured" }, { status: 503 });
  }
  const hooks: ProcessOutboxHooks = {};
  try {
    const body: unknown = await req.json().catch(() => ({}));
    if (body !== null && typeof body === "object" && !Array.isArray(body)) {
      const hooksEnabled = process.env.M2_TEST_HOOKS_ENABLED === "true";
      hooks.testFailRevalidation = (body as Record<string, unknown>).test_fail_revalidation === true && hooksEnabled;
      hooks.testForceStalePage = (body as Record<string, unknown>).test_force_stale_page === true && hooksEnabled;
      hooks.testCrashAfterDispatch = (body as Record<string, unknown>).test_crash_after_dispatch === true && hooksEnabled;
    }
  } catch {
    hooks.testFailRevalidation = false;
    hooks.testForceStalePage = false;
    hooks.testCrashAfterDispatch = false;
  }
  const forwardedProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const host = req.headers.get("host");
  const origin = host ? `${forwardedProto ?? "http"}://${host}` : `http://127.0.0.1:${process.env.PORT ?? "3100"}`;
  const result = await processOutboxBatch(cfg, origin, hooks);
  return NextResponse.json(result.body, { status: result.status });
}
