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
 * - guide.set_excerpt          به‌روزرسانی excerpt (متا) یک راهنمای موجود (۱۵۰ تا ۱۶۵ کاراکتر)
 * - guide_section.insert        درج بخش تازه در guide_sections
 * - guide_section.set_paragraphs جایگزینی پاراگراف‌های یک بخش
 * - guide_section.set_title     تغییر تیتر (heading) یک بخش موجود
 * - guide_section.move          جابه‌جایی بخش به position تازه (بازشماری تراکنشی همهٔ بخش‌های راهنما)
 * - guide_faq.update            به‌روزرسانی جواب سؤال موجود در guide_faqs
 * - guide_faq.insert            درج سؤال تازه در guide_faqs (موج واکنشی dev ۰۴:۰۵، ۱۴۰۵/۰۷/۲۰)
 * - tour_faq.update             به‌روزرسانی جواب سؤال موجود در tour_faqs
 * - tour_faq.insert             درج سؤال تازه در tour_faqs (موج واکنشی dev ۱۱:۰۵، ۱۴۰۵/۰۷/۲۰؛ آینهٔ guide_faq.insert)
 * - tour.insert                 ساخت رکورد تازه در tours (هندآف مدیر ۱۲:۴۰، ۱۴۰۵/۰۷/۲۰؛ RLS کلید ایجنت روی tours بسته است)
 * - lead_alert.backfill         آشتی‌جویی ردیف‌های lead-alert برای لیدهای N ساعت اخیر
 *                               (یافتهٔ باز qa، ۲۰ مهر ۱۴۰۵: رویداد لید بدون ردیف ماند)
 *
 * بدنه: { dry_run?: boolean, ops: Op[] }
 * dry_run=true فقط اعتبارسنجی می‌کند و چیزی نمی‌نویسد (برای qa).
 */

import { NextRequest, NextResponse } from "next/server";
import { shortLeadId, nextTouch } from "@/lib/lead-alert";
import { getTour } from "@/lib/tours";

// نکته: این route از هدر درخواست می‌خواند، پس خودبه‌خود داینامیک است.
// پیکربندی‌های قطعه (runtime/dynamic) با cacheComponents در Next.js ۱۶
// ناسازگارند؛ پس هیچ export پیکربندی‌ای این‌جا نیست.

type OpCode =
  | "guide.insert"
  | "guide.set_excerpt"
  | "guide.set_title"
  | "guide_section.insert"
  | "guide_section.set_paragraphs"
  | "guide_section.set_title"
  | "guide_section.move"
  | "guide_faq.update"
  | "guide_faq.insert"
  | "tour.set_summary"
  | "tour_faq.update"
  | "tour_faq.insert"
  | "tour.insert"
  | "lead_alert.backfill";

