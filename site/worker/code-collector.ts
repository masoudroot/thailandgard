/**
 * worker/code-collector.ts: Ø³Ù†Ø¯Ø¨Ø§Ú©Ø³ Ø§Ù…Ù† ØªÙˆÙ„ÛŒØ¯ Ú©Ø¯ ØªÙˆØ³Ø· ØªÛŒÙ…â€ŒÙ‡Ø§.
 *
 * Ù…Ø³Ø¦Ù„Ù‡: ØªÛŒÙ…â€ŒÙ‡Ø§ Ø¯Ø± GitHub Actions Ø§Ø¬Ø±Ø§ Ù…ÛŒâ€ŒØ´ÙˆÙ†Ø¯ Ùˆ ÙÙ‚Ø· Ú¯Ø²Ø§Ø±Ø´ Ù…ØªÙ†ÛŒ ØªÙˆÙ„ÛŒØ¯ Ù…ÛŒâ€ŒÚ©Ù†Ù†Ø¯Ø›
 * Ù‡ÛŒÚ† Ù¾Ù„ÛŒ Ø¨ÛŒÙ† Ø®Ø±ÙˆØ¬ÛŒ ØªÛŒÙ… Ùˆ Ø±ÛŒÙ¾ÙˆÛŒ Ø³Ø§ÛŒØª (masoudroot/thailandgard) Ù†ÛŒØ³Øª.
 *
 * Ø§ÛŒÙ† Ù…Ø§Ú˜ÙˆÙ„ Ø¢Ù† Ù¾Ù„ Ø±Ø§ Ø§Ù…Ù† Ù…ÛŒâ€ŒÚ©Ù†Ø¯:
 *  Û±. ØªÛŒÙ…â€ŒÙ‡Ø§ ÙØ§ÛŒÙ„â€ŒÙ‡Ø§ÛŒ Ú©Ø¯ Ø±Ø§ ÙÙ‚Ø· Ø§Ø² Ø·Ø±ÛŒÙ‚ writeTeamCodeFile Ù…ÛŒâ€ŒÙ†ÙˆÛŒØ³Ù†Ø¯
 *     (Ø¯Ø± code-output/<team>/ Ø¯Ø§Ø®Ù„ workspace Ø±Ø§Ù†Ø±Ø› Ù…Ø­Ø¯ÙˆØ¯ÛŒØª Ø­Ø¬Ù… Ùˆ Ù¾Ø³ÙˆÙ†Ø¯ Ù‡Ù…Ø§Ù†â€ŒØ¬Ø§ Ø§Ø¹Ù…Ø§Ù„ Ù…ÛŒâ€ŒØ´ÙˆØ¯).
 *  Û². Ø¨Ø¹Ø¯ Ø§Ø² Ø§Ø¬Ø±Ø§ÛŒ ØªÛŒÙ…ØŒ collectAndCommitTeamCode ÙØ§ÛŒÙ„â€ŒÙ‡Ø§ÛŒ ÙˆØ§Ù‚Ø¹ÛŒ Ø±ÙˆÛŒ Ø¯ÛŒØ³Ú© Ø±Ø§
 *     Ù…ÛŒâ€ŒØ®ÙˆØ§Ù†Ø¯ (Ù†Ù‡ Ø§Ø¯Ø¹Ø§ÛŒ Ù…ØªÙ†ÛŒ ØªÛŒÙ… Ø±Ø§)ØŒ Ù‡Ø´ SHA-256 Ù…ÛŒâ€ŒÚ¯ÛŒØ±Ø¯ØŒ Ø¨Ø§ Ù…Ø§Ù†ÛŒÙØ³Øª Ø§Ø¹Ù„Ø§Ù…â€ŒØ´Ø¯Ù‡
 *     ØªÛŒÙ… ØªØ·Ø¨ÛŒÙ‚ Ù…ÛŒâ€ŒØ¯Ù‡Ø¯ØŒ Ø³ÛŒÙ†ØªÚ©Ø³ Ø±Ø§ Ú†Ú© Ù…ÛŒâ€ŒÚ©Ù†Ø¯ Ùˆ Ù…ØªØ§Ø¯ÛŒØªØ§ Ø±Ø§ Ø¯Ø± Ø¯ÛŒØªØ§Ø¨ÛŒØ³ Ø«Ø¨Øª Ù…ÛŒâ€ŒÚ©Ù†Ø¯.
 *  Û³. ÙÙ‚Ø· ÙˆÙ‚ØªÛŒ Ù…Ù†ØªÙ‚Ø¯ ØªÛŒÙ… Ø±Ø§ ØªØ£ÛŒÛŒØ¯ Ú©Ø±Ø¯Ù‡ (approved=true) Ùˆ Ù‡Ù…Ù‡â€ŒÛŒ Ú¯ÛŒØªâ€ŒÙ‡Ø§ Ø³Ø¨Ø²Ù†Ø¯ØŒ
 *     ÙØ§ÛŒÙ„â€ŒÙ‡Ø§ Ø±ÙˆÛŒ Ø´Ø§Ø®Ù‡â€ŒÛŒ team/<team>/<run-id> Ø¯Ø± Ø±ÛŒÙ¾ÙˆÛŒ Ø³Ø§ÛŒØª Ú©Ø§Ù…ÛŒØª Ù…ÛŒâ€ŒØ´ÙˆÙ†Ø¯.
 *
 * Ù‚Ø§Ù†ÙˆÙ† Ø¶Ø¯ØªÙˆÙ‡Ù…: Ú©Ø§Ù„Ú©ØªÙˆØ± Ù‡Ø±Ú¯Ø² Ø¨Ù‡ Ø­Ø±Ù ØªÛŒÙ… Ø§Ø¹ØªÙ…Ø§Ø¯ Ù†Ù…ÛŒâ€ŒÚ©Ù†Ø¯Ø› ÙÙ‚Ø· Ø¨Ø§ÛŒØªâ€ŒÙ‡Ø§ÛŒ ÙˆØ§Ù‚Ø¹ÛŒ
 * Ø±ÙˆÛŒ Ø¯ÛŒØ³Ú© Ù…Ø¨Ù†Ø§Ø³Øª Ùˆ Ù‡Ø´ Ù‡Ø± ÙØ§ÛŒÙ„ Ø¯Ø± Ø¯ÛŒØªØ§Ø¨ÛŒØ³ Ø«Ø¨Øª Ù…ÛŒâ€ŒØ´ÙˆØ¯ ØªØ§ Ù‚Ø§Ø¨Ù„ Ø­Ø³Ø§Ø¨Ø±Ø³ÛŒ Ø¨Ø§Ø´Ø¯.
 */

