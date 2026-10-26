import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

/**
 * قرارداد روت‌های حساس (Q2-05): رفتار خطا و پایداری UX.
 *
 * - track-call هرگز نباید UX را بشکند: بدنهٔ نامعتبر ۴۰۰، ولی خطای ذخیره‌سازی ۲۰۰.
 * - health باید همیشه پاسخ ۲۰۰ با وضعیت ok بدهد.
 */

const TRACK_URL = "http://localhost/api/track-call";

function post(body: string): NextRequest {
  return new NextRequest(TRACK_URL, {
    method: "POST",
    body,
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/track-call", () => {
  it("rejects an unparseable body with 400", async () => {
    const { POST } = await import("@/app/api/track-call/route");
    const res = await POST(post("{not-json"));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false });
  });

  it("rejects a body whose href is not a tel: link", async () => {
    const { POST } = await import("@/app/api/track-call/route");
    const res = await POST(post(JSON.stringify({ href: "https://example.com", page: "/" })));
    expect(res.status).toBe(400);
  });

  it("rejects a body whose page is not an absolute path", async () => {
    const { POST } = await import("@/app/api/track-call/route");
    const res = await POST(post(JSON.stringify({ href: "tel:+989120000000", page: "home" })));
    expect(res.status).toBe(400);
  });

  it("still answers 200 when storage fails (UX is never broken)", async () => {
    const { POST } = await import("@/app/api/track-call/route");
    const res = await POST(
      post(JSON.stringify({ href: "tel:+989120000000", page: "/tours/phuket-7-days", source: "test" })),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});

describe("GET /api/health", () => {
  it("reports ok with an ISO timestamp", async () => {
    const { GET } = await import("@/app/api/health/route");
    const res = await GET();
    const body = (await res.json()) as { status: string; timestamp: string };
    expect(res.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(Number.isNaN(Date.parse(body.timestamp))).toBe(false);
  });
});
