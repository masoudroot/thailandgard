import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { randomUUID } from "node:crypto";
import {
  backoffSeconds,
  isRedispatchCapReached,
  isValidPublicationTransition,
  isVerificationCapReached,
  verificationBackoffSeconds,
  verifyPageWithRetries,
  OUTBOX_LEASE_SECONDS,
  OUTBOX_MAX_ATTEMPTS,
} from "@/lib/factory/tick/publish-outbox";
import {
  checkAuth,
  dbConfig,
  postgrestGet,
  postgrestRpc,
  postgrestWrite,
  type DbCfg,
} from "@/lib/factory/tick/internal-api";

/**
 * شناسهٔ نمونهٔ سرور جاری. در زمان بارگذاری ماژول، یک‌بار ساخته می‌شود و
 * تا پایان عمر همان پروسس سرور ثابت می‌ماند. ری‌استارت سرور، ماژول را
 * دوباره بارگذاری می‌کند و شناسهٔ تازه می‌سازد. همین تفاوت، تنها نشانهٔ
 * پایدار برای این است که سرور از زمان Dispatch عوض شده است و وضعیت تگ
 * Next در حافظه از دست رفته است. این شناسه، Secret نیست و فقط برای
 * مقایسهٔ برابری در دیتابیس به کار می‌رود.
 */
const SERVER_INSTANCE_ID = randomUUID();

interface OutboxEvent {
  id: string;
  publication_id: string;
  event_type: string;
  payload: {
    content_id: string;
    version_id: string;
    previous_version_id: string | null;
    slug: string;
    canonical_path: string;
    version_no: number;
    content_hash: string;
    expected_marker: string;
    previous_unique_text: string | null;
  };
  status: string;
  attempts: number;
  max_attempts: number;
  lease_owner: string | null;
  fencing_token: number | null;
  dispatch_attempts: number | null;
  verification_attempts: number | null;
  redispatch_attempts: number | null;
  dispatch_instance_id: string | null;
  dispatch_done: boolean | null;
}

async function updatePublication(
  cfg: DbCfg,
  id: string,
  fencingToken: number,
  patch: Record<string, unknown>,
): Promise<void> {
  // Fencing در دیتابیس: فقط وقتی fencing_token با Claim جاری بخواند، ردیف
  // به‌روز می‌شود. اگر Runner منسوخ باشد، هیچ ردیفی برنمی‌گردد و نوشتن رد می‌شود.
  const rows = (await postgrestWrite(
    cfg,
    "PATCH",
    `factory_publications?id=eq.${encodeURIComponent(id)}&fencing_token=eq.${fencingToken}`,
    patch,
  )) as unknown[];
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("publication fencing lost during processing");
  }
}

async function insertAudit(
  cfg: DbCfg,
  audit: Record<string, unknown>,
): Promise<void> {
  await postgrestWrite(cfg, "POST", "factory_audit_events", audit);
}

async function updateOutbox(
  cfg: DbCfg,
  id: string,
  runnerId: string,
  fencingToken: number,
  patch: Record<string, unknown>,
): Promise<void> {
  // Fencing در دیتابیس: فقط Runnerی که Lease و fencing_token جاری را دارد
  // می‌تواند رویداد خودش را به‌روز کند. Runner منسوخ با token قدیمی، هیچ
  // ردیفی به‌روز نمی‌کند و نوشتنش رد می‌شود، نه این‌که نتیجهٔ Runner جدید
  // را بازنویسی کند.
  const rows = (await postgrestWrite(
    cfg,
    "PATCH",
    `factory_outbox_events?id=eq.${encodeURIComponent(id)}&lease_owner=eq.${encodeURIComponent(runnerId)}&fencing_token=eq.${fencingToken}`,
    patch,
  )) as unknown[];
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("outbox fencing lost during processing");
  }
}

function nowIso(): string {
  return new Date().toISOString();
}