import { createHash } from 'node:crypto';
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, normalize, relative, resolve, sep } from 'node:path';
import type { TeamName } from '../lib/dashboard/types';

/** Ø±ÛŒÙ¾ÙˆÛŒ Ø³Ø§ÛŒØªØ› Ø¬Ø§ÛŒÛŒ Ú©Ù‡ Ú©Ø¯ ØªÛŒÙ…â€ŒÙ‡Ø§ Ø¨Ø§ÛŒØ¯ Ø¨Ù†Ø´ÛŒÙ†Ø¯. */
export const SITE_REPO = 'masoudroot/thailandgard';
/** Ø´Ø§Ø®Ù‡â€ŒÛŒ Ù¾ÛŒØ´â€ŒÙØ±Ø¶ Ø±ÛŒÙ¾ÙˆÛŒ Ø³Ø§ÛŒØª Ú©Ù‡ Ú©Ø§Ù…ÛŒØªâ€ŒÙ‡Ø§ Ø§Ø² Ø±ÙˆÛŒ Ø¢Ù† Ø³Ø§Ø®ØªÙ‡ Ù…ÛŒâ€ŒØ´ÙˆÙ†Ø¯. */
const SITE_BASE_BRANCH = 'master';

/** Ù…Ø­Ø¯ÙˆØ¯ÛŒØªâ€ŒÙ‡Ø§ÛŒ Ø³Ù†Ø¯Ø¨Ø§Ú©Ø³. */
export const SANDBOX_LIMITS = {
  /** Ø­Ø¯Ø§Ú©Ø«Ø± ØªØ¹Ø¯Ø§Ø¯ ÙØ§ÛŒÙ„ Ø¯Ø± Ù‡Ø± Ø§Ø¬Ø±Ø§ÛŒ ÛŒÚ© ØªÛŒÙ…. */
  maxFiles: 10,
  /** Ø­Ø¯Ø§Ú©Ø«Ø± Ø­Ø¬Ù… Ù‡Ø± ÙØ§ÛŒÙ„ (Ø¨Ø§ÛŒØª). */
  maxFileBytes: 100 * 1024,
  /** Ø­Ø¯Ø§Ú©Ø«Ø± Ø­Ø¬Ù… Ù…Ø¬Ù…ÙˆØ¹ ÙØ§ÛŒÙ„â€ŒÙ‡Ø§ (Ø¨Ø§ÛŒØª). */
  maxTotalBytes: 512 * 1024,
  /** Ø­Ø¯Ø§Ú©Ø«Ø± Ø®Ø· Ù‡Ø± ÙØ§ÛŒÙ„. */
  maxLinesPerFile: 2000,
  /** Ù¾Ø³ÙˆÙ†Ø¯Ù‡Ø§ÛŒ Ù…Ø¬Ø§Ø²Ø› Ø¨Ø§ÛŒÙ†Ø±ÛŒ Ùˆ Ø§Ø¬Ø±Ø§ÛŒÛŒ Ù…Ù…Ù†ÙˆØ¹. */
  allowedExtensions: ['.ts', '.tsx', '.js', '.jsx', '.css', '.scss', '.md', '.mdx', '.json', '.html'] as const,
} as const;

export interface CollectedFile {
  /** Ù…Ø³ÛŒØ± Ù†Ø³Ø¨ÛŒ Ø¯Ø§Ø®Ù„ Ø±ÛŒÙ¾ÙˆÛŒ Ø³Ø§ÛŒØªØŒ Ù…Ø«Ù„ site/components/Hero.tsx */
  path: string;
  sha256: string;
  bytes: number;
  lines: number;
  syntaxOk: boolean;
}

export interface CollectionResult {
  team: TeamName;
  runId: string;
  files: CollectedFile[];
  /** Ù†Ø§Ù… ÙØ§ÛŒÙ„â€ŒÙ‡Ø§ÛŒÛŒ Ú©Ù‡ ØªÛŒÙ… Ø§Ø¯Ø¹Ø§ Ú©Ø±Ø¯Ù‡ ÙˆÙ„ÛŒ Ø±ÙˆÛŒ Ø¯ÛŒØ³Ú© Ù†ÛŒØ³Øª ÛŒØ§ Ù‡Ø´Ø´Ø§Ù† Ù†Ù…ÛŒâ€ŒØ®ÙˆØ§Ù†Ø¯. */
  manifestMismatches: string[];
  /** ÙØ§ÛŒÙ„â€ŒÙ‡Ø§ÛŒÛŒ Ú©Ù‡ Ø¨Ù‡â€ŒØ®Ø§Ø·Ø± Ù†Ù‚Ø¶ Ù…Ø­Ø¯ÙˆØ¯ÛŒØª Ø±Ø¯ Ø´Ø¯Ù†Ø¯. */
  rejected: Array<{ path: string; reason: string }>;
  pushed: boolean;
  branch?: string;
  commitSha?: string;
  compareUrl?: string;
  skippedReason?: string;
}

