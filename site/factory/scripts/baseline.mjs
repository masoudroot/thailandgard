import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const url = process.argv[2] ?? 'https://thailandgard.ir/sitemap.xml';
const response = await fetch(url, {
  headers: { 'user-agent': 'thailandgard-factory-baseline/1.0' },
  signal: AbortSignal.timeout(30_000),
});

if (!response.ok) {
  throw new Error(`Baseline fetch failed: ${response.status} ${response.statusText}`);
}

const body = await response.text();
const sha = createHash('sha256').update(body).digest('hex');
const gitSha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const capturedAt = new Date().toISOString();
const outputDir = path.resolve(process.cwd(), 'factory/baseline');
const outputFile = path.join(outputDir, `${capturedAt.replace(/[:.]/g, '-')}.json`);

await mkdir(outputDir, { recursive: true });
await writeFile(
  outputFile,
  JSON.stringify({ url, gitSha, capturedAt, sha256: sha, bytes: Buffer.byteLength(body) }, null, 2),
  'utf8',
);

console.log(outputFile);
