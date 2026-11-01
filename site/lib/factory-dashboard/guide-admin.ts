/**
 * لایهٔ سروری متمرکز بخش مدیریت راهنمای داشبورد.
 *
 * این فایل فقط سمت سرور است و فقط مسیرهای API داشبورد آن را ایمپورت
 * می‌کنند؛ هیچ کامپوننت مرورگری آن را ایمپورت نمی‌کند (تست نشت توکن
 * در guide-status.test.ts همین را بررسی می‌کند). توکن
 * INTERNAL_PUBLISH_TOKEN و کلید service_role فقط در همین فایل و در
 * env سروری خوانده می‌شوند و هرگز در پاسخ API، لاگ یا بدنهٔ مرورگر
 * نمی‌آیند.
 *
 * خواندن‌ها مستقیم با PostgREST و کلید service_role انجام می‌شوند
 * (همان الگوی data.ts)؛ نوشتن‌ها فقط از مسیرهای داخلی انجام می‌شوند
 * و هرگز SQL آزاد از مرورگر نمی‌آید:
 *
 * قراردادهای مسیرهای داخلی (خوانده‌شده از کد همان مسیرها در همین شاخه؛
 * اگر مسیر دقیق فرق کرد، فقط همین فایل عوض می‌شود):
 * - POST /api/internal/content-documents با { slug } و پاسخ
 *   { document: { id, slug, canonical_path, status } }؛ slug تکراری ۴۰۹ است.
 * - POST /api/internal/work-items با { work_key, work_type: "update_content", title,
 *   description, slug, execution_mode: "manual" } و پاسخ { work_item: {...} }.
 *   نوع update_content عمدی است تا مسیر انتشار، شاخهٔ نسخهٔ دوم (publish-v2)
 *   را برود، همان شاخه‌ای که قدم publish_version در Tick برای همین نوع می‌رود.
 * - POST /api/internal/work-items/[id]/first-artifact با { payload } و پاسخ
 *   { artifact_id, artifact_hash, existing }؛ سند منتشرشده ۴۰۹ می‌گیرد.
 * - POST /api/internal/work-items/[id]/publish با بدنهٔ خالی و پاسخ
 *   { version_id, publication_id, status: "publishing" }.
 *
 * مسیرهای approvals و complete و rollback از پیش در همین مخزن هستند و
 * قراردادشان از کد همان مسیرها خوانده شده است، نه حدس زده شده.
 *
 * ساخت پیش‌نویس، سه فراخوان پی‌درپی است و اتمیک نیست؛ اگر قدم دوم یا
 * سوم ناموفق شد، سطرهای قدم‌های پیشین می‌مانند و خطا دقیقاً همان قدم
 * را می‌گوید تا مدیر، وضعیت ناتمام را در فهرست ببیند و دوباره تلاش
 * کند. تلاش دوبارهٔ ساخت با همان slug، سند موجود را بازاستفاده می‌کند؛
 * اگر کاری بدون Artifact مانده باشد، همان کار ادامه پیدا می‌کند (هم در
 * انتشار اول و هم در به‌روزرسانی)؛ وگرنه (مثلاً پس از رد پیش‌نویس پیشین)
 * کار تازه با کلید یکتای پسونددار ساخته می‌شود. اگر ساخت کار با ۴۰۹
 * کلید تکراری رد شد (مسابقهٔ دو ساخت هم‌زمان)، کارها دوباره خوانده
 * می‌شوند و کار ناتمام برنده بازاستفاده می‌شود. کاری که در جریان است
 * (منتظر تأیید، تأییدشده یا در حال انتشار)، ساخت پیش‌نویس تازه را رد
 * می‌کند تا دو پیش‌نویس زنده برای یک سند ساخته نشود.
 */

import { dbConfig, postgrestGet, type DbCfg } from "@/lib/factory/tick/internal-api";
import { validatePublishPayload, type PublishPayload } from "@/lib/content-versioning";
import { getAdminUsername } from "@/lib/dashboard/admin-auth";
import { SESSION_COOKIE } from "@/lib/dashboard/auth";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getDashboardGate } from "./gate";
import {
  deriveGuideStatus,
  isValidGuideSlug,
  rollbackAvailability,
} from "./guide-status";
import type {
  GuideApprovalItem,
  GuideCompleteResult,
  GuideCreateResult,
  GuideDetail,
  GuideListItem,
  GuideListPublication,
  GuideListWorkItem,
  GuidePublicationItem,
  GuidePublishResult,
  GuideRollbackResult,
  GuideVersionItem,
} from "./guide-types";