export interface CollectOptions {
  team: TeamName;
  runId: string;
  /** Ø´Ù†Ø§Ø³Ù‡â€ŒÛŒ Ø±Ø¯ÛŒÙ team_runs Ø¨Ø±Ø§ÛŒ Ø«Ø¨Øª Ù…ØªØ§Ø¯ÛŒØªØ§Ø› Ø§Ú¯Ø± null Ø¨Ø§Ø´Ø¯ ÙÙ‚Ø· Ù„Ø§Ú¯ Ù…ÛŒâ€ŒØ´ÙˆØ¯. */
  cycleId?: string | null;
  /** ÙÙ‚Ø· ÙˆÙ‚ØªÛŒ Ù…Ù†ØªÙ‚Ø¯ ØªØ£ÛŒÛŒØ¯ Ú©Ø±Ø¯Ù‡ØŒ push Ø§Ù†Ø¬Ø§Ù… Ù…ÛŒâ€ŒØ´ÙˆØ¯. */
  approved: boolean;
  /** Ù…Ø§Ù†ÛŒÙØ³Øª Ø§Ø¹Ù„Ø§Ù…â€ŒØ´Ø¯Ù‡â€ŒÛŒ ØªÛŒÙ…: [{path, sha256}]Ø› Ø¨Ø±Ø§ÛŒ ØªØ·Ø¨ÛŒÙ‚ Ø¶Ø¯ØªÙˆÙ‡Ù…. */
  declaredFiles?: Array<{ path: string; sha256?: string }>;
  /** Ø¯Ø§ÛŒØ±Ú©ØªÙˆØ±ÛŒ Ø®Ø±ÙˆØ¬ÛŒØ› Ù¾ÛŒØ´â€ŒÙØ±Ø¶ <cwd>/code-output/<team>. */
  outputDir?: string;
  targetRepo?: string;
  /** ØªÙˆÚ©Ù†Ø› Ù¾ÛŒØ´â€ŒÙØ±Ø¶ env â€SITE_GITHUB_TOKENâ€ Ùˆ Ø¨Ø¹Ø¯ GITHUB_TOKEN. */
  token?: string;
  dryRun?: boolean;
}

/** Ø±ÛŒØ´Ù‡â€ŒÛŒ Ø®Ø±ÙˆØ¬ÛŒ Ú©Ø¯ Ø¨Ø±Ø§ÛŒ ÛŒÚ© ØªÛŒÙ…. */
export function teamOutputDir(team: TeamName, base?: string): string {
  return resolve(base ?? process.cwd(), 'code-output', team);
}

/** Ø§Ø¹ØªØ¨Ø§Ø±Ø³Ù†Ø¬ÛŒ Ù…Ø³ÛŒØ± Ù†Ø³Ø¨ÛŒ: Ø¨Ø¯ÙˆÙ† ..ØŒ Ø¨Ø¯ÙˆÙ† Ù…Ø³ÛŒØ± Ù…Ø·Ù„Ù‚ØŒ Ø¨Ø¯ÙˆÙ† Ø¯Ø§ÛŒØ±Ú©ØªÙˆØ±ÛŒ Ù…Ø®ÙÛŒ/Ø³ÛŒØ³ØªÙ…ÛŒ. */
function sanitizeRelPath(relPath: string): string {
  const clean = relPath.trim().replace(/^[/\\]+/, '');
  if (!clean) throw new Error('Ù…Ø³ÛŒØ± ÙØ§ÛŒÙ„ Ø®Ø§Ù„ÛŒ Ø§Ø³Øª.');
  const norm = normalize(clean);
  if (norm === '.' || norm.startsWith('..') || normalize(relative('.', norm)).startsWith('..')) {
    throw new Error(`Ù…Ø³ÛŒØ± ØºÛŒØ±Ù…Ø¬Ø§Ø² (ÙØ±Ø§Ø± Ø§Ø² Ø³Ù†Ø¯Ø¨Ø§Ú©Ø³): ${relPath}`);
  }
  const parts = norm.split(sep);
  for (const p of parts) {
    if (!p || p === '.' || p === '..') throw new Error(`Ø¨Ø®Ø´ Ù†Ø§Ù…Ø¹ØªØ¨Ø± Ø¯Ø± Ù…Ø³ÛŒØ±: ${relPath}`);
    if (p.startsWith('.')) throw new Error(`ÙØ§ÛŒÙ„/Ø¯Ø§ÛŒØ±Ú©ØªÙˆØ±ÛŒ Ù…Ø®ÙÛŒ Ù…Ù…Ù†ÙˆØ¹: ${relPath}`);
    if (p === 'node_modules' || p === '.git') throw new Error(`Ø¯Ø§ÛŒØ±Ú©ØªÙˆØ±ÛŒ Ø³ÛŒØ³ØªÙ…ÛŒ Ù…Ù…Ù†ÙˆØ¹: ${relPath}`);
  }
  if (clean.toLowerCase().includes('.env')) throw new Error(`ÙØ§ÛŒÙ„ Ù…Ø­ÛŒØ·ÛŒ Ù…Ù…Ù†ÙˆØ¹: ${relPath}`);
  const lower = norm.toLowerCase();
  const ok = (SANDBOX_LIMITS.allowedExtensions as readonly string[]).some((e) => lower.endsWith(e));
  if (!ok) throw new Error(`Ù¾Ø³ÙˆÙ†Ø¯ ØºÛŒØ±Ù…Ø¬Ø§Ø²: ${relPath}`);
  return norm.split(sep).join('/');
}

