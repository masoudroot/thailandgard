import { google } from 'googleapis';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

type Webmasters = ReturnType<typeof google.webmasters>;

interface GscRow {
  key: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

const SITE_URL = process.env.GSC_SITE_URL ?? 'https://www.thailandgard.ir/';

async function queryRows(
  webmasters: Webmasters,
  dimension: 'query' | 'page',
  startDate: string,
  endDate: string,
): Promise<GscRow[]> {
  const res = await webmasters.searchanalytics.query({
    siteUrl: SITE_URL,
    requestBody: {
      startDate,
      endDate,
      dimensions: [dimension],
      rowLimit: 25000,
      dataState: 'all',
    },
  });
  return (res.data.rows ?? []).map((row) => ({
    key: row.keys?.[0] ?? '',
    clicks: row.clicks ?? 0,
    impressions: row.impressions ?? 0,
    ctr: row.ctr ?? 0,
    position: row.position ?? 0,
  }));
}

function totals(rows: GscRow[]): { clicks: number; impressions: number; ctr: number } {
  const clicks = rows.reduce((sum, row) => sum + row.clicks, 0);
  const impressions = rows.reduce((sum, row) => sum + row.impressions, 0);
  return { clicks, impressions, ctr: impressions > 0 ? clicks / impressions : 0 };
}

function top(rows: GscRow[], limit: number): GscRow[] {
  return [...rows].sort((a, b) => b.clicks - a.clicks).slice(0, limit);
}

async function main(): Promise<void> {
  const credsB64 = process.env.GSC_SERVICE_ACCOUNT_JSON;
  if (!credsB64) {
    throw new Error('GSC_SERVICE_ACCOUNT_JSON is required');
  }
  const credentials = JSON.parse(
    Buffer.from(credsB64, 'base64').toString('utf8'),
  ) as Record<string, unknown>;
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  });
  const webmasters = google.webmasters({ version: 'v3', auth });

  const endDate = new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10);
  const startDate = new Date(Date.now() - 31 * 86400000).toISOString().slice(0, 10);

  const [queryRowsData, pageRows] = await Promise.all([
    queryRows(webmasters, 'query', startDate, endDate),
    queryRows(webmasters, 'page', startDate, endDate),
  ]);

  const capturedAt = new Date().toISOString();
  const payload = {
    site: SITE_URL,
    capturedAt,
    range: { startDate, endDate },
    queryTotals: totals(queryRowsData),
    pageTotals: totals(pageRows),
    rowCounts: { queries: queryRowsData.length, pages: pageRows.length },
    topQueries: top(queryRowsData, 10),
    topPages: top(pageRows, 10),
  };

  const outputDir = path.resolve(process.cwd(), 'factory/baseline');
  await mkdir(outputDir, { recursive: true });
  const outputFile = path.join(
    outputDir,
    `gsc-28d-${capturedAt.replace(/[:.]/g, '-')}.json`,
  );
  await writeFile(outputFile, JSON.stringify(payload, null, 2), 'utf8');
  console.log(JSON.stringify({ outputFile, ...payload }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});