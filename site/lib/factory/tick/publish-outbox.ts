/**
 * منطق خالص M2: Backoff، وضعیت‌ها و Verification صفحه.
 * این فایل هیچ دسترسی دیتابیسی و هیچ Secret ندارد و با node:test تست می‌شود.
 * Verification فقط روی HTML واقعی صفحه انجام می‌شود؛ HTTP 200 به‌تنهایی کافی نیست.
 */

export const OUTBOX_MAX_ATTEMPTS = 5;
export const OUTBOX_LEASE_SECONDS = 300;

/**
 * M2.1 Verification با خواندن مجدد کوتاه.
 * انتخاب اعداد از رفتار واقعی Staging در M2 و M2.1 است: پس از Revalidation،
 * خواندن فوری صفحه گاهی کهنه بود و در M2.1، حتی ۵ بار خواندن با فاصلهٔ
 * ۱ ثانیه هم هنوز کهنه بود، ولی پردازش بعدی پس از Backoff که صفحه از قبل
 * تازه شده بود، موفق شد. پس بازهٔ کهنه، بیش از ۵ ثانیه و کمتر از Backoff
 * بعدی است. اعداد نهایی، ۱۰ بار خواندن با فاصلهٔ ۲ ثانیه است؛ زمان کل آن،
 * با احتساب خود خواندن‌ها، حدود ۲۵ ثانیه می‌شود و از Timeout محیط عبور
 * نمی‌کند. اگر پس از ۱۰ بار هنوز کهنه بود، Verification شکست می‌خورد و
 * رویداد به pending با Backoff برمی‌گردد؛ صفحهٔ کهنه هرگز verified نمی‌شود
 * و صف هم تخلیه نمی‌شود.
 */
export const VERIFICATION_MAX_ATTEMPTS = 10;
export const VERIFICATION_RETRY_INTERVAL_MS = 2000;

/**
 * MVP01-M3.1: تفکیک Dispatch از Verification.
 * - dispatch_attempts فقط وقتی زیاد می‌شود که Revalidation واقعاً اجرا شده
 *   باشد (موفق یا ناموفق)؛ صفحهٔ کهنه آن را زیاد نمی‌کند.
 * - verification_attempts، تعداد خواندن‌های صفحه است (هر بچ Verification،
 *   attemptsUsed خودش را اضافه می‌کند)؛ سقف آن ۵۰ خواندن است، یعنی ۵ بچ
 *   ۱۰خواندنی. سقف از رفتار واقعی Staging می‌آید: بچ ۱۰خواندنی حدود
 *   ۲۵ ثانیه طول می‌کشد و صفحه در M2/M2.1/M3 همیشه پس از Backoff بعدی
 *   (۳۰ تا ۶۰ ثانیه) تازه بود؛ ۵ بچ، پنجرهٔ کهنهٔ بسیار بزرگ‌تر از
 *   مشاهده‌شده را هم پوشش می‌دهد، بدون این‌که Revalidation بی‌نهایت شود.
 * - Backoff بین بچ‌های Verification، از همان backoffSeconds استفاده می‌کند،
 *   ولی بر اساس شمارهٔ بچ (نه تعداد خواندن): بچ اول کهنه → ۳۰ ثانیه،
 *   بچ دوم → ۶۰، سوم → ۱۲۰، چهارم → ۲۴۰، بعد سقف ۳۰۰.
 */
export const VERIFICATION_MAX_READS = 50;

/**
 * MVP01-M3.2: بازیابی پس از Restart با Redispatch کنترل‌شده.
 * - هر نمونهٔ سرور، شناسهٔ نمونهٔ خودش را دارد. Dispatch موفق، آن شناسه
 *   را در dispatch_instance_id ثبت می‌کند.
 * - اگر Runner بعدی، dispatch_done=true دید ولی شناسهٔ ثبت‌شده با شناسهٔ
 *   نمونهٔ جاری نخواند (از جمله null برای رویدادهای پیش از M3.2)، یعنی
 *   سرور از زمان Dispatch عوض شده است و وضعیت تگ Next در حافظه از دست
 *   رفته است؛ پس Revalidation باید یک‌بار کنترل‌شده تکرار شود.
 * - Redispatch، شمارندهٔ مستقل خودش را دارد و سقف آن ۳ است. این شمارنده،
 *   نه dispatch_attempts است و نه verification_attempts. اگر سقف رد شد،
 *   رویداد needs_intervention می‌شود تا Revalidation بی‌نهایت نشود.
 */
export const REDISPATCH_MAX_ATTEMPTS = 3;

export function shouldRedispatch(
  dispatchDone: boolean,
  storedInstanceId: string | null,
  currentInstanceId: string,
  redispatchAttempts: number,
): boolean {
  if (!dispatchDone) return false;
  if (storedInstanceId === currentInstanceId) return false;
  if (redispatchAttempts >= REDISPATCH_MAX_ATTEMPTS) return false;
  return true;
}

export function isRedispatchCapReached(redispatchAttempts: number): boolean {
  return redispatchAttempts >= REDISPATCH_MAX_ATTEMPTS;
}

export function verificationBatchNumber(verificationAttempts: number): number {
  if (verificationAttempts <= 0) return 1;
  return Math.ceil(verificationAttempts / VERIFICATION_MAX_ATTEMPTS);
}

export function verificationBackoffSeconds(verificationAttempts: number): number {
  return backoffSeconds(verificationBatchNumber(verificationAttempts));
}