function countLines(text: string): number {
  if (!text) return 0;
  return text.split('\n').length;
}

/**
 * Ù†ÙˆØ´ØªÙ† Ø§Ù…Ù† ÙØ§ÛŒÙ„ Ú©Ø¯ ØªÙˆØ³Ø· ØªÛŒÙ…. Ù…Ø­Ø¯ÙˆØ¯ÛŒØªâ€ŒÙ‡Ø§ Ù‡Ù…ÛŒÙ†â€ŒØ¬Ø§ Ø§Ø¹Ù…Ø§Ù„ Ù…ÛŒâ€ŒØ´ÙˆÙ†Ø¯ ØªØ§ ØªÛŒÙ…
 * Ù†ØªÙˆØ§Ù†Ø¯ Ø¨ÛŒØ´ØªØ± Ø§Ø² Ø³Ù‚Ù Ø³Ù†Ø¯Ø¨Ø§Ú©Ø³ ØªÙˆÙ„ÛŒØ¯ Ú©Ù†Ø¯.
 */
export function writeTeamCodeFile(team: TeamName, relPath: string, content: string, base?: string): string {
  const safe = sanitizeRelPath(relPath);
  const bytes = Buffer.byteLength(content, 'utf-8');
  if (bytes > SANDBOX_LIMITS.maxFileBytes) {
    throw new Error(`Ø­Ø¬Ù… ÙØ§ÛŒÙ„ Ø¨ÛŒØ´ Ø§Ø² Ø³Ù‚Ù (${SANDBOX_LIMITS.maxFileBytes} Ø¨Ø§ÛŒØª): ${safe}`);
  }
  const lines = countLines(content);
  if (lines > SANDBOX_LIMITS.maxLinesPerFile) {
    throw new Error(`ØªØ¹Ø¯Ø§Ø¯ Ø®Ø· Ø¨ÛŒØ´ Ø§Ø² Ø³Ù‚Ù (${SANDBOX_LIMITS.maxLinesPerFile}): ${safe}`);
  }
  const dir = teamOutputDir(team, base);
  const existing = listOutputFiles(dir);
  if (existing.length >= SANDBOX_LIMITS.maxFiles) {
    throw new Error(`Ø³Ù‚Ù ØªØ¹Ø¯Ø§Ø¯ ÙØ§ÛŒÙ„ (${SANDBOX_LIMITS.maxFiles}) Ø¨Ø±Ø§ÛŒ ØªÛŒÙ… ${team} Ù¾Ø± Ø´Ø¯Ù‡ Ø§Ø³Øª.`);
  }
  const total = existing.reduce((n, f) => n + f.bytes, 0);
  if (total + bytes > SANDBOX_LIMITS.maxTotalBytes) {
    throw new Error(`Ø­Ø¬Ù… Ù…Ø¬Ù…ÙˆØ¹ ÙØ§ÛŒÙ„â€ŒÙ‡Ø§ Ø¨ÛŒØ´ Ø§Ø² Ø³Ù‚Ù (${SANDBOX_LIMITS.maxTotalBytes} Ø¨Ø§ÛŒØª).`);
  }
  const full = join(dir, safe);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content, 'utf-8');
  return safe;
}

interface RawFile {
  relPath: string;
  fullPath: string;
  bytes: number;
}

/** ÙÙ‡Ø±Ø³Øª ÙØ§ÛŒÙ„â€ŒÙ‡Ø§ÛŒ Ø®Ø±ÙˆØ¬ÛŒ ÛŒÚ© ØªÛŒÙ… Ø±ÙˆÛŒ Ø¯ÛŒØ³Ú© (ÙÙ‚Ø· Ø®ÙˆØ§Ù†Ø¯Ù†ØŒ Ø¨Ø¯ÙˆÙ† Ø§Ø¹ØªÙ…Ø§Ø¯ Ø¨Ù‡ Ø§Ø¯Ø¹Ø§). */
function listOutputFiles(dir: string): RawFile[] {
  const out: RawFile[] = [];
  const walk = (d: string): void => {
    let entries: string[];
    try {
      entries = readdirSync(d);
    } catch {
      return;
    }
    for (const e of entries) {
      const full = join(d, e);
      let st;
      try {
        st = statSync(full);
      } catch {
        continue;
      }
      if (st.isDirectory()) {
        if (e.startsWith('.') || e === 'node_modules') continue;
        walk(full);
      } else if (st.isFile()) {
        out.push({ relPath: relative(dir, full).split(sep).join('/'), fullPath: full, bytes: st.size });
      }
    }
  };
  walk(dir);
  return out.sort((a, b) => (a.relPath < b.relPath ? -1 : 1));
}

