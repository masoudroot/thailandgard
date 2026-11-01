/**
 * تست شکل Migration نسخهٔ دوم (M5): فایل Migration باید ستون
 * superseded_by، Trigger تعلق، تابع تغییرناپذیریِ به‌روز، هر دو Function
 * تازه و Grant فقط-service_role را داشته باشد و هیچ دستور مخربی
 * (حذف جدول، حذف ردیف) و هیچ تغییری روی Functionهای نسخهٔ اول نداشته
 * باشد. رفتار واقعی Functionها، با اجرای آزمایشیِ برگشت‌پذیر روی
 * Staging (تراکنش + ROLLBACK) جداگانه راستی شده است و این‌جا فقط شکل
 * فایل، در CI، نگهبانی می‌شود.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SITE_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const MIGRATION = path.join(
  SITE_ROOT,
  "..",
  "supabase",
  "migrations",
  "20261101000000_publish_v2_superseded_by.sql",
);

describe("publish-v2 migration shape", () => {
  it("contains the superseded_by chain, both v2 functions, and service_role-only grants", () => {
    const sql = readFileSync(MIGRATION, "utf8");
    for (const needle of [
      "superseded_by",
      "content_versions_superseded_by_must_belong",
      "content_versions_immutable",
      "publish_v2_content_atomic",
      "create_approved_version_v2",
      "grant execute",
      "to service_role",
      "revoke execute",
    ]) {
      expect(sql, `migration must contain ${needle}`).toContain(needle);
    }
  });

  it("has no destructive statement and does not touch the v1 functions", () => {
    const sql = readFileSync(MIGRATION, "utf8");
    for (const forbidden of ["drop table", "delete from", "truncate", "publish_content_atomic(", "create_approved_version("]) {
      expect(sql, `migration must not contain ${forbidden}`).not.toContain(forbidden);
    }
  });
});
