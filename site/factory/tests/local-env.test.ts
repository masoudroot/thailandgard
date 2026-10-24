import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { loadFactoryEnvFile } from '@/lib/factory/local-env';

const dirs: string[] = [];

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('factory local env loader', () => {
  it('loads values, strips quotes and keeps existing env', () => {
    const dir = mkdtempSync(join(tmpdir(), 'factory-env-'));
    dirs.push(dir);
    const file = join(dir, '.env.factory.local');
    const key = `FACTORY_ENV_TEST_${Date.now()}`;
    const existingKey = `${key}_EXISTING`;
    process.env[existingKey] = 'from-process';

    writeFileSync(
      file,
      [
        `${key}=from-file`,
        `${existingKey}=from-file`,
        `${key}_QUOTED="quoted value"`,
        `${key}_COMMENT=value # comment`,
        '# ignored',
      ].join('\n'),
    );

    expect(loadFactoryEnvFile(file)).toBe(file);
    expect(process.env[key]).toBe('from-file');
    expect(process.env[`${key}_QUOTED`]).toBe('quoted value');
    expect(process.env[`${key}_COMMENT`]).toBe('value');
    expect(process.env[existingKey]).toBe('from-process');

    delete process.env[key];
    delete process.env[`${key}_QUOTED`];
    delete process.env[`${key}_COMMENT`];
    delete process.env[existingKey];
  });

  it('returns null when the file is missing', () => {
    expect(loadFactoryEnvFile(join(tmpdir(), 'missing-factory-env-file'))).toBe(
      null,
    );
  });
});