function sha256Hex(data: string | Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Ú¯ÛŒØª Ø³ÛŒÙ†ØªÚ©Ø³ Ø¨Ø±Ø§ÛŒ ÙØ§ÛŒÙ„â€ŒÙ‡Ø§ÛŒ TS/JS Ø¨Ø§ transpileModule (Ø¨Ø¯ÙˆÙ† type-checkØ› ÙÙ‚Ø·
 * Ø®Ø·Ø§ÛŒ Ù†Ø­ÙˆÛŒ). Ø§Ú¯Ø± typescript Ø¯Ø± Ø¯Ø³ØªØ±Ø³ Ù†Ø¨ÙˆØ¯ØŒ Ú†Ú© Ø±Ø¯ Ù…ÛŒâ€ŒØ´ÙˆØ¯ ÙˆÙ„ÛŒ ÙØ§ÛŒÙ„ Ø¨Ù„Ø§Ú© Ù†Ù…ÛŒâ€ŒØ´ÙˆØ¯Ø›
 * Ø¯Ø± Ù†ØªÛŒØ¬Ù‡ syntaxOk=false Ø«Ø¨Øª Ù…ÛŒâ€ŒØ´ÙˆØ¯ ØªØ§ Ù‚Ø§Ø¨Ù„ Ø­Ø³Ø§Ø¨Ø±Ø³ÛŒ Ø¨Ø§Ø´Ø¯.
 */
async function syntaxCheck(relPath: string, content: string): Promise<boolean> {
  const lower = relPath.toLowerCase();
  const isCode = ['.ts', '.tsx', '.js', '.jsx'].some((e) => lower.endsWith(e));
  if (!isCode) return true;
  try {
    const ts = (await import('typescript')) as typeof import('typescript');
    const out = ts.transpileModule(content, {
      compilerOptions: { jsx: ts.JsxEmit.Preserve, target: ts.ScriptTarget.ESNext },
      reportDiagnostics: true,
    });
    const errors = (out.diagnostics ?? []).filter((d) => d.category === ts.DiagnosticCategory.Error);
    return errors.length === 0;
  } catch {
    return false;
  }
}

function ghHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  };
}

/**
 * Ù¾ÙˆØ´ ÙØ§ÛŒÙ„â€ŒÙ‡Ø§ Ø¨Ù‡ Ø±ÛŒÙ¾ÙˆÛŒ Ø³Ø§ÛŒØª Ø¨Ø§ GitHub git-database API:
 * blob â† tree â† commit â† Ø¨Ù‡â€ŒØ±ÙˆØ²Ø±Ø³Ø§Ù†ÛŒ ref Ø´Ø§Ø®Ù‡.
 * Ù‡Ù…ÛŒØ´Ù‡ Ø±ÙˆÛŒ Ø´Ø§Ø®Ù‡â€ŒÛŒ ØªØ§Ø²Ù‡â€ŒÛŒ team/<team>/<run-id> Ø§Ø² Ø±ÙˆÛŒ master.
 */
