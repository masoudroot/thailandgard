import { describe, expect, it, vi, afterEach } from "vitest";

/**
 * این فایل عمداً هیچ import ایستایی از ماژول‌های Gateway ندارد تا
 * import پویا، نگهبان سرور را از نو اجرا کند. با window تعریف‌شده،
 * import باید با خطای server-only رد شود و بدون window باید موفق
 * باشد؛ یعنی هیچ ماژول Gatewayای در باندل مرورگر قابل اجرا نیست.
 */
describe("r3b server guard", () => {
  afterEach(() => {
    delete (globalThis as Record<string, unknown>)["window"];
    vi.resetModules();
  });

  it("throws when window is defined", async () => {
    (globalThis as Record<string, unknown>)["window"] = {};
    vi.resetModules();
    await expect(
      import("@/lib/factory/gateway/server-guard"),
    ).rejects.toThrow(/server-only/);
  });

  it("loads when window is undefined", async () => {
    delete (globalThis as Record<string, unknown>)["window"];
    vi.resetModules();
    const mod = await import("@/lib/factory/gateway/server-guard");
    expect(mod).toBeDefined();
  });
});
