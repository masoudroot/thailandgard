import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function cleanupValue(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  const comment = trimmed.indexOf(' #');
  return comment >= 0 ? trimmed.slice(0, comment).trim() : trimmed;
}

export function loadFactoryEnvFile(
  file = process.env.FACTORY_ENV_FILE ?? '.env.factory.local',
): string | null {
  const path = resolve(process.cwd(), file);
  if (!existsSync(path)) return null;

  const text = readFileSync(path, 'utf8');
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(
      /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/,
    );
    if (!match) continue;
    const key = match[1];
    const value = cleanupValue(match[2]);
    if (process.env[key] === undefined) process.env[key] = value;
  }
  return path;
}