interface SyncOp {
  op: unknown;
  slug?: unknown;
  title?: unknown;
  excerpt?: unknown;
  summary?: unknown;
  category?: unknown;
  reading_minutes?: unknown;
  updated_fa?: unknown;
  guide_slug?: unknown;
  tour_slug?: unknown;
  short_title?: unknown;
  days?: unknown;
  nights?: unknown;
  route?: unknown;
  price_from?: unknown;
  tourist_type?: unknown;
  active?: unknown;
  description?: unknown;
  highlights?: unknown;
  includes?: unknown;
  excludes?: unknown;
  position?: unknown;
  to_position?: unknown;
  heading?: unknown;
  paragraphs?: unknown;
  question?: unknown;
  answer?: unknown;
  hours?: unknown;
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
    case "guide.set_excerpt":
      if (!isSlug(raw.guide_slug)) return { ok: false, error: "guide_slug نامعتبر است." };
      if (typeof raw.excerpt !== "string" || raw.excerpt.length < 150 || raw.excerpt.length > 165)
        return { ok: false, error: "excerpt باید بین ۱۵۰ تا ۱۶۵ کاراکتر باشد." };
      return { ok: true, op: raw };
    case "guide.set_title":
      // بریف seocontent ۰۱:۳۵ (meta-title-exec): تیتر راهنما هم کنار excerpt به‌روز می‌شود.
      if (!isSlug(raw.guide_slug)) return { ok: false, error: "guide_slug نامعتبر است." };
      if (!isText(raw.title, 200)) return { ok: false, error: "title نامعتبر است." };
      return { ok: true, op: raw };
    case "tour.set_summary":
      // بریف seocontent ۰۱:۳۵: متای تورها از tours.summary رندر می‌شود؛
      // کلید anon روی tours حق UPDATE ندارد، پس این op از مسیر سرور (کلید سرور) می‌زند.
      if (!isSlug(raw.tour_slug)) return { ok: false, error: "tour_slug نامعتبر است." };
      if (!isText(raw.summary, 600)) return { ok: false, error: "summary نامعتبر است." };
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
    case "guide_faq.insert":
      // هندآف محتوای ۲۳:۰۵، ۱۴۰۵/۰۷/۱۹: افزودن ردیف تازه (نه به‌روزرسانی موجود).
      if (!isSlug(raw.guide_slug)) return { ok: false, error: "guide_slug نامعتبر است." };
      if (!isText(raw.question, 300)) return { ok: false, error: "question نامعتبر است." };
      if (!isText(raw.answer, 6000)) return { ok: false, error: "answer نامعتبر است." };
      if (!Number.isInteger(raw.position) || (raw.position as number) < 1 || (raw.position as number) > 100)
        return { ok: false, error: "position نامعتبر است." };
      return { ok: true, op: raw };
    case "tour_faq.update":
      if (!isSlug(raw.tour_slug)) return { ok: false, error: "tour_slug نامعتبر است." };
      if (!isText(raw.question, 300)) return { ok: false, error: "question نامعتبر است." };
      if (!isText(raw.answer, 6000)) return { ok: false, error: "answer نامعتبر است." };
      return { ok: true, op: raw };
    case "tour_faq.insert":
      // هندآف on-page سامویی ۱۱:۰۵، ۱۴۰۵/۰۷/۲۰: آینهٔ دقیق guide_faq.insert برای جدول tour_faqs.
      if (!isSlug(raw.tour_slug)) return { ok: false, error: "tour_slug نامعتبر است." };
      if (!isText(raw.question, 300)) return { ok: false, error: "question نامعتبر است." };
      if (!isText(raw.answer, 6000)) return { ok: false, error: "answer نامعتبر است." };
      if (!Number.isInteger(raw.position) || (raw.position as number) < 1 || (raw.position as number) > 100)
        return { ok: false, error: "position نامعتبر است." };
      return { ok: true, op: raw };
    case "tour.insert":
      // هندآف مدیر ۱۲:۴۰، ۱۴۰۵/۰۷/۲۰: ساخت رکورد تور ترکیبی؛ RLS کلید ایجنت روی tours بسته است (۴۲۵۰۱).
      if (!isSlug(raw.slug)) return { ok: false, error: "slug نامعتبر است." };
      if (!isText(raw.title, 200)) return { ok: false, error: "title نامعتبر است." };
      if (!isText(raw.short_title, 60)) return { ok: false, error: "short_title نامعتبر است." };
      if (!Number.isInteger(raw.days) || (raw.days as number) < 1 || (raw.days as number) > 60)
        return { ok: false, error: "days نامعتبر است." };
      if (!Number.isInteger(raw.nights) || (raw.nights as number) < 1 || (raw.nights as number) > 60)
        return { ok: false, error: "nights نامعتبر است." };
      if (!isText(raw.route, 200)) return { ok: false, error: "route نامعتبر است." };
      if (raw.price_from !== null && (typeof raw.price_from !== "number" || (raw.price_from as number) < 0))
        return { ok: false, error: "price_from باید null یا عدد نامنفی باشد." };
      if (!isText(raw.tourist_type, 120)) return { ok: false, error: "tourist_type نامعتبر است." };
      if (typeof raw.active !== "boolean") return { ok: false, error: "active باید boolean باشد." };
      if (!isText(raw.summary, 600)) return { ok: false, error: "summary نامعتبر است." };
      if (!isParagraphs(raw.description)) return { ok: false, error: "description نامعتبر است." };
      if (!isParagraphs(raw.highlights)) return { ok: false, error: "highlights نامعتبر است." };
      if (!isParagraphs(raw.includes)) return { ok: false, error: "includes نامعتبر است." };
      if (!isParagraphs(raw.excludes)) return { ok: false, error: "excludes نامعتبر است." };
      return { ok: true, op: raw };
    case "lead_alert.backfill": {
      // آشتی‌جویی ردیف‌های lead-alert (یافتهٔ باز qa، ۲۰ مهر ۱۴۰۵):
      // خلاصه‌نویس inline گاهی بی‌صدا رد می‌شود (فقط console.warn) و هیچ‌وقت
      // خودش را اعلام نمی‌کند؛ این op از سمت سرور (کلید سرویس) لیدهای بازه را
      // با ردیف‌های موجود تطبیق می‌دهد و گمشده‌ها را بدون PII می‌سازد.
      const hours = raw.hours === undefined ? 24 : raw.hours;
      if (!Number.isInteger(hours) || (hours as number) < 1 || (hours as number) > 168)
        return { ok: false, error: "hours باید عدد صحیح ۱ تا ۱۶۸ باشد." };
      return { ok: true, op: { ...raw, hours } };
    }
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

/**
 * بک‌فیل lead-alert (یافتهٔ باز qa، ۲۰ مهر ۱۴۰۵؛ مالک dev/intel).
 *
 * قرارداد داده همان ران‌بوک SLA تیم لید است: ردیف بدون PII در intel_feed با
 * tags=["lead-alert"]، title «لید تازه #<۵ کاراکتر>» یا «تغییر وضعیت لید #<۵ کاراکتر>»
 * و summary به‌صورت JSON (همان کلیدهای lib/lead-alert.ts: lead_id، status،
 * created_at، changed_at، source، tour، preferred_call_time، next_touch).
 *
 * منطق:
 * - لیدهای `hours` ساعت اخیر خوانده می‌شوند (سرورساید، کلید سرویس).
 * - ردیف‌های lead-alert همان بازه خوانده و با شناسهٔ کوتاه تطبیق داده می‌شوند.
 * - لیدی که هیچ ردیفی ندارد: یک ردیف ثبت می‌گیرد (با وضعیت فعلی‌اش).
 * - لیدی که آخرین ردیفش با وضعیت فعلی‌اش فرق دارد: یک ردیف «تغییر وضعیت» می‌گیرد.
 *   (تغییر وضعیت‌ها از داشبورد سوپابیس می‌آیند و هیچ مسیر سروری ندارند؛
 *    پس این تنها جایی است که ردیف تغییر وضعیت ساخته می‌شود.)
 *
 * پاسخ هرگز PII ندارد: فقط شمارش و شناسه‌های کوتاه (همان چیزی که تیم لید
 * از خود intel_feed می‌خواند).
 */
interface BackfillLead {
  id: string;
  status: string;
  created_at: string;
  source: string | null;
  tour_slug: string | null;
}

async function backfillLeadAlerts(
  cfg: DbCfg,
  hours: number
): Promise<{ matched: number; note: string }> {
  const since = new Date(Date.now() - hours * 3600_000).toISOString();
  const encSince = encodeURIComponent(since);

  const { rows: leadRows } = await postgrest(
    cfg,
    "GET",
    `leads?select=id,status,created_at,source,tour_slug&created_at=gte.${encSince}&order=created_at.asc&limit=200`
  );
  const leads = (leadRows as BackfillLead[]).filter(
    (l) => typeof l.id === "string" && typeof l.created_at === "string"
  );

  const { rows: alertRows } = await postgrest(
    cfg,
    "GET",
    `intel_feed?select=title,summary,collected_at&tags=cs.{lead-alert}&collected_at=gte.${encSince}&order=collected_at.asc&limit=500`
  );
  const alerts = alertRows as Array<{ title: string; summary: string | null; collected_at: string }>;

  // آخرین وضعیت ثبت‌شدهٔ هر لید از روی ردیف‌های موجود (تطبیق با شناسهٔ کوتاه در title).
  const latestByShort = new Map<string, { status: string; collected_at: string }>();
  for (const a of alerts) {
    const m = /#([0-9a-f-]{5})/i.exec(a.title ?? "");
    if (!m) continue;
    const short = m[1];
    let status = "";
    try {
      const s = JSON.parse(a.summary ?? "{}") as { status?: unknown };
      if (typeof s.status === "string") status = s.status;
    } catch {
      /* summary خراب؛ نادیده */
    }
    const prev = latestByShort.get(short);
    if (!prev || a.collected_at > prev.collected_at) {
      latestByShort.set(short, { status, collected_at: a.collected_at });
    }
  }

  const wrote: string[] = [];
  for (const lead of leads) {
    const short = shortLeadId(lead.id);
    const known = latestByShort.get(short);
    const currentStatus = ["new", "contacted", "done"].includes(lead.status) ? lead.status : "new";
    if (known && known.status === currentStatus) continue; // ردیف به‌روز هست

    const isRegistration = !known;
    const title = isRegistration ? `لید تازه #${short}` : `تغییر وضعیت لید #${short}`;
    const summary: Record<string, string> = {
      lead_id: short,
      status: currentStatus,
      created_at: lead.created_at,
    };
    if (!isRegistration) summary.changed_at = new Date().toISOString();
    if (lead.source) summary.source = lead.source;
    const tourTitle = lead.tour_slug ? getTour(lead.tour_slug)?.title : undefined;
    if (tourTitle) summary.tour = tourTitle;
    const touchesDone = currentStatus === "new" ? 0 : currentStatus === "contacted" ? 1 : 6;
    const nt = nextTouch(lead.created_at, touchesDone);
    summary.next_touch = nt ? JSON.stringify({ touch: nt.touch, due_at: nt.dueAt }) : "nurture";

    await postgrest(cfg, "POST", "intel_feed", {
      title,
      summary: JSON.stringify(summary),
      tags: ["lead-alert"],
    });
    wrote.push(`${short}:${isRegistration ? "new" : "change"}`);
    // حافظهٔ محلی به‌روز می‌شود تا لید تکراری در همین اجرا دوباره ردیف نگیرد.
    latestByShort.set(short, { status: currentStatus, collected_at: new Date().toISOString() });
  }

  return {
    matched: wrote.length,
    note: `بک‌فیل lead-alert: ${leads.length} لیدِ ${hours} ساعت اخیر بررسی شد، ${wrote.length} ردیف تازه${wrote.length ? ` (${wrote.join("، ")})` : ""}.`,
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
    case "guide.set_excerpt": {
      const q = `guides?slug=eq.${encodeURIComponent(String(op.guide_slug))}`;
      const { rows } = await postgrest(cfg, "PATCH", q, { excerpt: op.excerpt });
      if (rows.length === 0) return { matched: 0, note: `راهنمایی با slug=${op.guide_slug} پیدا نشد.` };
      return { matched: rows.length, note: `به‌روزرسانی excerpt راهنما (slug=${op.guide_slug})` };
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
    case "guide.set_title": {
      const q = `guides?slug=eq.${encodeURIComponent(String(op.guide_slug))}`;
      const { rows } = await postgrest(cfg, "PATCH", q, { title: op.title });
      if (rows.length === 0) throw new Error("راهنمایی با این slug پیدا نشد.");
      return { matched: rows.length, note: `به‌روزرسانی title راهنما (slug=${op.guide_slug})` };
    }
    case "tour.set_summary": {
      const q = `tours?slug=eq.${encodeURIComponent(String(op.tour_slug))}`;
      const { rows } = await postgrest(cfg, "PATCH", q, { summary: op.summary });
      if (rows.length === 0) throw new Error("توری با این slug پیدا نشد.");
      return { matched: rows.length, note: `به‌روزرسانی summary تور (slug=${op.tour_slug})` };
    }
    case "guide_faq.update": {
      const q = `guide_faqs?guide_slug=eq.${encodeURIComponent(String(op.guide_slug))}&question=eq.${encodeURIComponent(String(op.question))}`;
      const { rows } = await postgrest(cfg, "PATCH", q, { answer: op.answer });
      if (rows.length === 0) throw new Error("سؤالی با این متن در guide_faqs پیدا نشد.");
      return { matched: rows.length, note: "به‌روزرسانی جواب guide_faqs" };
    }
    case "guide_faq.insert": {
      const encSlug = encodeURIComponent(String(op.guide_slug));
      // نگهبان تکرار (هندآف بریف ۲۳:۰۵): همان سؤال دوبار درج نشود.
      const dup = await postgrest(
        cfg,
        "GET",
        `guide_faqs?guide_slug=eq.${encSlug}&question=eq.${encodeURIComponent(String(op.question))}&select=position`
      );
      if (dup.rows.length > 0) throw new Error("این سؤال قبلاً در guide_faqs ثبت شده است.");
      const { rows } = await postgrest(cfg, "POST", "guide_faqs", {
        guide_slug: op.guide_slug,
        position: op.position,
        question: op.question,
        answer: op.answer,
      });
      return { matched: rows.length, note: `درج سؤال تازه در guide_faqs (position=${op.position})` };
    }
    case "tour_faq.update": {
      const q = `tour_faqs?tour_slug=eq.${encodeURIComponent(String(op.tour_slug))}&question=eq.${encodeURIComponent(String(op.question))}`;
      const { rows } = await postgrest(cfg, "PATCH", q, { answer: op.answer });
      if (rows.length === 0) throw new Error("سؤالی با این متن در tour_faqs پیدا نشد.");
      return { matched: rows.length, note: "به‌روزرسانی جواب tour_faqs" };
    }
    case "tour_faq.insert": {
      const { rows } = await postgrest(cfg, "POST", "tour_faqs", {
        tour_slug: op.tour_slug,
        position: op.position,
        question: op.question,
        answer: op.answer,
      });
      return { matched: rows.length, note: `درج سؤال تازه در tour_faqs (position=${op.position})` };
    }
    case "tour.insert": {
      const exists = await postgrest(cfg, "GET", `tours?slug=eq.${encodeURIComponent(String(op.slug))}&select=slug`);
      if (exists.rows.length > 0) throw new Error("توری با این slug از قبل هست.");
      const { rows } = await postgrest(cfg, "POST", "tours", {
        slug: op.slug,
        title: op.title,
        short_title: op.short_title,
        days: op.days,
        nights: op.nights,
        route: op.route,
        price_from: op.price_from ?? null,
        tourist_type: op.tourist_type,
        active: op.active,
        summary: op.summary,
        description: op.description,
        highlights: op.highlights,
        includes: op.includes,
        excludes: op.excludes,
        price_updated_at: null,
      });
      return { matched: rows.length, note: `ساخت رکورد تازه در tours (slug=${op.slug})` };
    }
    case "lead_alert.backfill": {
      return backfillLeadAlerts(cfg, Number(op.hours));
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
