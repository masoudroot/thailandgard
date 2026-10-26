import { NextRequest } from "next/server";
import { hashSync } from "bcryptjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Q2-05 (ادامه): تست قرارداد روت‌های حساس `contact-message`، `rates` و `auth/login`.
 *
 * هدف: قفل کردن رفتار خطا (۴۰۰/۴۰۱/۵۰۳/۵۰۰) و جلوگیری از برگشت باگ‌های سکوت.
 * هیچ درخواست شبکه‌ای واقعی زده نمی‌شود؛ وابستگی‌ها mock شده‌اند.
 */

const saveMock = vi.fn();

vi.mock("@/lib/callback-store", () => ({
  callbackStore: { save: (...args: unknown[]) => saveMock(...args) },
}));

const ratesLatest = vi.fn();
const ratesPrevious = vi.fn();
const ratesHistory = vi.fn();
const ratesSchedule = vi.fn();

vi.mock("@/lib/dashboard/rates", () => ({
  getLatestRates: () => ratesLatest(),
  getPreviousRates: () => ratesPrevious(),
  getRatesHistory: (days: number) => ratesHistory(days),
  getRatesSchedule: () => ratesSchedule(),
}));

function jsonRequest(url: string, body: unknown, init: RequestInit = {}): NextRequest {
  return new NextRequest(url, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", ...(init.headers as Record<string, string>) },
  });
}

function rawRequest(url: string, body: string): NextRequest {
  return new NextRequest(url, {
    method: "POST",
    body,
    headers: { "content-type": "application/json" },
  });
}

const CONTACT_URL = "http://localhost/api/contact-message";
const LOGIN_URL = "http://localhost/api/auth/login";

const VALID_CONTACT = {
  name: "مسعود",
  mobile: "09121234567",
  subject: "tour",
  message: "سلام، درباره تور پوکت سؤال دارم.",
};

