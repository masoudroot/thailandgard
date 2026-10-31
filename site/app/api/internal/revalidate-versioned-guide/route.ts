/**
 * R2B.1: باطل‌سازی کش خواندن نسخه‌ای بدون Build.
 *
 * پس از تغییر published_version_id، فراخوانندهٔ کنترل‌شده (فقط Staging) همین
 * مسیر را صدا می‌زند و صفحهٔ نسخه‌ای، در درخواست بعدی، نسخهٔ تازه را می‌خواند.
 * سازوکار، همان قرارداد اثبات‌شدهٔ process-outbox است: revalidateTag با
 * expire 0 (سند Next 16.4: محتوای کهنه هرگز سرو نمی‌شود و درخواست بعدی،
 * Revalidation مسدودکننده است) به‌علاوهٔ revalidatePath صفحه. updateTag در
 * Route Handler در دسترس نیست (سند Next 16.4: فقط Server Action) و این‌جا
 * صدا زده نمی‌شود.
 *
 * امنیت: مسیر، فقط با توکن داخلی (checkAuth، همان الگوی process-outbox) باز
 * می‌شود؛ نبودن توکن در env یعنی 503 و توکن نادرست یعنی 401. بدنه فقط slug
 * می‌گیرد و slug بیرون از VERSIONED_READ_SLUGS یعنی 400؛ مسیر، هرگز مسیر
 * دلخواه را باطل نمی‌کند. پاسخ، هیچ داده و هیچ Secret ندارد. مسیر، چیزی
 * منتشر نمی‌کند و Pointer را عوض نمی‌کند؛ فقط کش را باطل می‌کند.
 */
import { revalidatePath, revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { checkAuth } from "@/lib/factory/tick/internal-api";
import { revalidationTargetForSlug } from "@/lib/guide-versioned-read";

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!process.env.INTERNAL_PUBLISH_TOKEN) {
    return NextResponse.json(
      { error: "versioned revalidation not configured" },
      { status: 503 },
    );
  }
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body: unknown = await req.json().catch(() => ({}));
  const slug =
    body !== null && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>).slug
      : undefined;
  const target = typeof slug === "string" ? revalidationTargetForSlug(slug) : null;
  if (!target) {
    return NextResponse.json(
      { error: "slug is not a versioned read slug" },
      { status: 400 },
    );
  }
  revalidateTag(target.tag, { expire: 0 });
  revalidatePath(target.path);
  return NextResponse.json({
    revalidated: true,
    slug: target.slug,
    tag: target.tag,
    path: target.path,
  });
}
