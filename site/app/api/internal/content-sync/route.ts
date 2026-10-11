/**
 * روت داخلی درج/به‌روزرسانی محتوای سایت در دیتابیس.
 *
 * مسیر مصوب حکم مدیر (DECISIONS #104، ۱۴۰۵/۰۷/۱۹): هیچ کلید ایجنتی
 * INSERT/UPDATE مستقیم روی جدول‌های محتوایی نمی‌گیرد. این روتِ سرورساید
 * (روی ورسل) با سکرت داخلی گارد می‌شود و با SUPABASE_SERVICE_ROLE_KEY
 * (فقط Vercel env) می‌نویسد.
 *
 * احراز هویت: هدر x-internal-secret (یا Authorization: Bearer) باید با
 * INTERNAL_CONTENT_SECRET (فقط Vercel env، هرگز ریپو) یکی باشد.
 *
 * عملیات مجاز (فقط همین‌ها؛ هیچ نام جدول/ستونی از بیرون نمی‌آید):
 * - guide.insert               ساخت ردیف تازه در guides (راهنمای تازه)
 * - guide_section.insert        درج بخش تازه در guide_sections
 * - guide_section.set_paragraphs جایگزینی پاراگراف‌های یک بخش
 * - guide_section.set_title     تغییر تیتر (heading) یک بخش موجود
 * - guide_section.move          جابه‌جایی بخش به position تازه (بازشماری تراکنشی همهٔ بخش‌های راهنما)
 * - guide_faq.update            به‌روزرسانی جواب سؤال موجود در guide_faqs
 * - tour_faq.update             به‌روزرسانی جواب سؤال موجود در tour_faqs
 *
 * بدنه: { dry_run?: boolean, ops: Op[] }
 * dry_run=true فقط اعتبارسنجی می‌کند و چیزی نمی‌نویسد (برای qa).
 */

import { NextRequest, NextResponse } from "next/server";

// نکته: این route از هدر درخواست می‌خواند، پس خودبه‌خود داینامیک است.
// پیکربندی‌های قطعه (runtime/dynamic) با cacheComponents در Next.js ۱۶
// ناسازگارند؛ پس هیچ export پیکربندی‌ای این‌جا نیست.

type OpCode =
  | "guide.insert"
  | "guide_section.insert"
  | "guide_section.set_paragraphs"
  | "guide_section.set_title"
  | "guide_section.move"
  | "guide_faq.update"
  | "tour_faq.update";

interface SyncOp {
  op: unknown;
  slug?: unknown;
  title?: unknown;
  excerpt?: unknown;
  category?: unknown;
  reading_minutes?: unknown;
  updated_fa?: unknown;
  guide_slug?: unknown;
  tour_slug?: unknown;
  position?: unknown;
  to_position?: unknown;
  heading?: unknown;
  paragraphs?: unknown;
  question?: unknown;
  answer?: unknown;
}

const MAX_OPS = 20;
const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,79}$/;

function isText(v: unknown, max: number): v is string {
  return typeof v === "string" && v.trim().length > 0 && v.length <= max;
}

function isSlug(v: unknown): v is string {
  return typeof v === "string" && SLUG_RE.test(v);
}

function isParagraphs(v: unknown): v is string[] {
  return (
    Array.isArray(v) &&
    v.length > 0 &&
    v.length <= 30 &&
    v.every((p) => typeof p === "string" && p.trim().length > 0 && p.length <= 4000)
  );
}

