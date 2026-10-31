/**
 * منطق خالص M3 برای Rollback: هیچ دسترسی دیتابیسی و هیچ Secret ندارد و
 * با node:test تست می‌شود. بررسی‌های دیتابیسی در API و در Function
 * publish_content_atomic هم دوباره انجام می‌شوند؛ این‌جا فقط منطق
 * قابل تست بدون دیتابیس است، نه مرجع نهایی مجوز.
 */

import { isValidIdempotencyKey } from "./publish-outbox";

export type PublicationKind = "publish" | "rollback";

export interface RollbackPublicationRow {
  id: string;
  content_id: string;
  version_id: string;
  status: string;
}

export interface RollbackRequestInput {
  target_version_id: string | null;
  rollback_of_publication_id: string | null;
  idempotency_key: unknown;
  reason: unknown;
}

/** Reason برای Rollback باید متن غیرخالی و حداکثر ۵۰۰ کاراکتر باشد. */
export function isValidRollbackReason(reason: unknown): reason is string {
  return typeof reason === "string" && reason.length >= 1 && reason.length <= 500;
}

/** نسخهٔ هدف فقط وقتی قابل Rollback است که قبلاً با وضعیت verified منتشر شده باشد. */
export function isPreviouslyPublished(
  publications: Array<{ version_id: string; status: string }>,
  targetVersionId: string,
): boolean {
  return publications.some((p) => p.version_id === targetVersionId && p.status === "verified");
}

/**
 * rollback_of فقط وقتی معتبر است که همان document باشد، نسخه‌اش همان
 * نسخهٔ فعال فعلی باشد و وضعیتش verified باشد. انتشار مورد نظر هم با
 * همین شرط قبول می‌شود؛ لازم نیست حتماً آخرین انتشار باشد.
 */
export function isRollbackOfValid(
  rollbackOf: RollbackPublicationRow | null,
  contentId: string,
  currentVersionId: string | null,
): boolean {
  if (!rollbackOf) return false;
  return (
    rollbackOf.content_id === contentId &&
    rollbackOf.version_id === currentVersionId &&
    rollbackOf.status === "verified"
  );
}

/** اعتبارسنجی ورودی Rollback، پیش از هر خواندن دیتابیس. پیام خطا یا null. */
export function validateRollbackRequest(input: RollbackRequestInput): string | null {
  if (!input.target_version_id) return "target_version_id is required";
  if (!input.rollback_of_publication_id) return "rollback_of_publication_id is required";
  if (!isValidIdempotencyKey(input.idempotency_key)) return "a valid idempotency_key is required";
  if (!isValidRollbackReason(input.reason)) return "a valid reason is required";
  return null;
}
