export interface SupabaseRestConfig {
  url: string;
  key: string;
}

export function readSupabaseRestConfig(): SupabaseRestConfig | null {
  const url =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return { url: url.replace(/\/+$/, ''), key };
}

export async function fetchSupabaseRows<T>(
  table: string,
  search: URLSearchParams,
  config = readSupabaseRestConfig(),
): Promise<T[]> {
  if (!config) {
    throw new Error('SUPABASE_CONFIG_MISSING');
  }
  const query = search.toString();
  const response = await fetch(
    `${config.url}/rest/v1/${table}${query ? `?${query}` : ''}`,
    {
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
      },
      signal: AbortSignal.timeout(15_000),
    },
  );
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(
      `SUPABASE_REQUEST_FAILED ${table} ${response.status} ${body.slice(0, 200)}`,
    );
  }
  const data: unknown = await response.json();
  if (!Array.isArray(data)) {
    throw new Error(`SUPABASE_INVALID_RESPONSE ${table}`);
  }
  return data as T[];
}