function validateOp(raw: SyncOp): { ok: true; op: SyncOp } | { ok: false; error: string } {
  if (typeof raw !== "object" || raw === null) return { ok: false, error: "op نامعتبر است." };
  switch (raw.op) {
    case "guide.insert":
      if (!isSlug(raw.slug)) return { ok: false, error: "slug نامعتبر است." };
      if (!isText(raw.title, 200)) return { ok: false, error: "title نامعتبر است." };
      if (!isText(raw.excerpt, 600)) return { ok: false, error: "excerpt نامعتبر است." };
      if (!isText(raw.category, 60)) return { ok: false, error: "category نامعتبر است." };
      if (!Number.isInteger(raw.reading_minutes) || (raw.reading_minutes as number) < 1 || (raw.reading_minutes as number) > 120)
        return { ok: false, error: "reading_minutes نامعتبر است." };
      if (!isText(raw.updated_fa, 40)) return { ok: false, error: "updated_fa نامعتبر است." };
      return { ok: true, op: raw };
    case "guide_section.insert":
      if (!isSlug(raw.guide_slug)) return { ok: false, error: "guide_slug نامعتبر است." };
      if (!Number.isInteger(raw.position) || (raw.position as number) < 1 || (raw.position as number) > 100)
        return { ok: false, error: "position نامعتبر است." };
      if (!isText(raw.heading, 200)) return { ok: false, error: "heading نامعتبر است." };
      if (!isParagraphs(raw.paragraphs)) return { ok: false, error: "paragraphs نامعتبر است." };
      return { ok: true, op: raw };
    case "guide_section.set_paragraphs":
      if (!isSlug(raw.guide_slug)) return { ok: false, error: "guide_slug نامعتبر است." };
      if (!Number.isInteger(raw.position) || (raw.position as number) < 1 || (raw.position as number) > 100)
        return { ok: false, error: "position نامعتبر است." };
      if (!isParagraphs(raw.paragraphs)) return { ok: false, error: "paragraphs نامعتبر است." };
      return { ok: true, op: raw };
    case "guide_section.set_title":
      if (!isSlug(raw.guide_slug)) return { ok: false, error: "guide_slug نامعتبر است." };
      if (!Number.isInteger(raw.position) || (raw.position as number) < 1 || (raw.position as number) > 100)
        return { ok: false, error: "position نامعتبر است." };
      if (!isText(raw.title, 200)) return { ok: false, error: "title نامعتبر است." };
      return { ok: true, op: raw };
    case "guide_section.move":
      if (!isSlug(raw.guide_slug)) return { ok: false, error: "guide_slug نامعتبر است." };
      if (!Number.isInteger(raw.position) || (raw.position as number) < 1 || (raw.position as number) > 100)
        return { ok: false, error: "position نامعتبر است." };
      if (!Number.isInteger(raw.to_position) || (raw.to_position as number) < 1 || (raw.to_position as number) > 100)
        return { ok: false, error: "to_position نامعتبر است." };
      return { ok: true, op: raw };
    case "guide_faq.update":
      if (!isSlug(raw.guide_slug)) return { ok: false, error: "guide_slug نامعتبر است." };
      if (!isText(raw.question, 300)) return { ok: false, error: "question نامعتبر است." };
      if (!isText(raw.answer, 6000)) return { ok: false, error: "answer نامعتبر است." };
      return { ok: true, op: raw };
    case "tour_faq.update":
      if (!isSlug(raw.tour_slug)) return { ok: false, error: "tour_slug نامعتبر است." };
      if (!isText(raw.question, 300)) return { ok: false, error: "question نامعتبر است." };
      if (!isText(raw.answer, 6000)) return { ok: false, error: "answer نامعتبر است." };
      return { ok: true, op: raw };
    default:
      return { ok: false, error: `عملیات مجاز نیست: ${String(raw.op)}` };
  }
}

/** مقایسهٔ زمان‌ثابت برای سکرت (جلوگیری از نشت زمان). */
function secretsEqual(a: string, b: string): boolean {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function checkAuth(req: NextRequest): boolean {
  const expected = process.env.INTERNAL_CONTENT_SECRET;
  if (!expected) return false;
  const headerSecret = req.headers.get("x-internal-secret") ?? "";
  const bearer = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const provided = headerSecret || bearer;
  return secretsEqual(provided, expected);
}

interface DbCfg {
  url: string;
  serviceKey: string;
}

function dbConfig(): DbCfg | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return { url, serviceKey };
}