/** خطای لایهٔ سروری با وضعیت HTTP و قدم ناموفق، برای پیام صادقانه. */
export class GuideAdminError extends Error {
  status: number;
  step?: string;
  constructor(status: number, message: string, step?: string) {
    super(message);
    this.status = status;
    this.step = step;
  }
}

/**
 * گیت مشترک مسیرهای داشبورد راهنما: نشست ادمین معتبر، وگرنه null.
 * مبدا فراخوان داخلی هم از همان درخواست گرفته می‌شود تا فراخوان
 * داخلی، به همان Deployment برگردد.
 */
export async function guideAdminOrigin(req: NextRequest): Promise<string | null> {
  const cookie = req.cookies.get(SESSION_COOKIE)?.value;
  const gate = await getDashboardGate(cookie);
  if (gate !== "allow") return null;
  return internalOrigin(req.headers.get("host"), req.headers.get("x-forwarded-proto"));
}

/** تبدیل خطای لایهٔ سروری به پاسخ JSON؛ متن خام دیتابیس هرگز نمی‌آید. */
export function guideAdminErrorResponse(err: unknown): NextResponse {
  if (err instanceof GuideAdminError) {
    return NextResponse.json(
      { error: err.message, step: err.step ?? null },
      { status: err.status },
    );
  }
  return NextResponse.json(
    { error: "خطای سروری در بخش مدیریت راهنما." },
    { status: 500 },
  );
}

/** مبدا فراخوان داخلی؛ همان الگوی مسیر Tick: host و x-forwarded-proto. */
export function internalOrigin(host: string | null, forwardedProto: string | null): string {
  if (!host) return "http://127.0.0.1:3100";
  const proto = forwardedProto?.split(",")[0]?.trim() || "http";
  return `${proto}://${host}`;
}

interface InternalCallResult {
  status: number;
  json: unknown;
}

/**
 * فراخوان مسیر داخلی با توکن سروری. توکن فقط در هدر می‌رود و هرگز
 * در بدنه یا پاسخ برنمی‌گردد. خطای مسیر داخلی، فقط فیلد error آن
 * (بریده‌شده) به مدیر نشان داده می‌شود، نه متن خام دیتابیس.
 */