export function isVerificationCapReached(verificationAttempts: number): boolean {
  return verificationAttempts >= VERIFICATION_MAX_READS;
}

/** Fencing: مالکیت فقط وقتی معتبر است که هم lease_owner و هم fencing_token با Claim جاری بخوانند. بررسی در حافظه، جایگزین فیلتر دیتابیس نیست؛ فیلتر دیتابیس در PATCH، مرجع نهایی است. */
export function isFencingMatch(
  current: { lease_owner: string | null; fencing_token: number | null },
  expected: { lease_owner: string; fencing_token: number },
): boolean {
  return current.lease_owner === expected.lease_owner && current.fencing_token === expected.fencing_token;
}

/** Backoff با سقف: 30 ثانیه، 60، 120، 240، بعد سقف 300 ثانیه. */
export function backoffSeconds(attempts: number): number {
  if (attempts <= 0) return 30;
  return Math.min(30 * 2 ** (attempts - 1), 300);
}

export type PublicationStatus =
  | "pending"
  | "dispatched"
  | "verifying"
  | "verified"
  | "retry_scheduled"
  | "needs_intervention";

/**
 * Transitionهای مجاز Publication. هر چیز دیگری، خطای برنامه‌نویسی است.
 * MVP01-M3.1: صفحهٔ کهنه دیگر به retry_scheduled نمی‌رود؛ verifying در
 * خودش می‌ماند (verifying → verifying) تا Verification با Backoff دوباره
 * زمان‌بندی شود، بدون Revalidation تازه. verifying → needs_intervention
 * فقط وقتی است که سقف Verification (۵۰ خواندن) رد شده باشد.
 * dispatched → needs_intervention فقط وقتی است که شکست Dispatch، سقف
 * تلاش کلی Outbox را رد کرده باشد.
 */
export function isValidPublicationTransition(from: PublicationStatus, to: PublicationStatus): boolean {
  const allowed: Record<PublicationStatus, PublicationStatus[]> = {
    pending: ["dispatched"],
    dispatched: ["verifying", "retry_scheduled", "needs_intervention"],
    verifying: ["verified", "verifying", "needs_intervention"],
    retry_scheduled: ["dispatched", "needs_intervention"],
    verified: [],
    needs_intervention: [],
  };
  return allowed[from].includes(to);
}

export interface VerificationInput {
  httpStatus: number;
  html: string;
  canonicalPath: string;
  expectedMarker: string;
  previousUniqueText: string | null;
}

export interface VerificationResult {
  ok: boolean;
  reasons: string[];
}

/**
 * Verification واقعی صفحه:
 * - HTTP باید 200 باشد؛
 * - Canonical باید همان مسیر محتوا باشد؛
 * - نشان مورد انتظار نسخهٔ جدید باید در HTML باشد؛
 * - متن منحصربه‌فرد نسخهٔ قبلی نباید در HTML باشد (اگر نسخهٔ قبلی داشت)؛
 * چون نشان v1 در excerpt و FAQ نسخهٔ v2 هم هست، حضور نشان v1 به‌تنهایی
 * اثبات نسخهٔ فعلی نیست و معیار نیست.
 */
export function verifyPublishedPage(input: VerificationInput): VerificationResult {
  const reasons: string[] = [];
  if (input.httpStatus !== 200) reasons.push(`http status is ${input.httpStatus}, expected 200`);
  if (!input.html.includes(`href="${input.canonicalPath}"`) && !input.html.includes(input.canonicalPath)) {
    reasons.push(`canonical path ${input.canonicalPath} not found in html`);
  }
  if (!input.html.includes(input.expectedMarker)) {
    reasons.push("expected marker of the new version not found in html");
  }
  if (input.previousUniqueText && input.html.includes(input.previousUniqueText)) {
    reasons.push("previous version unique text still present in html");
  }
  return { ok: reasons.length === 0, reasons };
}

export function isValidIdempotencyKey(key: unknown): key is string {
  return typeof key === "string" && key.length >= 8 && key.length <= 128;
}

export interface VerificationPageFetch {
  httpStatus: number;
  html: string;
}

export interface VerificationRetryResult {
  result: VerificationResult;
  attemptsUsed: number;
}

/**
 * Verification با خواندن مجدد: صفحه را تا سقف مشخص می‌خواند و در اولین
 * خواندن موفق، همان‌جا متوقف می‌شود. اگر همهٔ خواندن‌ها کهنه بودند، آخرین
 * نتیجهٔ شکست برگردانده می‌شود تا Runner آن را Retry کند، نه verified.
 */
export async function verifyPageWithRetries(
  fetchPage: () => Promise<VerificationPageFetch>,
  input: Omit<VerificationInput, "httpStatus" | "html">,
  maxAttempts: number = VERIFICATION_MAX_ATTEMPTS,
  intervalMs: number = VERIFICATION_RETRY_INTERVAL_MS,
  sleep: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
): Promise<VerificationRetryResult> {
  let lastResult: VerificationResult = { ok: false, reasons: ["no verification attempt was made"] };
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const page = await fetchPage();
    lastResult = verifyPublishedPage({ ...input, httpStatus: page.httpStatus, html: page.html });
    if (lastResult.ok) return { result: lastResult, attemptsUsed: attempt };
    if (attempt < maxAttempts) await sleep(intervalMs);
  }
  return { result: lastResult, attemptsUsed: maxAttempts };
}