async function postgrest(
  cfg: DbCfg,
  method: "POST" | "PATCH" | "GET",
  path: string,
  body?: Record<string, unknown>
): Promise<{ status: number; rows: unknown[] }> {
  const res = await fetch(`${cfg.url}/rest/v1/${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      apikey: cfg.serviceKey,
      Authorization: `Bearer ${cfg.serviceKey}`,
      ...(method === "GET" ? {} : { Prefer: "return=representation" }),
    },
    ...(method === "GET" ? {} : { body: JSON.stringify(body ?? {}) }),
  });
  if (!res.ok) {
    throw new Error(`postgrest ${res.status} روی ${path.split("?")[0]}`);
  }
  const rows = (await res.json()) as unknown[];
  return { status: res.status, rows };
}

/**
 * جابه‌جایی بخش (guide_section.move): بخشِ position=from به position=to می‌رود و
 * positionهای همهٔ بخش‌های راهنما از نو ۱ تا N بازشماری می‌شوند.
 *
 * چون PostgREST تراکنش چندفراخوانی ندارد، بازشماری در دو پاس با آفست موقت
 * انجام می‌شود تا هیچ‌وقت دو ردیف هم‌زمان یک position نگیرند (امن در برابر
 * unique(guide_slug, position)):
 *   پاس ۱: همهٔ بخش‌ها از position قدیم ← ‎۱۰۰۰+قدیم (نزولی، بدون تداخل)
 *   پاس ۲: از ‎۱۰۰۰+قدیم ← position تازه (۱ تا N؛ همهٔ مقصدها خالی‌اند)
 */
const MOVE_TEMP_OFFSET = 1000;

async function moveSection(
  cfg: DbCfg,
  guideSlug: string,
  from: number,
  to: number
): Promise<{ matched: number; note: string }> {
  const q = `guide_sections?guide_slug=eq.${encodeURIComponent(guideSlug)}&select=position&order=position.asc`;
  const { rows } = await postgrest(cfg, "GET", q);
  const positions = (rows as Array<{ position: number }>)
    .map((r) => Number(r.position))
    .filter((p) => Number.isInteger(p) && p > 0)
    .sort((a, b) => a - b);
  if (positions.length === 0) throw new Error("بخشی برای این راهنما پیدا نشد.");
  const fromIdx = positions.indexOf(from);
  if (fromIdx < 0) throw new Error(`بخشی با position=${from} پیدا نشد.`);
  const targetIdx = Math.min(Math.max(to - 1, 0), positions.length - 1);
  if (fromIdx === targetIdx) {
    return { matched: positions.length, note: "جابه‌جایی لازم نبود (position یکسان)." };
  }
  const newOrder = [...positions];
  const [moved] = newOrder.splice(fromIdx, 1);
  newOrder.splice(targetIdx, 0, moved);
  const mapping = new Map<number, number>();
  newOrder.forEach((oldPos, i) => mapping.set(oldPos, i + 1));
  const enc = encodeURIComponent(guideSlug);
  // پاس ۱: قدیم ← موقت (نزولی تا هیچ تداخلی پیش نیاید)
  for (const oldPos of [...positions].sort((a, b) => b - a)) {
    await postgrest(cfg, "PATCH", `guide_sections?guide_slug=eq.${enc}&position=eq.${oldPos}`, {
      position: MOVE_TEMP_OFFSET + oldPos,
    });
  }
  // پاس ۲: موقت ← تازه
  for (const oldPos of positions) {
    await postgrest(cfg, "PATCH", `guide_sections?guide_slug=eq.${enc}&position=eq.${MOVE_TEMP_OFFSET + oldPos}`, {
      position: mapping.get(oldPos),
    });
  }
  return {
    matched: positions.length,
    note: `جابه‌جایی بخش ${from} به position ${mapping.get(from)} (بازشماری ${positions.length} بخش)`,
  };
}

async function applyOp(cfg: DbCfg, op: SyncOp): Promise<{ matched: number; note: string }> {
  switch (op.op as OpCode) {
    case "guide.insert": {
      const { rows } = await postgrest(cfg, "POST", "guides", {
        slug: op.slug,
        title: op.title,
        excerpt: op.excerpt,
        category: op.category,
        reading_minutes: op.reading_minutes,
        updated_fa: op.updated_fa,
      });
      return { matched: rows.length, note: `ساخت راهنمای تازه در guides (slug=${op.slug})` };
    }
    case "guide_section.insert": {
      const { rows } = await postgrest(cfg, "POST", "guide_sections", {
        guide_slug: op.guide_slug,
        position: op.position,
        heading: op.heading,
        paragraphs: op.paragraphs,
      });
      return { matched: rows.length, note: `بخش تازه در guide_sections (position=${op.position})` };
    }
    case "guide_section.set_paragraphs": {
      const q = `guide_sections?guide_slug=eq.${encodeURIComponent(String(op.guide_slug))}&position=eq.${op.position}`;
      const { rows } = await postgrest(cfg, "PATCH", q, { paragraphs: op.paragraphs });
      if (rows.length === 0) throw new Error("رکوردی برای به‌روزرسانی پاراگراف پیدا نشد.");
      return { matched: rows.length, note: `به‌روزرسانی پاراگراف‌های بخش (position=${op.position})` };
    }
    case "guide_section.set_title": {
      const q = `guide_sections?guide_slug=eq.${encodeURIComponent(String(op.guide_slug))}&position=eq.${op.position}`;
      const { rows } = await postgrest(cfg, "PATCH", q, { heading: op.title });
      if (rows.length === 0) throw new Error("رکوردی برای به‌روزرسانی تیتر پیدا نشد.");
      return { matched: rows.length, note: `به‌روزرسانی تیتر بخش (position=${op.position})` };
    }
    case "guide_section.move": {
      return moveSection(cfg, String(op.guide_slug), Number(op.position), Number(op.to_position));
    }
    case "guide_faq.update": {
      const q = `guide_faqs?guide_slug=eq.${encodeURIComponent(String(op.guide_slug))}&question=eq.${encodeURIComponent(String(op.question))}`;
      const { rows } = await postgrest(cfg, "PATCH", q, { answer: op.answer });
      if (rows.length === 0) throw new Error("سؤالی با این متن در guide_faqs پیدا نشد.");
      return { matched: rows.length, note: "به‌روزرسانی جواب guide_faqs" };
    }
    case "tour_faq.update": {
      const q = `tour_faqs?tour_slug=eq.${encodeURIComponent(String(op.tour_slug))}&question=eq.${encodeURIComponent(String(op.question))}`;
      const { rows } = await postgrest(cfg, "PATCH", q, { answer: op.answer });
      if (rows.length === 0) throw new Error("سؤالی با این متن در tour_faqs پیدا نشد.");
      return { matched: rows.length, note: "به‌روزرسانی جواب tour_faqs" };
    }
  }
  throw new Error("عملیات ناشناخته.");
}

export async function GET() {
  return NextResponse.json({ ok: false, error: "فقط POST." }, { status: 405 });
}

export async function POST(req: NextRequest) {
  // ۱) احراز هویت
  if (!process.env.INTERNAL_CONTENT_SECRET) {
    console.error("[content-sync] INTERNAL_CONTENT_SECRET تنظیم نشده است.");
    return NextResponse.json({ ok: false, error: "خطای پیکربندی سرور." }, { status: 500 });
  }
  if (!checkAuth(req)) {
    return NextResponse.json({ ok: false, error: "دسترسی مجاز نیست." }, { status: 401 });
  }

  // ۲) اعتبارسنجی بدنه
  let body: { dry_run?: unknown; ops?: unknown };
  try {
    body = (await req.json()) as { dry_run?: unknown; ops?: unknown };
  } catch {
    return NextResponse.json({ ok: false, error: "بدنهٔ درخواست معتبر نیست." }, { status: 400 });
  }
  if (!Array.isArray(body.ops) || body.ops.length === 0 || body.ops.length > MAX_OPS) {
    return NextResponse.json({ ok: false, error: `ops باید آرایه‌ای از ۱ تا ${MAX_OPS} عملیات باشد.` }, { status: 400 });
  }
  const validated: SyncOp[] = [];
  for (const raw of body.ops) {
    const v = validateOp(raw as SyncOp);
    if (!v.ok) {
      return NextResponse.json({ ok: false, error: v.error }, { status: 400 });
    }
    validated.push(v.op);
  }
  const dryRun = body.dry_run === true;

  // ۳) dry-run: فقط گزارش برنامه، بدون دست‌زدن به کلید سرور
  if (dryRun) {
    return NextResponse.json({
      ok: true,
      dry_run: true,
      planned: validated.map((o) => ({
        op: o.op,
        slug: o.slug ?? o.guide_slug ?? o.tour_slug,
        position: o.position ?? null,
      })),
    });
  }

  // ۴) اجرا
  const cfg = dbConfig();
  if (!cfg) {
    console.error("[content-sync] متغیرهای سوپابیس تنظیم نشده‌اند.");
    return NextResponse.json({ ok: false, error: "خطای پیکربندی سرور." }, { status: 500 });
  }

  const results: Array<{ op: unknown; ok: boolean; note?: string; error?: string }> = [];
  for (const op of validated) {
    try {
      const r = await applyOp(cfg, op);
      console.log(`[content-sync] ok op=${op.op} slug=${op.guide_slug ?? op.tour_slug} matched=${r.matched}`);
      results.push({ op: op.op, ok: true, note: r.note });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "خطای ناشناخته";
      console.error(`[content-sync] fail op=${op.op}: ${msg}`);
      results.push({ op: op.op, ok: false, error: msg });
    }
  }
  const failed = results.filter((r) => !r.ok).length;
  return NextResponse.json({
    ok: failed === 0,
    applied: results.length - failed,
    failed,
    results,
  });
}