export async function callInternal(
  origin: string,
  path: string,
  body: unknown,
): Promise<InternalCallResult> {
  const token = process.env.INTERNAL_PUBLISH_TOKEN;
  if (!token) {
    throw new GuideAdminError(503, "توکن انتشار داخلی پیکربندی نشده است.", "internal");
  }
  let res: Response;
  try {
    res = await fetch(`${origin}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-publish-token": token,
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new GuideAdminError(502, "فراخوان مسیر داخلی به نتیجه نرسید.", "internal");
  }
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  if (!res.ok) {
    const message =
      json !== null && typeof json === "object" && !Array.isArray(json)
        ? String((json as Record<string, unknown>).error ?? "")
        : "";
    throw new GuideAdminError(
      res.status,
      message ? message.slice(0, 300) : `مسیر داخلی با وضعیت ${res.status} رد شد.`,
      "internal",
    );
  }
  return { status: res.status, json };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function requireDb(): DbCfg {
  const cfg = dbConfig();
  if (!cfg) {
    throw new GuideAdminError(503, "پیکربندی دیتابیس کارخانه کامل نیست.", "database");
  }
  return cfg;
}

/* ------------------------------------------------------------------ */
/* خواندن‌ها                                                           */
/* ------------------------------------------------------------------ */

interface DocRow {
  id: string;
  slug: string;
  canonical_path: string;
  status: string;
  published_version_id: string | null;
  is_test_fixture?: boolean;
  created_at: string;
}

interface WiRow {
  id: string;
  work_key: string;
  title: string;
  status: string;
  result_artifact_id: string | null;
  result_version_id?: string | null;
  publication_id: string | null;
  created_at: string;
  updated_at: string;
}

interface ArtifactRow {
  id: string;
  artifact_hash: string;
  payload?: unknown;
}

interface PublicationRow {
  id: string;
  status: string;
  version_id: string;
  publication_kind: string;
  previous_version_id: string | null;
  work_item_id: string | null;
  content_id?: string;
  created_at: string;
}

interface VersionRow {
  id: string;
  version_no: number;
  content_hash: string;
  created_at: string;
  payload?: unknown;
}

interface OutboxRow {
  status: string;
}

interface ApprovalRow {
  id: string;
  decision: string;
  reviewer_id: string;
  decision_reason: string | null;
  artifact_hash: string;
  created_at: string;
}

function toListWorkItem(wi: WiRow, artifactHash: string | null): GuideListWorkItem {
  return {
    id: wi.id,
    workKey: wi.work_key,
    title: wi.title,
    status: wi.status,
    resultArtifactId: wi.result_artifact_id,
    artifactHash,
    publicationId: wi.publication_id,
    createdAt: wi.created_at,
    updatedAt: wi.updated_at,
  };
}

function toListPublication(pub: PublicationRow): GuideListPublication {
  return {
    id: pub.id,
    status: pub.status,
    versionId: pub.version_id,
    kind: pub.publication_kind,
    createdAt: pub.created_at,
  };
}

async function readLatestWorkItem(cfg: DbCfg, docId: string): Promise<WiRow | null> {
  const rows = (await postgrestGet(
    cfg,
    `factory_work_items?content_id=eq.${encodeURIComponent(docId)}&select=id,work_key,title,status,result_artifact_id,result_version_id,publication_id,created_at,updated_at&order=created_at.desc&limit=1`,
  )) as WiRow[];
  return rows[0] ?? null;
}

async function readArtifactHash(cfg: DbCfg, artifactId: string): Promise<string | null> {
  const rows = (await postgrestGet(
    cfg,
    `factory_artifacts?id=eq.${encodeURIComponent(artifactId)}&select=id,artifact_hash`,
  )) as ArtifactRow[];
  return rows[0]?.artifact_hash ?? null;
}

async function readPublicationById(cfg: DbCfg, id: string): Promise<PublicationRow | null> {
  const rows = (await postgrestGet(
    cfg,
    `factory_publications?id=eq.${encodeURIComponent(id)}&select=id,status,version_id,publication_kind,previous_version_id,work_item_id,content_id,created_at`,
  )) as PublicationRow[];
  return rows[0] ?? null;
}

async function readLatestPublicationForWorkItem(
  cfg: DbCfg,
  workItemId: string,
): Promise<PublicationRow | null> {
  const rows = (await postgrestGet(
    cfg,
    `factory_publications?work_item_id=eq.${encodeURIComponent(workItemId)}&select=id,status,version_id,publication_kind,previous_version_id,work_item_id,created_at&order=created_at.desc&limit=1`,
  )) as PublicationRow[];
  return rows[0] ?? null;
}

async function buildListItem(cfg: DbCfg, doc: DocRow): Promise<GuideListItem> {
  const wi = await readLatestWorkItem(cfg, doc.id);
  let listWi: GuideListWorkItem | null = null;
  let listPub: GuideListPublication | null = null;
  if (wi) {
    const artifactHash = wi.result_artifact_id
      ? await readArtifactHash(cfg, wi.result_artifact_id)
      : null;
    listWi = toListWorkItem(wi, artifactHash);
    const pub = wi.publication_id
      ? await readPublicationById(cfg, wi.publication_id)
      : await readLatestPublicationForWorkItem(cfg, wi.id);
    if (pub) listPub = toListPublication(pub);
  }
  const derived = deriveGuideStatus({
    documentStatus: doc.status,
    publishedVersionId: doc.published_version_id,
    workItemStatus: wi?.status ?? null,
    publicationStatus: listPub?.status ?? null,
    hasResultVersion: wi?.result_version_id != null,
  });
  return {
    documentId: doc.id,
    slug: doc.slug,
    canonicalPath: doc.canonical_path,
    documentStatus: doc.status,
    publishedVersionId: doc.published_version_id,
    workItem: listWi,
    publication: listPub,
    status: derived.status,
    statusLabel: derived.label,
    statusDetail: derived.detail,
    canApprove: derived.canApprove,
    canPublish: derived.canPublish,
    canComplete: derived.canComplete,
    approveDisabledReason: derived.approveDisabledReason,
    publishDisabledReason: derived.publishDisabledReason,
    completeDisabledReason: derived.completeDisabledReason,
  };
}

/** فهرست راهنماهای واقعی؛ سندهای آزمایشی (is_test_fixture) نمی‌آیند. */
export async function getGuidesList(): Promise<GuideListItem[]> {
  const cfg = requireDb();
  const docs = (await postgrestGet(
    cfg,
    "content_documents?content_type=eq.guide&select=id,slug,canonical_path,status,published_version_id,is_test_fixture,created_at&order=created_at.desc",
  )) as DocRow[];
  const realDocs = docs.filter((doc) => doc.is_test_fixture !== true);
  const items: GuideListItem[] = [];
  for (const doc of realDocs) {
    items.push(await buildListItem(cfg, doc));
  }
  return items;
}

function isPublishPayloadLike(value: unknown): value is PublishPayload {
  try {
    validatePublishPayload(value);
    return true;
  } catch {
    return false;
  }
}

/** جزئیات یک سند: بار پیش‌نویس، بار منتشرشده، نسخه‌ها، انتشارها، تأییدها. */
export async function getGuideDetail(documentId: string): Promise<GuideDetail> {
  const cfg = requireDb();
  const docs = (await postgrestGet(
    cfg,
    `content_documents?id=eq.${encodeURIComponent(documentId)}&select=id,slug,canonical_path,status,published_version_id,is_test_fixture,created_at`,
  )) as DocRow[];
  const doc = docs[0];
  if (!doc) {
    throw new GuideAdminError(404, "سندی با این شناسه نیست.", "database");
  }
  const listItem = await buildListItem(cfg, doc);

  const wis = (await postgrestGet(
    cfg,
    `factory_work_items?content_id=eq.${encodeURIComponent(doc.id)}&select=id,work_key,title,status,result_artifact_id,publication_id,created_at,updated_at&order=created_at.desc&limit=20`,
  )) as WiRow[];
  const latestWi = wis[0] ?? null;

  let draftPayload: PublishPayload | null = null;
  let approvals: GuideApprovalItem[] = [];
  if (latestWi?.result_artifact_id) {
    const artifacts = (await postgrestGet(
      cfg,
      `factory_artifacts?id=eq.${encodeURIComponent(latestWi.result_artifact_id)}&select=id,artifact_hash,payload`,
    )) as ArtifactRow[];
    const artifact = artifacts[0];
    if (artifact && isPublishPayloadLike(artifact.payload)) {
      draftPayload = artifact.payload;
    }
    const approvalRows = (await postgrestGet(
      cfg,
      `factory_approvals?work_item_id=eq.${encodeURIComponent(latestWi.id)}&select=id,decision,reviewer_id,decision_reason,artifact_hash,created_at&order=created_at.desc`,
    )) as ApprovalRow[];
    approvals = approvalRows.map((row) => ({
      id: row.id,
      decision: row.decision,
      reviewerId: row.reviewer_id,
      reason: row.decision_reason,
      artifactHash: row.artifact_hash,
      createdAt: row.created_at,
    }));
  }

  let publishedPayload: PublishPayload | null = null;
  if (doc.published_version_id) {
    const versions = (await postgrestGet(
      cfg,
      `content_versions?id=eq.${encodeURIComponent(doc.published_version_id)}&select=id,payload`,
    )) as VersionRow[];
    const version = versions[0];
    if (version && isPublishPayloadLike(version.payload)) {
      publishedPayload = version.payload;
    }
  }

  const versionRows = (await postgrestGet(
    cfg,
    `content_versions?content_id=eq.${encodeURIComponent(doc.id)}&select=id,version_no,content_hash,created_at&order=version_no.desc`,
  )) as VersionRow[];
  const publicationRows = (await postgrestGet(
    cfg,
    `factory_publications?content_id=eq.${encodeURIComponent(doc.id)}&select=id,status,version_id,publication_kind,previous_version_id,work_item_id,created_at&order=created_at.desc&limit=20`,
  )) as PublicationRow[];
  const verifiedVersionIds = new Set(
    publicationRows.filter((p) => p.status === "verified").map((p) => p.version_id),
  );
  const versions: GuideVersionItem[] = versionRows.map((row) => ({
    id: row.id,
    versionNo: row.version_no,
    contentHash: row.content_hash,
    createdAt: row.created_at,
    isPublishedPointer: row.id === doc.published_version_id,
    hasVerifiedPublication: verifiedVersionIds.has(row.id),
  }));

  const publications: GuidePublicationItem[] = [];
  for (const pub of publicationRows) {
    const outboxRows = (await postgrestGet(
      cfg,
      `factory_outbox_events?publication_id=eq.${encodeURIComponent(pub.id)}&select=status&order=created_at.desc&limit=1`,
    )) as OutboxRow[];
    const availability = rollbackAvailability({
      publicationStatus: pub.status,
      publicationKind: pub.publication_kind,
      previousVersionId: pub.previous_version_id,
      targetHasVerifiedPublication:
        pub.previous_version_id !== null && verifiedVersionIds.has(pub.previous_version_id),
    });
    publications.push({
      id: pub.id,
      versionId: pub.version_id,
      previousVersionId: pub.previous_version_id,
      kind: pub.publication_kind,
      status: pub.status,
      workItemId: pub.work_item_id,
      createdAt: pub.created_at,
      outboxStatus: outboxRows[0]?.status ?? null,
      canRollback: availability.canRollback,
      rollbackDisabledReason: availability.reason,
    });
  }

  return {
    ...listItem,
    draftPayload,
    publishedPayload,
    versions,
    publications,
    approvals,
  };
}

/* ------------------------------------------------------------------ */
/* نوشتن‌ها: فقط از مسیرهای داخلی                                      */
/* ------------------------------------------------------------------ */

/** هویت بازبین: یوزرنیم ادمین از env سروری، نه از ورودی مرورگر. */
export function reviewerIdentity(): string {
  return getAdminUsername() ?? "admin";
}

async function readDocBySlug(cfg: DbCfg, slug: string): Promise<DocRow | null> {
  const rows = (await postgrestGet(
    cfg,
    `content_documents?slug=eq.${encodeURIComponent(slug)}&content_type=eq.guide&select=id,slug,canonical_path,status,published_version_id,is_test_fixture,created_at`,
  )) as DocRow[];
  return rows[0] ?? null;
}

async function readDocById(cfg: DbCfg, documentId: string): Promise<DocRow | null> {
  const rows = (await postgrestGet(
    cfg,
    `content_documents?id=eq.${encodeURIComponent(documentId)}&content_type=eq.guide&select=id,slug,canonical_path,status,published_version_id,is_test_fixture,created_at`,
  )) as DocRow[];
  return rows[0] ?? null;
}

async function readWorkItemsForDoc(cfg: DbCfg, docId: string): Promise<WiRow[]> {
  return (await postgrestGet(
    cfg,
    `factory_work_items?content_id=eq.${encodeURIComponent(docId)}&select=id,work_key,title,status,result_artifact_id,publication_id,created_at,updated_at&order=created_at.desc`,
  )) as WiRow[];
}

/** کاری در جریان: منتظر تأیید، تأییدشده یا در حال انتشار. */
function findActiveWorkItem(wis: WiRow[]): WiRow | undefined {
  return wis.find(
    (wi) =>
      wi.status === "awaiting_approval" ||
      wi.status === "approved" ||
      wi.status === "publishing",
  );
}

/** کار ناتمام: هنوز Artifact ندارد، پس قدم Artifact آن مانده است. */
function findPendingWorkItem(wis: WiRow[]): WiRow | undefined {
  return wis.find((wi) => wi.result_artifact_id === null);
}

/**
 * ساخت کار با کلید یکتای پسونددار. اگر مسیر داخلی، کلید را تکراری
 * برگرداند (مسابقهٔ دو ساخت هم‌زمان با همان کلید پایه)، کارها دوباره
 * خوانده می‌شوند و کار ناتمام برنده بازاستفاده می‌شود، نه این‌که
 * خطای تکراری به مدیر برگردد و کار تازهٔ دیگری ساخته شود. اگر برنده
 * تا آن لحظه Artifact گرفته و در جریان باشد، همان ردِ «کار در جریان»
 * برمی‌گردد؛ وگرنه خطای اصلی بالا می‌آید.
 */
async function createWorkItemWithPendingReuse(
  origin: string,
  cfg: DbCfg,
  docId: string,
  baseKey: string,
  takenKeys: Set<string>,
  title: string,
  description: string,
  slug: string,
): Promise<{ id: string; workKey: string }> {
  let workKey = baseKey;
  let attempt = 2;
  while (takenKeys.has(workKey) && attempt <= 100) {
    workKey = `${baseKey}-${attempt}`;
    attempt += 1;
  }
  if (takenKeys.has(workKey)) {
    throw new GuideAdminError(
      409,
      "برای این سند، کارهای بسیاری ساخته شده است؛ کلید کار تازه پیدا نشد.",
      "work-items",
    );
  }
  try {
    const created = await callInternal(origin, "/api/internal/work-items", {
      work_key: workKey,
      work_type: "update_content",
      title,
      description,
      slug,
      execution_mode: "manual",
    });
    const record = asRecord(created.json);
    const rawWi = record ? (record.work_item ?? null) : null;
    const wiRecord = asRecord(rawWi);
    const wiId = wiRecord ? asString(wiRecord.id) : null;
    if (!wiId) {
      throw new GuideAdminError(502, "مسیر ساخت کار، شناسهٔ کار را برنگرداند.", "work-items");
    }
    return { id: wiId, workKey };
  } catch (err) {
    if (!(err instanceof GuideAdminError) || err.status !== 409) {
      throw err;
    }
    const refreshed = await readWorkItemsForDoc(cfg, docId);
    const pending = findPendingWorkItem(refreshed);
    if (pending) {
      return { id: pending.id, workKey: pending.work_key };
    }
    if (findActiveWorkItem(refreshed)) {
      throw new GuideAdminError(
        409,
        "برای این سند، کاری در جریان است؛ نخست آن را به پایان برسانید.",
        "work-items",
      );
    }
    throw err;
  }
}

/**
 * ساخت پیش‌نویس تازه: سند، بعد کار، بعد Artifact اول. اگر سند از پیش
 * باشد، بازاستفاده می‌شود؛ اگر کاری بدون Artifact مانده باشد، همان
 * کار ادامه پیدا می‌کند. سند منتشرشده، از این مسیر پیش‌نویس تازه
 * نمی‌گیرد (به‌روزرسانی، مسیر جداگانه می‌خواهد).
 */
export async function createGuideDraft(
  origin: string,
  input: { slug: string; payload: unknown },
): Promise<GuideCreateResult> {
  if (!isValidGuideSlug(input.slug)) {
    throw new GuideAdminError(400, "slug معتبر نیست؛ فقط حروف کوچک لاتین، عدد و خط تیرهٔ میانی.", "validation");
  }
  let payload: PublishPayload;
  try {
    validatePublishPayload(input.payload);
    payload = input.payload as PublishPayload;
  } catch (err) {
    throw new GuideAdminError(
      400,
      `بار پیش‌نویس معتبر نیست: ${err instanceof Error ? err.message : "خطای اعتبارسنجی"}`,
      "validation",
    );
  }
  if (payload.slug !== input.slug) {
    throw new GuideAdminError(400, "slug بار باید با slug فرم یکی باشد.", "validation");
  }
  const cfg = requireDb();
  const canonicalPath = `/guide/${input.slug}`;

  let doc: DocRow | null = null;
  try {
    const created = await callInternal(origin, "/api/internal/content-documents", {
      slug: input.slug,
    });
    const record = asRecord(created.json);
    const rawDoc = record ? (record.document ?? record.content_document ?? null) : null;
    const docRecord = asRecord(rawDoc);
    const docId = docRecord ? asString(docRecord.id) : null;
    if (!docId) {
      throw new GuideAdminError(502, "مسیر ساخت سند، شناسهٔ سند را برنگرداند.", "content-documents");
    }
    doc = {
      id: docId,
      slug: input.slug,
      canonical_path: canonicalPath,
      status: "draft",
      published_version_id: null,
      created_at: new Date().toISOString(),
    };
  } catch (err) {
    if (err instanceof GuideAdminError && err.status === 409) {
      doc = await readDocBySlug(cfg, input.slug);
      if (!doc) {
        throw new GuideAdminError(502, "سند تکراری گزارش شد ولی خواندن آن ممکن نشد.", "content-documents");
      }
    } else {
      throw err;
    }
  }

  if (doc.published_version_id) {
    throw new GuideAdminError(
      409,
      "این سند قبلاً منتشر شده است؛ پیش‌نویس به‌روزرسانی آن از این فرم ساخته نمی‌شود.",
      "content-documents",
    );
  }

  const existingWis = await readWorkItemsForDoc(cfg, doc.id);
  let workItemId: string | null = null;
  let workKey: string | null = null;
  const activeWi = findActiveWorkItem(existingWis);
  if (activeWi) {
    throw new GuideAdminError(
      409,
      "برای این سند، کاری در جریان است؛ نخست آن را به پایان برسانید.",
      "work-items",
    );
  }
  const pendingWi = findPendingWorkItem(existingWis);
  if (pendingWi) {
    workItemId = pendingWi.id;
    workKey = pendingWi.work_key;
  }

  if (!workItemId) {
    const takenKeys = new Set(existingWis.map((wi) => wi.work_key));
    const createdWi = await createWorkItemWithPendingReuse(
      origin,
      cfg,
      doc.id,
      `guide-first-${input.slug}`,
      takenKeys,
      payload.title,
      `پیش‌نویس راهنما از داشبورد: ${input.slug}`,
      input.slug,
    );
    workItemId = createdWi.id;
    workKey = createdWi.workKey;
  }

  const artifactCall = await callInternal(
    origin,
    `/api/internal/work-items/${encodeURIComponent(workItemId)}/first-artifact`,
    { payload },
  );
  const artifactRecord = asRecord(artifactCall.json);
  const rawArtifact = artifactRecord
    ? (artifactRecord.artifact ?? artifactRecord)
    : null;
  const artifact = asRecord(rawArtifact);
  const artifactId = artifact ? asString(artifact.artifact_id ?? artifact.id) : null;
  const artifactHash = artifact
    ? asString(artifact.artifact_hash ?? artifact.hash)
    : null;
  if (!artifactId || !artifactHash) {
    throw new GuideAdminError(502, "مسیر Artifact اول، شناسه و Hash را برنگرداند.", "first-artifact");
  }
  return {
    document: { id: doc.id, slug: doc.slug, canonicalPath: doc.canonical_path },
    workItem: { id: workItemId, workKey: workKey ?? "", status: "awaiting_approval" },
    artifact: { id: artifactId, artifactHash },
  };
}

/**
 * ساخت پیش‌نویس به‌روزرسانی برای سند منتشرشده: همان سه قدم سروری
 * ساخت پیش‌نویس اول، با دو تفاوت: سند باید از پیش منتشر شده باشد و
 * قدم سوم، مسیر update-artifact است نه first-artifact. سند منتشرنشده
 * ۴۰۹ می‌گیرد و باید از فرم انتشار اول ساخته شود. کار ناتمام بدون
 * Artifact (خرابی پس از قدم کار) هم این‌جا، مثل انتشار اول، ادامه پیدا
 * می‌کند؛ کار در جریان، ساخت تازه را رد می‌کند.
 */
export async function createGuideUpdateDraft(
  origin: string,
  documentId: string,
  inputPayload: unknown,
): Promise<GuideCreateResult> {
  const cfg = requireDb();
  const doc = await readDocById(cfg, documentId);
  if (!doc) {
    throw new GuideAdminError(404, "سندی با این شناسه نیست.", "database");
  }
  if (!doc.published_version_id) {
    throw new GuideAdminError(
      409,
      "این سند هنوز منتشر نشده است؛ پیش‌نویس آن از فرم انتشار اول ساخته می‌شود.",
      "database",
    );
  }
  let payload: PublishPayload;
  try {
    validatePublishPayload(inputPayload);
    payload = inputPayload as PublishPayload;
  } catch (err) {
    throw new GuideAdminError(
      400,
      `بار پیش‌نویس معتبر نیست: ${err instanceof Error ? err.message : "خطای اعتبارسنجی"}`,
      "validation",
    );
  }
  if (payload.slug !== doc.slug) {
    throw new GuideAdminError(400, "slug بار باید با slug سند یکی باشد.", "validation");
  }

  const existingWis = await readWorkItemsForDoc(cfg, doc.id);
  const activeWi = findActiveWorkItem(existingWis);
  if (activeWi) {
    throw new GuideAdminError(
      409,
      "برای این سند، کاری در جریان است؛ نخست آن را به پایان برسانید.",
      "work-items",
    );
  }

  let workItemId: string;
  let workKey: string;
  const pendingWi = findPendingWorkItem(existingWis);
  if (pendingWi) {
    workItemId = pendingWi.id;
    workKey = pendingWi.work_key;
  } else {
    const takenKeys = new Set(existingWis.map((wi) => wi.work_key));
    const createdWi = await createWorkItemWithPendingReuse(
      origin,
      cfg,
      doc.id,
      `guide-update-${doc.slug}`,
      takenKeys,
      payload.title,
      `پیش‌نویس به‌روزرسانی راهنما از داشبورد: ${doc.slug}`,
      doc.slug,
    );
    workItemId = createdWi.id;
    workKey = createdWi.workKey;
  }

  const artifactCall = await callInternal(
    origin,
    `/api/internal/work-items/${encodeURIComponent(workItemId)}/update-artifact`,
    { payload },
  );
  const artifactRecord = asRecord(artifactCall.json);
  const rawArtifact = artifactRecord
    ? (artifactRecord.artifact ?? artifactRecord)
    : null;
  const artifact = asRecord(rawArtifact);
  const artifactId = artifact ? asString(artifact.artifact_id ?? artifact.id) : null;
  const artifactHash = artifact
    ? asString(artifact.artifact_hash ?? artifact.hash)
    : null;
  if (!artifactId || !artifactHash) {
    throw new GuideAdminError(502, "مسیر Artifact به‌روزرسانی، شناسه و Hash را برنگرداند.", "update-artifact");
  }
  return {
    document: { id: doc.id, slug: doc.slug, canonicalPath: doc.canonical_path },
    workItem: { id: workItemId, workKey, status: "awaiting_approval" },
    artifact: { id: artifactId, artifactHash },
  };
}

/**
 * تأیید یا رد پیش‌نویس. Hash از دیتابیس خوانده می‌شود، نه از ورودی
 * مرورگر؛ پس Hash نمایشی صفحه، هرگز مجوز را تعیین نمی‌کند.
 */
export async function decideGuideDraft(
  origin: string,
  workItemId: string,
  decision: "approved" | "rejected",
  reason: string | null,
): Promise<{ approvalId: string; workItemStatus: string }> {
  const cfg = requireDb();
  const wis = (await postgrestGet(
    cfg,
    `factory_work_items?id=eq.${encodeURIComponent(workItemId)}&select=id,status,result_artifact_id`,
  )) as WiRow[];
  const wi = wis[0];
  if (!wi) {
    throw new GuideAdminError(404, "کاری با این شناسه نیست.", "database");
  }
  if (!wi.result_artifact_id) {
    throw new GuideAdminError(409, "این کار هنوز Artifact ندارد.", "database");
  }
  const artifactHash = await readArtifactHash(cfg, wi.result_artifact_id);
  if (!artifactHash) {
    throw new GuideAdminError(404, "Artifact این کار پیدا نشد.", "database");
  }
  const result = await callInternal(
    origin,
    `/api/internal/work-items/${encodeURIComponent(workItemId)}/approvals`,
    {
      artifact_id: wi.result_artifact_id,
      artifact_hash: artifactHash,
      decision,
      reviewer_id: reviewerIdentity(),
      decision_reason: reason,
    },
  );
  const record = asRecord(result.json);
  const rawApproval = record ? (record.approval ?? null) : null;
  const approval = asRecord(rawApproval);
  const rawWi = record ? (record.work_item ?? null) : null;
  const updatedWi = asRecord(rawWi);
  return {
    approvalId: approval ? (asString(approval.id) ?? "") : "",
    workItemStatus: updatedWi ? (asString(updatedWi.status) ?? wi.status) : wi.status,
  };
}

/** انتشار کار تأییدشده از مسیر داخلی انتشار. */
export async function publishGuideDraft(
  origin: string,
  workItemId: string,
): Promise<GuidePublishResult> {
  const result = await callInternal(
    origin,
    `/api/internal/work-items/${encodeURIComponent(workItemId)}/publish`,
    {},
  );
  const record = asRecord(result.json);
  const rawPub = record ? (record.publication ?? null) : null;
  const pub = asRecord(rawPub);
  const publicationId =
    asString(record?.publication_id) ?? (pub ? asString(pub.id) : null);
  if (!publicationId) {
    throw new GuideAdminError(502, "مسیر انتشار، شناسهٔ Publication را برنگرداند.", "publish");
  }
  const rawWi = record ? (record.work_item ?? null) : null;
  const updatedWi = asRecord(rawWi);
  return {
    publicationId,
    outboxId: asString(record?.outbox_id) ?? (pub ? asString(pub.outbox_id) : null),
    workItemStatus: updatedWi ? asString(updatedWi.status) : null,
  };
}

/** بررسی وضعیت و تکمیل کار در حال انتشار؛ فقط وقتی Publication verified است موفق می‌شود. */
export async function completeGuideDraft(
  origin: string,
  workItemId: string,
): Promise<GuideCompleteResult> {
  const result = await callInternal(
    origin,
    `/api/internal/work-items/${encodeURIComponent(workItemId)}/complete`,
    {},
  );
  const record = asRecord(result.json);
  const rawWi = record ? (record.work_item ?? null) : null;
  const updatedWi = asRecord(rawWi);
  const rawPub = record ? (record.publication ?? null) : null;
  const pub = asRecord(rawPub);
  return {
    workItemStatus: updatedWi ? (asString(updatedWi.status) ?? "") : "",
    publicationStatus: pub ? asString(pub.status) : null,
    replayed: record?.replayed === true,
  };
}

/** درخواست Rollback از مسیر داخلی Rollback؛ شناسهٔ هدف از Publication مرجع خوانده می‌شود.
 * اگر شناسهٔ سند داده شود، تعلق Publication به همان سند هم بررسی می‌شود تا
 * فراخواننده نتواند با شناسهٔ Publication سند دیگری، Rollback بگیرد. */
export async function requestGuideRollback(
  origin: string,
  publicationId: string,
  reason: string,
  expectedDocumentId?: string,
): Promise<GuideRollbackResult> {
  if (expectedDocumentId) {
    const cfg = requireDb();
    const pub = await readPublicationById(cfg, publicationId);
    if (!pub) {
      throw new GuideAdminError(404, "انتشاری با این شناسه نیست.", "rollback");
    }
    const pubRow = pub as PublicationRow;
    if (typeof pubRow.content_id === "string" && pubRow.content_id !== expectedDocumentId) {
      throw new GuideAdminError(409, "این انتشار متعلق به همین سند نیست.", "rollback");
    }
  }
  const result = await callInternal(origin, "/api/internal/factory/rollback", {
    publication_id: publicationId,
    reason,
  });
  const record = asRecord(result.json);
  const newPublicationId = asString(record?.publication_id);
  if (!newPublicationId) {
    throw new GuideAdminError(502, "مسیر Rollback، شناسهٔ Publication را برنگرداند.", "rollback");
  }
  return {
    publicationId: newPublicationId,
    outboxId: asString(record?.outbox_id),
    previousVersionId: asString(record?.previous_version_id) ?? "",
    versionId: asString(record?.version_id) ?? "",
    replayed: record?.replayed === true,
  };
}
