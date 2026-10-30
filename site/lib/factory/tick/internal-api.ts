/**
 * ابزار مشترک مسیرهای API داخلی، از M4 در R2. فقط با توکن
 * INTERNAL_PUBLISH_TOKEN. این فایل، هیچ مسیری را عمومی نمی‌کند؛
 * Token در env سروری است، نه NEXT_PUBLIC_، و کلید service_role هم
 * سروری است. مسیرهای قدیمی، همین الگو را جداگانه دارند و دست نخورده‌اند.
 */
import type { NextRequest } from "next/server";

export function secretsEqual(a: string, b: string): boolean {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function checkAuth(req: NextRequest): boolean {
  const expected = process.env.INTERNAL_PUBLISH_TOKEN;
  if (!expected) return false;
  const headerToken = req.headers.get("x-internal-publish-token") ?? "";
  const bearer = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const provided = headerToken || bearer;
  return secretsEqual(provided, expected);
}

export interface DbCfg {
  url: string;
  serviceKey: string;
}

export function dbConfig(): DbCfg | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return { url, serviceKey };
}

export async function postgrestGet(cfg: DbCfg, path: string): Promise<unknown[]> {
  const res = await fetch(`${cfg.url}/rest/v1/${path}`, {
    headers: { apikey: cfg.serviceKey, Authorization: `Bearer ${cfg.serviceKey}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`postgrest get ${path} failed with ${res.status}`);
  const data: unknown = await res.json();
  if (!Array.isArray(data)) throw new Error("postgrest did not return an array");
  return data;
}

export async function postgrestWrite(
  cfg: DbCfg,
  method: "POST" | "PATCH",
  path: string,
  body: unknown,
): Promise<unknown[]> {
  const res = await fetch(`${cfg.url}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: cfg.serviceKey,
      Authorization: `Bearer ${cfg.serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`postgrest ${method} ${path} failed with ${res.status}: ${text.slice(0, 300)}`);
  return text ? (JSON.parse(text) as unknown[]) : [];
}

export async function postgrestRpc(cfg: DbCfg, fn: string, body: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(`${cfg.url}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      apikey: cfg.serviceKey,
      Authorization: `Bearer ${cfg.serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`rpc ${fn} failed with ${res.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

export interface DocumentRow {
  id: string;
  slug: string;
  content_type: string;
  canonical_path: string;
  published_version_id: string | null;
  is_test_fixture?: boolean;
}

export interface WorkItemRow {
  id: string;
  work_key: string;
  work_type: string;
  title: string;
  description: string | null;
  status: string;
  content_id: string;
  acceptance_criteria: unknown;
  result_artifact_id: string | null;
  result_version_id: string | null;
  publication_id: string | null;
  last_error: string | null;
  execution_mode: string | null;
  workflow_version: string | null;
  source_id: string | null;
  detail_url: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface ArtifactRow {
  id: string;
  work_item_id: string;
  artifact_type: string;
  schema_version: string;
  payload: unknown;
  artifact_hash: string;
  created_at: string;
}

export interface ApprovalRow {
  id: string;
  work_item_id: string;
  artifact_id: string;
  artifact_hash: string;
  decision: string;
  reviewer_id: string;
  decision_reason: string | null;
  created_at: string;
}

export interface VersionRow {
  id: string;
  content_id: string;
  version_no: number;
  schema_version: string;
  payload: unknown;
  content_hash: string;
  is_test_fixture?: boolean;
}

export interface PublicationRow {
  id: string;
  status: string;
  version_id: string;
  content_id: string;
}
