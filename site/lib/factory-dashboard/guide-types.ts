/**
 * شکل داده‌های API بخش مدیریت راهنمای داشبورد.
 *
 * فقط نوع است؛ هیچ کدی، هیچ کلیدی و هیچ فراخوانی در این فایل نیست،
 * پس هم سمت سرور و هم سمت مرورگر قابل ایمپورت است. متن آزاد خطا
 * (last_error) هرگز در این شکل‌ها نمی‌آید؛ فقط وضعیت و دلیل نمایشی
 * که از منطق خالص guide-status ساخته شده است.
 */

import type { PublishPayload } from "@/lib/content-versioning";
import type { GuideStatus } from "./guide-status";

export interface GuideListWorkItem {
  id: string;
  workKey: string;
  title: string;
  status: string;
  resultArtifactId: string | null;
  artifactHash: string | null;
  publicationId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GuideListPublication {
  id: string;
  status: string;
  versionId: string;
  kind: string;
  createdAt: string;
}

export interface GuideListItem {
  documentId: string;
  slug: string;
  canonicalPath: string;
  documentStatus: string;
  publishedVersionId: string | null;
  workItem: GuideListWorkItem | null;
  publication: GuideListPublication | null;
  status: GuideStatus;
  statusLabel: string;
  statusDetail: string;
  canApprove: boolean;
  canPublish: boolean;
  canComplete: boolean;
  approveDisabledReason: string | null;
  publishDisabledReason: string | null;
  completeDisabledReason: string | null;
}

export interface GuideVersionItem {
  id: string;
  versionNo: number;
  contentHash: string;
  createdAt: string;
  isPublishedPointer: boolean;
  hasVerifiedPublication: boolean;
}

export interface GuidePublicationItem {
  id: string;
  versionId: string;
  previousVersionId: string | null;
  kind: string;
  status: string;
  workItemId: string | null;
  createdAt: string;
  /** وضعیت آخرین رویداد Outbox؛ فقط وضعیت، بدون Lease و Fencing. */
  outboxStatus: string | null;
  canRollback: boolean;
  rollbackDisabledReason: string | null;
}

export interface GuideApprovalItem {
  id: string;
  decision: string;
  reviewerId: string;
  reason: string | null;
  artifactHash: string;
  createdAt: string;
}

export interface GuideDetail {
  documentId: string;
  slug: string;
  canonicalPath: string;
  documentStatus: string;
  publishedVersionId: string | null;
  workItem: GuideListWorkItem | null;
  publication: GuideListPublication | null;
  status: GuideStatus;
  statusLabel: string;
  statusDetail: string;
  canApprove: boolean;
  canPublish: boolean;
  canComplete: boolean;
  approveDisabledReason: string | null;
  publishDisabledReason: string | null;
  completeDisabledReason: string | null;
  /** بار پیش‌نویس از Artifact؛ null یعنی بار قابل خواندن نیست. */
  draftPayload: PublishPayload | null;
  /** بار نسخهٔ منتشرشده؛ null یعنی انتشار اول است. */
  publishedPayload: PublishPayload | null;
  versions: GuideVersionItem[];
  publications: GuidePublicationItem[];
  approvals: GuideApprovalItem[];
}

export interface GuideActionError {
  error: string;
  /** کدام قدم داخلی ناموفق بود؛ برای پیام صادقانه به مدیر. */
  step?: string;
}

export interface GuideCreateResult {
  document: { id: string; slug: string; canonicalPath: string };
  workItem: { id: string; workKey: string; status: string };
  artifact: { id: string; artifactHash: string };
}

export interface GuidePublishResult {
  publicationId: string;
  outboxId: string | null;
  workItemStatus: string | null;
}

export interface GuideCompleteResult {
  workItemStatus: string;
  publicationStatus: string | null;
  replayed: boolean;
}

export interface GuideRollbackResult {
  publicationId: string;
  outboxId: string | null;
  previousVersionId: string;
  versionId: string;
  replayed: boolean;
}
