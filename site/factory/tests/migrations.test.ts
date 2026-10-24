import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { listMigrations } from '@/lib/factory/migrations';

describe('listMigrations', () => {
  it('sorts migrations and computes stable checksums', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'factory-migrations-'));
    try {
      await writeFile(path.join(dir, '0002_second.sql'), 'select 2;', 'utf8');
      await writeFile(path.join(dir, '0001_first.sql'), 'select 1;', 'utf8');

      const files = await listMigrations(dir);

      expect(files.map((file) => file.version)).toEqual([
        '0001_first.sql',
        '0002_second.sql',
      ]);
      expect(files[0].checksum).toMatch(/^[0-9a-f]{64}$/);
      expect(files[0].sql).toBe('select 1;');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
