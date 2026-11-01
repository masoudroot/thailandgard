import { NextRequest, NextResponse } from "next/server";
import { checkAuth, dbConfig, postgrestWrite, type DocumentRow } from "@/lib/factory/tick/internal-api";
import {
  buildContentDocumentInsert,
  isValidGuideSlug,
} from "@/lib/factory/content-documents";

/**
 * POST /api/internal/content-documents
 * ساخت سند راهنمای تازه در وضعیت draft. فقط با توکن
 * INTERNAL_PUBLISH_TOKEN. بدنه فقط { slug } می‌گیرد؛ canonical_path از
 * روی همان slug ساخته می‌شود. سند تا پیش از انتشار، نسخهٔ منتشرشده
 * ندارد و عمومی نیست. slug تکراری با ۴۰۹ رد می‌شود (یکتایی
 * content_type و slug در دیتابیس، مرجع نهایی است و مسابقهٔ هم‌زمان را
 * هم همان قید می‌گیرد، نه بررسی پیش از درج).
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!process.env.INTERNAL_PUBLISH_TOKEN) {
    return NextResponse.json({ error: "content documents not configured" }, { status: 503 });
  }
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const cfg = dbConfig();
  if (!cfg) {
    return NextResponse.json({ error: "content documents not configured" }, { status: 503 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "body must be an object" }, { status: 400 });
  }
  const slug = (body as Record<string, unknown>).slug;
  if (!isValidGuideSlug(slug)) {
    return NextResponse.json({ error: "slug must match ^[a-z0-9]+(-[a-z0-9]+)*$" }, { status: 400 });
  }
  try {
    const rows = (await postgrestWrite(cfg, "POST", "content_documents", buildContentDocumentInsert(slug))) as DocumentRow[];
    if (rows.length === 0) {
      return NextResponse.json({ error: "content document was not created" }, { status: 500 });
    }
    const document = rows[0];
    return NextResponse.json({
      document: {
        id: document.id,
        slug: document.slug,
        canonical_path: document.canonical_path,
        status: document.status,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (
      message.includes("duplicate key") ||
      message.includes("already exists") ||
      message.includes("23505")
    ) {
      return NextResponse.json({ error: "slug already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