async function pushToSiteRepo(opts: {
  token: string;
  repo: string;
  team: TeamName;
  runId: string;
  files: Array<{ path: string; content: string }>;
}): Promise<{ branch: string; commitSha: string; compareUrl: string }> {
  const { token, repo, team, runId, files } = opts;
  const h = ghHeaders(token);
  const api = `https://api.github.com/repos/${repo}`;
  const branch = `team/${team}/${runId}`;

  const refRes = await fetch(`${api}/git/refs/heads/${SITE_BASE_BRANCH}`, {
    headers: h,
    signal: AbortSignal.timeout(15_000),
  });
  if (!refRes.ok) throw new Error(`Ø®ÙˆØ§Ù†Ø¯Ù† Ø±Ø£Ø³ ${SITE_BASE_BRANCH} Ù†Ø§Ù…ÙˆÙÙ‚ Ø¨ÙˆØ¯ (${refRes.status}).`);
  const refBody = (await refRes.json()) as { object?: { sha?: string } };
  const baseSha = refBody.object?.sha;
  if (!baseSha) throw new Error('SHA Ø±Ø£Ø³ Ø´Ø§Ø®Ù‡â€ŒÛŒ Ù¾Ø§ÛŒÙ‡ Ù¾ÛŒØ¯Ø§ Ù†Ø´Ø¯.');

  // Ø§Ú¯Ø± Ø´Ø§Ø®Ù‡ Ø§Ø² Ø§Ø¬Ø±Ø§ÛŒ Ù‚Ø¨Ù„ÛŒ Ù…Ø§Ù†Ø¯Ù‡ØŒ Ù‡Ù…Ø§Ù† Ø±Ø§ Ø¨Ù‡â€ŒØ±ÙˆØ² Ù…ÛŒâ€ŒÚ©Ù†ÛŒÙ…Ø› ÙˆÚ¯Ø±Ù†Ù‡ Ù…ÛŒâ€ŒØ³Ø§Ø²ÛŒÙ….
  const existing = await fetch(`${api}/git/refs/heads/${branch}`, {
    headers: h,
    signal: AbortSignal.timeout(15_000),
  });
  if (existing.status === 404) {
    const mk = await fetch(`${api}/git/refs`, {
      method: 'POST',
      headers: h,
      body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: baseSha }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!mk.ok) throw new Error(`Ø³Ø§Ø®Øª Ø´Ø§Ø®Ù‡ Ù†Ø§Ù…ÙˆÙÙ‚ Ø¨ÙˆØ¯ (${mk.status}).`);
  } else if (!existing.ok) {
    throw new Error(`Ø¨Ø±Ø±Ø³ÛŒ Ø´Ø§Ø®Ù‡ Ù†Ø§Ù…ÙˆÙÙ‚ Ø¨ÙˆØ¯ (${existing.status}).`);
  }

  const blobs: Array<{ path: string; sha: string }> = [];
  for (const f of files) {
    const bRes = await fetch(`${api}/git/blobs`, {
      method: 'POST',
      headers: h,
      body: JSON.stringify({ content: f.content, encoding: 'utf-8' }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!bRes.ok) throw new Error(`Ø³Ø§Ø®Øª Ø¨Ù„Ø§Ø¨ Ø¨Ø±Ø§ÛŒ Â«${f.path}Â» Ù†Ø§Ù…ÙˆÙÙ‚ Ø¨ÙˆØ¯ (${bRes.status}).`);
    const bBody = (await bRes.json()) as { sha?: string };
    if (!bBody.sha) throw new Error(`SHA Ø¨Ù„Ø§Ø¨ Ø¨Ø±Ø§ÛŒ Â«${f.path}Â» Ø¨Ø±Ù†Ú¯Ø´Øª.`);
    blobs.push({ path: f.path, sha: bBody.sha });
  }

  const tRes = await fetch(`${api}/git/trees`, {
    method: 'POST',
    headers: h,
    body: JSON.stringify({
      base_tree: baseSha,
      tree: blobs.map((b) => ({ path: b.path, mode: '100644', type: 'blob', sha: b.sha })),
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!tRes.ok) throw new Error(`Ø³Ø§Ø®Øª Ø¯Ø±Ø®Øª Ú¯ÛŒØª Ù†Ø§Ù…ÙˆÙÙ‚ Ø¨ÙˆØ¯ (${tRes.status}).`);
  const tBody = (await tRes.json()) as { sha?: string };
  if (!tBody.sha) throw new Error('SHA Ø¯Ø±Ø®Øª Ø¨Ø±Ù†Ú¯Ø´Øª.');

  const cRes = await fetch(`${api}/git/commits`, {
    method: 'POST',
    headers: h,
    body: JSON.stringify({
      message: `team(${team}): Ø®Ø±ÙˆØ¬ÛŒ Ú©Ø¯ Ú†Ø±Ø®Ù‡ ${runId}`,
      tree: tBody.sha,
      parents: [baseSha],
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!cRes.ok) throw new Error(`Ø³Ø§Ø®Øª Ú©Ø§Ù…ÛŒØª Ù†Ø§Ù…ÙˆÙÙ‚ Ø¨ÙˆØ¯ (${cRes.status}).`);
  const cBody = (await cRes.json()) as { sha?: string };
  if (!cBody.sha) throw new Error('SHA Ú©Ø§Ù…ÛŒØª Ø¨Ø±Ù†Ú¯Ø´Øª.');

  const uRes = await fetch(`${api}/git/refs/heads/${branch}`, {
    method: 'PATCH',
    headers: h,
    body: JSON.stringify({ sha: cBody.sha, force: false }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!uRes.ok) throw new Error(`Ø¨Ù‡â€ŒØ±ÙˆØ²Ø±Ø³Ø§Ù†ÛŒ Ø´Ø§Ø®Ù‡ Ù†Ø§Ù…ÙˆÙÙ‚ Ø¨ÙˆØ¯ (${uRes.status}).`);

  return {
    branch,
    commitSha: cBody.sha.slice(0, 7),
    compareUrl: `https://github.com/${repo}/compare/${SITE_BASE_BRANCH}...${branch}`,
  };
}

/** Ø«Ø¨Øª Ù…ØªØ§Ø¯ÛŒØªØ§ÛŒ ÙØ§ÛŒÙ„â€ŒÙ‡Ø§ Ø¯Ø± Ø¯ÛŒØªØ§Ø¨ÛŒØ³ Ø¨Ø±Ø§ÛŒ Ø­Ø³Ø§Ø¨Ø±Ø³ÛŒ. */
async function recordFiles(
  cycleId: string | null | undefined,
  team: TeamName,
  runId: string,
  files: CollectedFile[],
  repo: string,
  push?: { branch: string; commitSha: string },
): Promise<void> {
  if (!cycleId) return;
  try {
    const { getSupabase } = await import('../lib/dashboard/api');
    const sb = getSupabase();
    const rows = files.map((f) => ({
      cycle_id: cycleId,
      team,
      run_id: runId,
      path: f.path,
      sha256: f.sha256,
      bytes: f.bytes,
      lines: f.lines,
      target_repo: repo,
      branch: push?.branch ?? null,
      commit_sha: push?.commitSha ?? null,
      pushed_at: push ? new Date().toISOString() : null,
    }));
    const { error } = await sb.from('team_code_files').insert(rows);
    if (error) console.error('[code-collector] Ø«Ø¨Øª Ù…ØªØ§Ø¯ÛŒØªØ§ Ù†Ø§Ù…ÙˆÙÙ‚ Ø¨ÙˆØ¯:', error.message);
  } catch (err) {
    console.error('[code-collector] Ø®Ø·Ø§ Ø¯Ø± Ø«Ø¨Øª Ù…ØªØ§Ø¯ÛŒØªØ§:', err instanceof Error ? err.message : String(err));
  }
}

/**
 * Ù†Ù‚Ø·Ù‡â€ŒÛŒ ÙˆØ±ÙˆØ¯ Ø§ØµÙ„ÛŒ: Ø¬Ù…Ø¹â€ŒØ¢ÙˆØ±ÛŒØŒ Ø±Ø§Ø³ØªÛŒâ€ŒØ¢Ø²Ù…Ø§ÛŒÛŒ Ùˆ (Ø¯Ø± ØµÙˆØ±Øª ØªØ£ÛŒÛŒØ¯) Ù¾ÙˆØ´ Ú©Ø¯ ØªÛŒÙ….
 *
 * ØªØ±ØªÛŒØ¨ Ú¯ÛŒØªâ€ŒÙ‡Ø§:
 *  Û±. ÙØ§ÛŒÙ„ Ø±ÙˆÛŒ Ø¯ÛŒØ³Ú© Ù‡Ø³ØªØŸ (Ù†Ù‡ Ø§Ø¯Ø¹Ø§ÛŒ ØªÛŒÙ…)
 *  Û². Ù…Ø­Ø¯ÙˆØ¯ÛŒØªâ€ŒÙ‡Ø§ÛŒ Ø³Ù†Ø¯Ø¨Ø§Ú©Ø³ (ØªØ¹Ø¯Ø§Ø¯ØŒ Ø­Ø¬Ù…ØŒ Ø®Ø·ØŒ Ù¾Ø³ÙˆÙ†Ø¯ØŒ Ù…Ø³ÛŒØ±)
 *  Û³. ØªØ·Ø¨ÛŒÙ‚ Ø¨Ø§ Ù…Ø§Ù†ÛŒÙØ³Øª Ø§Ø¹Ù„Ø§Ù…â€ŒØ´Ø¯Ù‡â€ŒÛŒ ØªÛŒÙ… (Ø§Ú¯Ø± Ø¯Ø§Ø¯Ù‡ Ø´Ø¯Ù‡)
 *  Û´. Ø³ÛŒÙ†ØªÚ©Ø³ ÙØ§ÛŒÙ„â€ŒÙ‡Ø§ÛŒ Ú©Ø¯
 *  Ûµ. ØªØ£ÛŒÛŒØ¯ Ù…Ù†ØªÙ‚Ø¯ (approved) â† ÙÙ‚Ø· Ø¯Ø± Ø§ÛŒÙ† ØµÙˆØ±Øª push
 */
export async function collectAndCommitTeamCode(options: CollectOptions): Promise<CollectionResult> {
  const {
    team,
    runId,
    cycleId,
    approved,
    declaredFiles,
    outputDir,
    targetRepo = SITE_REPO,
    dryRun = false,
  } = options;
  const token = options.token ?? process.env.SITE_GITHUB_TOKEN ?? process.env.GITHUB_TOKEN ?? null;

  const result: CollectionResult = {
    team,
    runId,
    files: [],
    manifestMismatches: [],
    rejected: [],
    pushed: false,
  };

  const dir = outputDir ?? teamOutputDir(team);
  const raw = listOutputFiles(dir);
  if (raw.length === 0) {
    result.skippedReason = 'ØªÛŒÙ… Ù‡ÛŒÚ† ÙØ§ÛŒÙ„ Ú©Ø¯ÛŒ ØªÙˆÙ„ÛŒØ¯ Ù†Ú©Ø±Ø¯ (Ø¯Ø§ÛŒØ±Ú©ØªÙˆØ±ÛŒ Ø®Ø±ÙˆØ¬ÛŒ Ø®Ø§Ù„ÛŒ Ø§Ø³Øª).';
    return result;
  }

  if (raw.length > SANDBOX_LIMITS.maxFiles) {
    result.skippedReason = `ØªØ¹Ø¯Ø§Ø¯ ÙØ§ÛŒÙ„ (${raw.length}) Ø¨ÛŒØ´ Ø§Ø² Ø³Ù‚Ù Ù…Ø¬Ø§Ø² (${SANDBOX_LIMITS.maxFiles}).`;
    return result;
  }

  let totalBytes = 0;
  const contents = new Map<string, string>();
  for (const f of raw) {
    totalBytes += f.bytes;
    try {
      const safe = sanitizeRelPath(f.relPath);
      if (f.bytes > SANDBOX_LIMITS.maxFileBytes) {
        result.rejected.push({ path: f.relPath, reason: `Ø­Ø¬Ù… Ø¨ÛŒØ´ Ø§Ø² Ø³Ù‚Ù (${f.bytes} Ø¨Ø§ÛŒØª)` });
        continue;
      }
      const content = readFileSync(f.fullPath, 'utf-8');
      const lines = countLines(content);
      if (lines > SANDBOX_LIMITS.maxLinesPerFile) {
        result.rejected.push({ path: f.relPath, reason: `Ø®Ø· Ø¨ÛŒØ´ Ø§Ø² Ø³Ù‚Ù (${lines})` });
        continue;
      }
      contents.set(safe, content);
    } catch (err) {
      result.rejected.push({ path: f.relPath, reason: err instanceof Error ? err.message : String(err) });
    }
  }
  if (totalBytes > SANDBOX_LIMITS.maxTotalBytes) {
    result.skippedReason = `Ø­Ø¬Ù… Ù…Ø¬Ù…ÙˆØ¹ ÙØ§ÛŒÙ„â€ŒÙ‡Ø§ (${totalBytes} Ø¨Ø§ÛŒØª) Ø¨ÛŒØ´ Ø§Ø² Ø³Ù‚Ù Ù…Ø¬Ø§Ø².`;
    return result;
  }

  // Ú¯ÛŒØª Ø¶Ø¯ØªÙˆÙ‡Ù…: Ù‡Ø´ ÙˆØ§Ù‚Ø¹ÛŒ Ø¨Ø§ÛŒØªâ€ŒÙ‡Ø§ÛŒ Ø¯ÛŒØ³Ú© + ØªØ·Ø¨ÛŒÙ‚ Ø¨Ø§ Ù…Ø§Ù†ÛŒÙØ³Øª ØªÛŒÙ…
  const declared = new Map<string, string | undefined>();
  for (const d of declaredFiles ?? []) {
    try {
      declared.set(sanitizeRelPath(d.path), d.sha256);
    } catch {
      result.manifestMismatches.push(d.path);
    }
  }
  for (const [safe, content] of Array.from(contents.entries())) {
    const hash = sha256Hex(content);
    const ok = await syntaxCheck(safe, content);
    result.files.push({
      path: safe,
      sha256: hash,
      bytes: Buffer.byteLength(content, 'utf-8'),
      lines: countLines(content),
      syntaxOk: ok,
    });
    if (!ok) {
      result.rejected.push({ path: safe, reason: 'Ø®Ø·Ø§ÛŒ Ù†Ø­ÙˆÛŒ Ø¯Ø± ÙØ§ÛŒÙ„ Ú©Ø¯' });
      continue;
    }
    if (declared.size > 0) {
      if (!declared.has(safe)) {
        result.manifestMismatches.push(safe);
      } else {
        const claimed = declared.get(safe);
        if (claimed && claimed.toLowerCase() !== hash.toLowerCase()) {
          result.manifestMismatches.push(safe);
        }
      }
    }
  }
  for (const d of Array.from(declared.keys())) {
    if (!contents.has(d)) result.manifestMismatches.push(d);
  }

  // ÙØ§ÛŒÙ„â€ŒÙ‡Ø§ÛŒ Ø³Ø§Ù„Ù… Ø¨Ø±Ø§ÛŒ Ø«Ø¨Øª
  const healthy = result.files.filter(
    (f) => !result.rejected.some((r) => r.path === f.path) && !result.manifestMismatches.includes(f.path),
  );

  if (!approved) {
    result.skippedReason = 'Ù…Ù†ØªÙ‚Ø¯ ØªÛŒÙ… Ø±Ø§ ØªØ£ÛŒÛŒØ¯ Ù†Ú©Ø±Ø¯Ø› Ú©Ø¯ Ù¾ÙˆØ´ Ù†Ù…ÛŒâ€ŒØ´ÙˆØ¯ (ÙØ§ÛŒÙ„â€ŒÙ‡Ø§ Ø¯Ø± Ø¯ÛŒØªØ§Ø¨ÛŒØ³ Ø«Ø¨Øª Ù…ÛŒâ€ŒØ´ÙˆÙ†Ø¯).';
    await recordFiles(cycleId, team, runId, healthy, targetRepo);
    return result;
  }
  if (result.manifestMismatches.length > 0) {
    result.skippedReason = `Ø¹Ø¯Ù… ØªØ·Ø¨ÛŒÙ‚ Ù…Ø§Ù†ÛŒÙØ³Øª (${result.manifestMismatches.length} Ù…ÙˆØ±Ø¯)Ø› Ø¨Ø±Ø§ÛŒ Ø§Ù…Ù†ÛŒØª Ù¾ÙˆØ´ Ø§Ù†Ø¬Ø§Ù… Ù†Ø´Ø¯.`;
    await recordFiles(cycleId, team, runId, healthy, targetRepo);
    return result;
  }
  if (healthy.length === 0) {
    result.skippedReason = 'Ù‡ÛŒÚ† ÙØ§ÛŒÙ„ Ø³Ø§Ù„Ù…ÛŒ Ø¨Ø±Ø§ÛŒ Ù¾ÙˆØ´ Ø¨Ø§Ù‚ÛŒ Ù†Ù…Ø§Ù†Ø¯.';
    await recordFiles(cycleId, team, runId, healthy, targetRepo);
    return result;
  }
  if (dryRun) {
    result.skippedReason = 'Ø­Ø§Ù„Øª dry-runØ› Ù¾ÙˆØ´ Ø§Ù†Ø¬Ø§Ù… Ù†Ø´Ø¯.';
    await recordFiles(cycleId, team, runId, healthy, targetRepo);
    return result;
  }
  if (!token) {
    result.skippedReason = 'ØªÙˆÚ©Ù† Ú¯ÛŒØªâ€ŒÙ‡Ø§Ø¨ Ø¨Ø±Ø§ÛŒ Ø±ÛŒÙ¾ÙˆÛŒ Ø³Ø§ÛŒØª Ø¯Ø± Ø¯Ø³ØªØ±Ø³ Ù†ÛŒØ³Øª (SITE_GITHUB_TOKEN).';
    await recordFiles(cycleId, team, runId, healthy, targetRepo);
    return result;
  }

  const payload = healthy.map((f) => ({ path: f.path, content: contents.get(f.path) ?? '' }));

  const push = await pushToSiteRepo({ token, repo: targetRepo, team, runId, files: payload });
  result.pushed = true;
  result.branch = push.branch;
  result.commitSha = push.commitSha;
  result.compareUrl = push.compareUrl;
  await recordFiles(cycleId, team, runId, healthy, targetRepo, {
    branch: push.branch,
    commitSha: push.commitSha,
  });
  return result;
}

/** Ø§Ø¬Ø±Ø§ÛŒ Ù…Ø³ØªÙ‚Ù„ Ø§Ø² Ø®Ø· ÙØ±Ù…Ø§Ù† Ø¨Ø±Ø§ÛŒ ØªØ³Øª: npx tsx worker/code-collector.ts <team> <run-id> */
async function cli(): Promise<void> {
  const team = process.argv[2] as TeamName | undefined;
  const runId = process.argv[3] ?? `manual-${Date.now()}`;
  if (!team) {
    console.error('Ø§Ø³ØªÙØ§Ø¯Ù‡: npx tsx worker/code-collector.ts <team> <run-id> [--dry-run]');
    process.exit(1);
  }
  const res = await collectAndCommitTeamCode({
    team,
    runId,
    approved: true,
    dryRun: process.argv.includes('--dry-run'),
  });
  console.log(JSON.stringify(res, null, 2));
}

const invokedDirectly =
  typeof process !== 'undefined' &&
  Array.isArray(process.argv) &&
  process.argv[1] !== undefined &&
  /code-collector(\.ts)?$/.test(process.argv[1]);
if (invokedDirectly) {
  cli().catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