function backoffIso(attempts: number): string {
  return new Date(Date.now() + backoffSeconds(attempts) * 1000).toISOString();
}

function verificationBackoffIso(verificationAttempts: number): string {
  return new Date(Date.now() + verificationBackoffSeconds(verificationAttempts) * 1000).toISOString();
}

/** خطای تست Crash پس از Dispatch: عمداً هیچ به‌روزرسانی دیگری انجام نمی‌شود تا وضعیت claimed با dispatch_done=true بماند. */
class CrashAfterDispatchError extends Error {}

/**
 * POST /api/internal/process-outbox
 * Runner داخلی؛ در R2 از مسیر Tick صدا زده می‌شود.
 * MVP01-M3.1: Dispatch و Verification جدا هستند.
 * ۱) Dispatch: فقط اگر dispatch_done=false باشد، Revalidation یک‌بار اجرا
 *    می‌شود؛ موفقیت آن، اول Publication را verifying و بعد dispatch_done را
 *    در Outbox ثبت می‌کند، پیش از این‌که Verification شروع شود. شکست
 *    Dispatch، رویداد را retry_scheduled می‌کند و Verification را اصلاً
 *    شروع نمی‌کند.
 * ۲) Verification: صفحهٔ واقعی را با خواندن مجدد کوتاه می‌خواند. اگر
 *    صفحه کهنه بود، Revalidation دوباره اجرا نمی‌شود، dispatch_attempts
 *    زیاد نمی‌شود، Publication در verifying می‌ماند و فقط Verification
 *    بعدی با Backoff زمان‌بندی می‌شود (next_attempt_at و verify_after).
 *    اگر verification_attempts به سقف ۵۰ خواندن رسید، needs_intervention.
 * ۳) Crash پس از Dispatch: Outbox در وضعیت claimed با Lease و
 *    dispatch_done=true می‌ماند؛ Runner بعدی پس از انقضای Lease، همان
 *    رویداد را Claim می‌کند، Revalidation را رد می‌کند و از Verification
 *    ادامه می‌دهد. Pointer دوباره تغییر نمی‌کند، چون Pointer از قبل، در
 *    تراکنش انتشار، عوض شده است.
 * MVP01-M3.2: Revalidation در Dispatch، با پروفایل { expire: 0 } انجام
 *    می‌شود، نه "max". سند Next 16 می‌نویسد با expire: 0، محتوای کهنه
 *    هرگز سرو نمی‌شود و درخواست بعدی، Revalidation مسدودکننده است؛
 *    برای Route Handler داخلی که updateTag در دسترسش نیست، همین قرارداد
 *    توصیه شده است. پس درخواست Verification پس از Dispatch، همان
 *    درخواست مسدودکننده است و نسخهٔ تازه را می‌گیرد. revalidatePath
 *    مرتبط هم حفظ شده است و مسیر عمومی برای Revalidation دلخواه ساخته
 *    نشده است. مسیر content-sync دست نخورده است، چون Dispatch انتشار
 *    نسخه‌دار نیست.
 * MVP01-M3.2: بازیابی پس از Restart. اگر dispatch_done=true بود ولی
 *    dispatch_instance_id ثبت‌شده با شناسهٔ نمونهٔ جاری نخواند، یعنی
 *    سرور از زمان Dispatch عوض شده است و وضعیت تگ در حافظه از دست رفته
 *    است. در این حالت، Runner بدون ویرایش دستی، Revalidation را
 *    به‌صورت کنترل‌شده تکرار می‌کند و آن را با شمارندهٔ مستقل
 *    redispatch_attempts و سقف ۳ ثبت می‌کند. اگر سقف رد شد، رویداد
 *    needs_intervention می‌شود. Redispatch، Pointer را تغییر نمی‌دهد و
 *    Publication یا Outbox تکراری نمی‌سازد.
 * Test Hookها فقط وقتی M2_TEST_HOOKS_ENABLED=true است، آن هم فقط در
 * Staging، عمل می‌کنند: test_fail_revalidation، test_force_stale_page،
 * test_crash_after_dispatch.
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
  let testFailRevalidation = false;
  let testForceStalePage = false;
  let testCrashAfterDispatch = false;
  try {
    const body: unknown = await req.json().catch(() => ({}));
    if (body !== null && typeof body === "object" && !Array.isArray(body)) {
      const hooksEnabled = process.env.M2_TEST_HOOKS_ENABLED === "true";
      testFailRevalidation = (body as Record<string, unknown>).test_fail_revalidation === true && hooksEnabled;
      testForceStalePage = (body as Record<string, unknown>).test_force_stale_page === true && hooksEnabled;
      testCrashAfterDispatch = (body as Record<string, unknown>).test_crash_after_dispatch === true && hooksEnabled;
    }
  } catch {
    testFailRevalidation = false;
    testForceStalePage = false;
    testCrashAfterDispatch = false;
  }
  const runnerId = randomUUID();
  try {
    const claimed = (await postgrestRpc(cfg, "claim_outbox_event", {
      p_runner_id: runnerId,
      p_lease_seconds: OUTBOX_LEASE_SECONDS,
    })) as OutboxEvent | null;
    // PostgREST برای Functionی که null برمی‌گرداند، یک سطر با همهٔ فیلدهای
    // null می‌دهد، نه JSON null. پس فقط truthiness کافی نیست؛ id و
    // publication_id و fencing_token هم باید واقعی باشند، وگرنه Runner با
    // id=null به PATCH می‌رود و 500 می‌دهد.
    if (!claimed || !claimed.id || !claimed.publication_id || claimed.fencing_token === null) {
      return NextResponse.json({ processed: 0 });
    }
    const event = claimed;
    const publicationId = event.publication_id;
    const fencingToken = event.fencing_token as number;
    const payload = event.payload;
    // رویدادهای قدیمی (پیش از 014) مقادیر پیش‌فرض 0/false دارند و دقیقاً
    // همین‌طور تفسیر می‌شوند: Dispatch نشده، پس یک‌بار Dispatch می‌شوند.
    let dispatchAttempts = event.dispatch_attempts ?? 0;
    let verificationAttempts = event.verification_attempts ?? 0;
    const dispatchDone = event.dispatch_done === true;
    let redispatchAttempts = event.redispatch_attempts ?? 0;
    let dispatchInstanceId: string | null = event.dispatch_instance_id ?? null;

    // ── فاز ۱الف: Redispatch پس از Restart (فقط اگر Dispatch شده ولی نمونه عوض شده باشد) ──
    // M3.2: اگر شناسهٔ ثبت‌شده با نمونهٔ جاری نخواند، وضعیت تگ Next در
    // حافظه از دست رفته است. Redispatch، کنترل‌شده و با شمارندهٔ مستقل
    // انجام می‌شود و سقف آن ۳ است. شکست Redispatch، رویداد را در verifying
    // با Backoff نگه می‌دارد و شمارندهٔ Redispatch را زیاد می‌کند، نه
    // dispatch_attempts و نه verification_attempts را.
    // نکتهٔ منطقی: shouldRedispatch در سقف، false می‌دهد، ولی سقف
    // Redispatch باید به needs_intervention برسد، نه این‌که بی‌صدا به
    // Verification برود. پس شرط بیرونی، فقط عدم تطابق نمونه است و سقف،
    // در اولین شاخهٔ داخل، بررسی می‌شود.
    if (dispatchDone && dispatchInstanceId !== SERVER_INSTANCE_ID) {
      if (isRedispatchCapReached(redispatchAttempts)) {
        const message = "redispatch cap reached after server restarts";
        await updateOutbox(cfg, event.id, runnerId, fencingToken, {
          status: "failed",
          lease_owner: null,
          lease_until: null,
          last_error: message,
          dispatch_attempts: dispatchAttempts,
          verification_attempts: verificationAttempts,
          redispatch_attempts: redispatchAttempts,
          dispatch_done: true,
          verify_after: null,
        });
        if (!isValidPublicationTransition("verifying", "needs_intervention")) {
          throw new Error("invalid publication transition to needs_intervention");
        }
        await updatePublication(cfg, publicationId, fencingToken, {
          status: "needs_intervention",
          last_error: message,
          dispatch_attempts: dispatchAttempts,
          verification_attempts: verificationAttempts,
          redispatch_attempts: redispatchAttempts,
        });
        await insertAudit(cfg, {
          publication_id: publicationId,
          outbox_id: event.id,
          kind: "failure",
          status_from: "verifying",
          status_to: "needs_intervention",
          error: message,
          attempts: event.attempts,
          fencing_token: fencingToken,
        });
        return NextResponse.json({
          processed: 1,
          publication_id: publicationId,
          status: "needs_intervention",
          error: message,
          dispatch_attempts: dispatchAttempts,
          verification_attempts: verificationAttempts,
          redispatch_attempts: redispatchAttempts,
        });
      }
      try {
        if (testFailRevalidation) {
          throw new Error("test hook: revalidation failed");
        }
        revalidateTag("guides", { expire: 0 });
        revalidateTag("guide-versions", { expire: 0 });
        revalidatePath(payload.canonical_path);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        redispatchAttempts += 1;
        const nextAttempt = backoffIso(event.attempts);
        await updateOutbox(cfg, event.id, runnerId, fencingToken, {
          status: "pending",
          next_attempt_at: nextAttempt,
          verify_after: nextAttempt,
          lease_owner: null,
          lease_until: null,
          last_error: message,
          dispatch_attempts: dispatchAttempts,
          verification_attempts: verificationAttempts,
          redispatch_attempts: redispatchAttempts,
          dispatch_done: true,
        });
        if (!isValidPublicationTransition("verifying", "verifying")) {
          throw new Error("invalid publication transition to verifying");
        }
        await updatePublication(cfg, publicationId, fencingToken, {
          status: "verifying",
          last_error: message,
          dispatch_attempts: dispatchAttempts,
          verification_attempts: verificationAttempts,
          redispatch_attempts: redispatchAttempts,
        });
        await insertAudit(cfg, {
          publication_id: publicationId,
          outbox_id: event.id,
          kind: "retry",
          status_from: "verifying",
          status_to: "verifying",
          error: message,
          attempts: event.attempts,
          fencing_token: fencingToken,
        });
        return NextResponse.json({
          processed: 1,
          publication_id: publicationId,
          status: "verifying",
          error: message,
          dispatch_attempts: dispatchAttempts,
          verification_attempts: verificationAttempts,
          redispatch_attempts: redispatchAttempts,
          next_attempt_at: nextAttempt,
        });
      }
      redispatchAttempts += 1;
      dispatchInstanceId = SERVER_INSTANCE_ID;
      await updatePublication(cfg, publicationId, fencingToken, {
        status: "verifying",
        dispatch_attempts: dispatchAttempts,
        verification_attempts: verificationAttempts,
        redispatch_attempts: redispatchAttempts,
        dispatch_instance_id: dispatchInstanceId,
      });
      await updateOutbox(cfg, event.id, runnerId, fencingToken, {
        dispatch_done: true,
        dispatch_attempts: dispatchAttempts,
        verification_attempts: verificationAttempts,
        redispatch_attempts: redispatchAttempts,
        dispatch_instance_id: dispatchInstanceId,
        verify_after: nowIso(),
      });
    }

    // ── فاز ۱: Dispatch (فقط اگر قبلاً انجام نشده باشد) ──
    if (!dispatchDone) {
      await updatePublication(cfg, publicationId, fencingToken, { status: "dispatched" });
      try {
        if (testFailRevalidation) {
          throw new Error("test hook: revalidation failed");
        }
        // فقط تگ و مسیر مرتبط با همان محتوا. M3.2: پروفایل { expire: 0 }،
        // نه "max". سند Next 16 می‌نویسد با expire: 0، محتوای کهنه هرگز
        // سرو نمی‌شود و درخواست بعدی، Revalidation مسدودکننده است و برای
        // Route Handler داخلی که updateTag در دسترسش نیست، همین قرارداد
        // توصیه شده است. درخواست Verification پس از Dispatch، همان
        // درخواست مسدودکننده است. revalidatePath مرتبط هم حفظ شده است.
        revalidateTag("guides", { expire: 0 });
        revalidateTag("guide-versions", { expire: 0 });
        revalidatePath(payload.canonical_path);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        dispatchAttempts += 1;
        const attempts = event.attempts;
        const maxAttempts = event.max_attempts || OUTBOX_MAX_ATTEMPTS;
        if (attempts >= maxAttempts) {
          await updateOutbox(cfg, event.id, runnerId, fencingToken, {
            status: "failed",
            lease_owner: null,
            lease_until: null,
            last_error: message,
            dispatch_attempts: dispatchAttempts,
            verification_attempts: verificationAttempts,
            dispatch_done: false,
            verify_after: null,
          });
          if (!isValidPublicationTransition("dispatched", "needs_intervention")) {
            throw new Error("invalid publication transition to needs_intervention");
          }
          await updatePublication(cfg, publicationId, fencingToken, {
            status: "needs_intervention",
            last_error: message,
            dispatch_attempts: dispatchAttempts,
            verification_attempts: verificationAttempts,
          });
          await insertAudit(cfg, {
            publication_id: publicationId,
            outbox_id: event.id,
            kind: "failure",
            status_from: "dispatched",
            status_to: "needs_intervention",
            error: message,
            attempts,
            fencing_token: fencingToken,
          });
          return NextResponse.json({
            processed: 1,
            publication_id: publicationId,
            status: "needs_intervention",
            error: message,
            dispatch_attempts: dispatchAttempts,
            verification_attempts: verificationAttempts,
          });
        }
        await updateOutbox(cfg, event.id, runnerId, fencingToken, {
          status: "pending",
          next_attempt_at: backoffIso(attempts),
          lease_owner: null,
          lease_until: null,
          last_error: message,
          dispatch_attempts: dispatchAttempts,
          verification_attempts: verificationAttempts,
          dispatch_done: false,
          verify_after: null,
        });
        if (!isValidPublicationTransition("dispatched", "retry_scheduled")) {
          throw new Error("invalid publication transition to retry_scheduled");
        }
        await updatePublication(cfg, publicationId, fencingToken, {
          status: "retry_scheduled",
          last_error: message,
          dispatch_attempts: dispatchAttempts,
          verification_attempts: verificationAttempts,
        });
        await insertAudit(cfg, {
          publication_id: publicationId,
          outbox_id: event.id,
          kind: "retry",
          status_from: "dispatched",
          status_to: "retry_scheduled",
          error: message,
          attempts,
          fencing_token: fencingToken,
        });
        return NextResponse.json({
          processed: 1,
          publication_id: publicationId,
          status: "retry_scheduled",
          error: message,
          dispatch_attempts: dispatchAttempts,
          verification_attempts: verificationAttempts,
        });
      }
      // Dispatch موفق: اول Publication به verifying، بعد ثبت dispatch_done
      // در Outbox، پیش از Verification. ترتیب مهم است: اگر بین این دو،
      // Crash رخ بدهد، Runner بعدی Revalidation را دوباره اجرا می‌کند
      // (چون dispatch_done هنوز false است)، ولی Publication یا Outbox
      // تکراری نمی‌سازد و Pointer عوض نمی‌شود، چون Revalidation بی‌اثر
      // تکراری است.
      dispatchAttempts += 1;
      await updatePublication(cfg, publicationId, fencingToken, {
        status: "verifying",
        dispatch_attempts: dispatchAttempts,
        verification_attempts: verificationAttempts,
        redispatch_attempts: redispatchAttempts,
        dispatch_instance_id: SERVER_INSTANCE_ID,
      });
      await updateOutbox(cfg, event.id, runnerId, fencingToken, {
        dispatch_done: true,
        dispatch_attempts: dispatchAttempts,
        verification_attempts: verificationAttempts,
        redispatch_attempts: redispatchAttempts,
        dispatch_instance_id: SERVER_INSTANCE_ID,
        verify_after: nowIso(),
      });
      dispatchInstanceId = SERVER_INSTANCE_ID;
      if (testCrashAfterDispatch) {
        throw new CrashAfterDispatchError("test hook: crash after dispatch");
      }
    }
    // ── فاز ۲: Verification (بدون Revalidation تازه) ──
    const forwardedProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    const host = req.headers.get("host");
    const verificationOrigin = host ? `${forwardedProto ?? "http"}://${host}` : `http://127.0.0.1:${process.env.PORT ?? "3100"}`;
    const verification = await verifyPageWithRetries(
      async () => {
        if (testForceStalePage) {
          // شبیه‌سازی صفحهٔ کهنه در لایهٔ Verification، نه در Next: HTML
          // نشان نسخهٔ جدید را ندارد و متن منحصربه‌فرد نسخهٔ قبلی را دارد.
          const staleHtml = `<link rel="canonical" href="${payload.canonical_path}" />${payload.previous_unique_text ?? ""}`;
          return { httpStatus: 200, html: staleHtml };
        }
        const pageRes = await fetch(`${verificationOrigin}${payload.canonical_path}`, { cache: "no-store" });
        const html = await pageRes.text().catch(() => "");
        return { httpStatus: pageRes.status, html };
      },
      {
        canonicalPath: payload.canonical_path,
        expectedMarker: payload.expected_marker,
        previousUniqueText: payload.previous_unique_text,
      },
    );
    verificationAttempts += verification.attemptsUsed;
    if (verification.result.ok) {
      // موفق: نخست خطای قبلی Publication را برای Audit بخوان، بعد
      // Outbox و Publication را با Fencing به‌روز کن و last_error را روی
      // هر دو پاک کن. خطای قبلی در سطر Audit می‌ماند و از بین نمی‌رود.
      const prevPubs = (await postgrestGet(
        cfg,
        `factory_publications?id=eq.${encodeURIComponent(publicationId)}&select=last_error`,
      )) as Array<{ last_error: string | null }>;
      const previousError = prevPubs.length > 0 ? prevPubs[0].last_error : null;
      await updateOutbox(cfg, event.id, runnerId, fencingToken, {
        status: "succeeded",
        processed_at: nowIso(),
        lease_owner: null,
        lease_until: null,
        last_error: null,
        dispatch_attempts: dispatchAttempts,
        verification_attempts: verificationAttempts,
        redispatch_attempts: redispatchAttempts,
        dispatch_instance_id: dispatchInstanceId,
        dispatch_done: true,
        verify_after: null,
      });
      await updatePublication(cfg, publicationId, fencingToken, {
        status: "verified",
        verified_at: nowIso(),
        last_error: null,
        dispatch_attempts: dispatchAttempts,
        verification_attempts: verificationAttempts,
        redispatch_attempts: redispatchAttempts,
        dispatch_instance_id: dispatchInstanceId,
      });
      await insertAudit(cfg, {
        publication_id: publicationId,
        outbox_id: event.id,
        kind: "verified",
        status_from: "verifying",
        status_to: "verified",
        error: previousError,
        attempts: event.attempts,
        fencing_token: fencingToken,
      });
      return NextResponse.json({
        processed: 1,
        publication_id: publicationId,
        status: "verified",
        dispatch_attempts: dispatchAttempts,
        verification_attempts: verificationAttempts,
        redispatch_attempts: redispatchAttempts,
      });
    }
    // صفحهٔ کهنه: Revalidation دوباره اجرا نمی‌شود و dispatch_attempts
    // زیاد نمی‌شود. فقط Verification بعدی زمان‌بندی می‌شود.
    const message = `verification failed: ${verification.result.reasons.join("; ")}`;
    if (isVerificationCapReached(verificationAttempts)) {
      await updateOutbox(cfg, event.id, runnerId, fencingToken, {
        status: "failed",
        lease_owner: null,
        lease_until: null,
        last_error: message,
        dispatch_attempts: dispatchAttempts,
        verification_attempts: verificationAttempts,
        redispatch_attempts: redispatchAttempts,
        dispatch_instance_id: dispatchInstanceId,
        dispatch_done: true,
        verify_after: null,
      });
      if (!isValidPublicationTransition("verifying", "needs_intervention")) {
        throw new Error("invalid publication transition to needs_intervention");
      }
      await updatePublication(cfg, publicationId, fencingToken, {
        status: "needs_intervention",
        last_error: message,
        dispatch_attempts: dispatchAttempts,
        verification_attempts: verificationAttempts,
        redispatch_attempts: redispatchAttempts,
        dispatch_instance_id: dispatchInstanceId,
      });
      await insertAudit(cfg, {
        publication_id: publicationId,
        outbox_id: event.id,
        kind: "failure",
        status_from: "verifying",
        status_to: "needs_intervention",
        error: message,
        attempts: event.attempts,
        fencing_token: fencingToken,
      });
      return NextResponse.json({
        processed: 1,
        publication_id: publicationId,
        status: "needs_intervention",
        error: message,
        dispatch_attempts: dispatchAttempts,
        verification_attempts: verificationAttempts,
        redispatch_attempts: redispatchAttempts,
      });
    }
    const nextAttempt = verificationBackoffIso(verificationAttempts);
    await updateOutbox(cfg, event.id, runnerId, fencingToken, {
      status: "pending",
      next_attempt_at: nextAttempt,
      verify_after: nextAttempt,
      lease_owner: null,
      lease_until: null,
      last_error: message,
      dispatch_attempts: dispatchAttempts,
      verification_attempts: verificationAttempts,
      redispatch_attempts: redispatchAttempts,
      dispatch_instance_id: dispatchInstanceId,
      dispatch_done: true,
    });
    if (!isValidPublicationTransition("verifying", "verifying")) {
      throw new Error("invalid publication transition to verifying");
    }
    await updatePublication(cfg, publicationId, fencingToken, {
      status: "verifying",
      last_error: message,
      dispatch_attempts: dispatchAttempts,
      verification_attempts: verificationAttempts,
      redispatch_attempts: redispatchAttempts,
      dispatch_instance_id: dispatchInstanceId,
    });
    await insertAudit(cfg, {
      publication_id: publicationId,
      outbox_id: event.id,
      kind: "retry",
      status_from: "verifying",
      status_to: "verifying",
      error: message,
      attempts: event.attempts,
      fencing_token: fencingToken,
    });
    return NextResponse.json({
      processed: 1,
      publication_id: publicationId,
      status: "verifying",
      error: message,
      dispatch_attempts: dispatchAttempts,
      verification_attempts: verificationAttempts,
      redispatch_attempts: redispatchAttempts,
      next_attempt_at: nextAttempt,
    });
  } catch (err) {
    if (err instanceof CrashAfterDispatchError) {
      // Crash شبیه‌سازی‌شده: هیچ به‌روزرسانی دیگری انجام نمی‌شود؛
      // Outbox در وضعیت claimed با Lease و dispatch_done=true می‌ماند
      // تا Runner بعدی پس از انقضای Lease، از Verification ادامه بدهد.
      return NextResponse.json(
        { error: err.message, status: "verifying", dispatch_done: true },
        { status: 500 },
      );
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
