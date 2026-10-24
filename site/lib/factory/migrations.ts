import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

export interface MigrationFile {
  version: string;
  sql: string;
  checksum: string;
}

export async function listMigrations(dir: string): Promise<MigrationFile[]> {
  const files = (await readdir(dir))
    .filter((file) => file.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));

  return Promise.all(
    files.map(async (version) => {
      const sql = await readFile(path.join(dir, version), 'utf8');
      return {
        version,
        sql,
        checksum: createHash('sha256').update(sql).digest('hex'),
      };
    }),
  );
}