describe("POST /api/contact-message", () => {
  beforeEach(() => {
    saveMock.mockReset();
    saveMock.mockResolvedValue(undefined);
  });

  it("rejects an unparseable body with 400", async () => {
    const { POST } = await import("@/app/api/contact-message/route");
    const res = await POST(rawRequest(CONTACT_URL, "{oops"));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ ok: false });
  });

  it.each([
    ["short name", { ...VALID_CONTACT, name: "م" }, "نام"],
    ["invalid mobile", { ...VALID_CONTACT, mobile: "12345" }, "موبایل"],
    ["unknown subject", { ...VALID_CONTACT, subject: "spam" }, "موضوع"],
    ["short message", { ...VALID_CONTACT, message: "کم" }, "پیام"],
  ])("rejects %s with 400", async (_label, body, word) => {
    const { POST } = await import("@/app/api/contact-message/route");
    const res = await POST(jsonRequest(CONTACT_URL, body));
    const payload = (await res.json()) as { ok: boolean; error: string };
    expect(res.status).toBe(400);
    expect(payload.ok).toBe(false);
    expect(payload.error).toContain(word);
    expect(saveMock).not.toHaveBeenCalled();
  });

  it("normalises the mobile and stores the lead with the subject prefix", async () => {
    const { POST } = await import("@/app/api/contact-message/route");
    const res = await POST(jsonRequest(CONTACT_URL, { ...VALID_CONTACT, mobile: "۰۹۱۲۱۲۳۴۵۶۷" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(saveMock).toHaveBeenCalledTimes(1);
    const saved = saveMock.mock.calls[0][0] as { mobile: string; message: string; source: string };
    expect(saved.mobile).toBe("9121234567");
    expect(saved.message.startsWith("[موضوع: تور]")).toBe(true);
    expect(saved.source).toBe("direct|contact|none");
  });

  it("answers 500 with a human message when storage fails", async () => {
    saveMock.mockRejectedValue(new Error("db down"));
    const { POST } = await import("@/app/api/contact-message/route");
    const res = await POST(jsonRequest(CONTACT_URL, VALID_CONTACT));
    expect(res.status).toBe(500);
    expect((await res.json()) as { ok: boolean }).toMatchObject({ ok: false });
  });
});

describe("GET /api/rates", () => {
  beforeEach(() => {
    ratesLatest.mockReset().mockResolvedValue([{ code: "USD", value: 60000 }]);
    ratesPrevious.mockReset().mockResolvedValue([{ code: "USD", value: 59000 }]);
    ratesHistory.mockReset().mockResolvedValue([]);
    ratesSchedule.mockReset().mockResolvedValue({ next_run: null });
  });

  it("returns the standard ok envelope with four sections", async () => {
    const { GET } = await import("@/app/api/rates/route");
    const res = await GET();
    const payload = (await res.json()) as {
      ok: boolean;
      data: { latest: unknown[]; previous: unknown[]; history: unknown[]; schedule: unknown };
    };
    expect(res.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.data.latest).toHaveLength(1);
    expect(payload.data.previous).toHaveLength(1);
    expect(Array.isArray(payload.data.history)).toBe(true);
    expect(ratesHistory).toHaveBeenCalledWith(7);
  });

  it("returns the failure envelope instead of throwing", async () => {
    ratesLatest.mockRejectedValue(new Error("supabase down"));
    const { GET } = await import("@/app/api/rates/route");
    const res = await GET();
    const payload = (await res.json()) as { ok: boolean; error: { message: string; code: number } };
    expect(res.status).toBe(500);
    expect(payload.ok).toBe(false);
    expect(payload.error.message).toContain("supabase down");
    expect(payload.error.code).toBe(500);
  });
});

describe("POST /api/auth/login", () => {
  const savedEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...savedEnv };
    delete process.env.ADMIN_USERNAME;
    delete process.env.ADMIN_PASSWORD_HASH;
  });

  afterEach(() => {
    process.env = { ...savedEnv };
  });

  it("rejects an unparseable body with 400", async () => {
    const { POST } = await import("@/app/api/auth/login/route");
    const res = await POST(rawRequest(LOGIN_URL, "not-json"));
    expect(res.status).toBe(400);
  });

  it("rejects an empty username or password with 400", async () => {
    const { POST } = await import("@/app/api/auth/login/route");
    const res = await POST(jsonRequest(LOGIN_URL, { username: "admin", password: "" }));
    expect(res.status).toBe(400);
  });

  it("answers 503 and leaks nothing when admin auth is not configured", async () => {
    const { POST } = await import("@/app/api/auth/login/route");
    const res = await POST(jsonRequest(LOGIN_URL, { username: "admin", password: "x" }));
    const payload = (await res.json()) as Record<string, unknown>;
    expect(res.status).toBe(503);
    expect(payload.ok).toBe(false);
    expect(JSON.stringify(payload)).not.toContain("ADMIN_");
  });

  it("rejects wrong credentials with 401 and never echoes the password", async () => {
    process.env.ADMIN_USERNAME = "admin";
    process.env.ADMIN_PASSWORD_HASH = hashSync("correct-horse-battery", 4);
    const { POST } = await import("@/app/api/auth/login/route");
    const res = await POST(jsonRequest(LOGIN_URL, { username: "admin", password: "wrong-password" }));
    const text = JSON.stringify(await res.json());
    expect(res.status).toBe(401);
    expect(text).not.toContain("wrong-password");
    expect(text).not.toContain(hashSync("correct-horse-battery", 4).slice(0, 20));
  });

  it("accepts the right credentials and sets an httpOnly session cookie", async () => {
    process.env.ADMIN_USERNAME = "admin";
    process.env.ADMIN_PASSWORD_HASH = hashSync("correct-horse-battery", 4);
    const { POST } = await import("@/app/api/auth/login/route");
    const res = await POST(
      jsonRequest(LOGIN_URL, { username: "admin", password: "correct-horse-battery" }),
    );
    expect(res.status).toBe(200);
    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie.toLowerCase()).toContain("httponly");
    expect(cookie.toLowerCase()).toContain("samesite=lax");
  });

  it("blocks the sixth attempt from the same IP with 429", async () => {
    process.env.ADMIN_USERNAME = "admin";
    process.env.ADMIN_PASSWORD_HASH = hashSync("correct-horse-battery", 4);
    const { POST } = await import("@/app/api/auth/login/route");
    const headers = { "x-forwarded-for": "203.0.113.77" };
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const res = await POST(
        jsonRequest(LOGIN_URL, { username: "admin", password: `bad-${attempt}` }, { headers }),
      );
      expect(res.status).toBe(401);
    }
    const blocked = await POST(
      jsonRequest(LOGIN_URL, { username: "admin", password: "bad-6" }, { headers }),
    );
    const payload = (await blocked.json()) as { blocked?: boolean };
    expect(blocked.status).toBe(429);
    expect(payload.blocked).toBe(true);
  });
});
