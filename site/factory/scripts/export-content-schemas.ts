import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import {
  ContentBriefSchema,
  ContentDraftSchema,
} from '../../lib/factory/content/contracts';

async function main(): Promise<void> {
  const dir = path.resolve(process.cwd(), 'factory/contracts');
  await mkdir(dir, { recursive: true });

  const schemas = [
    ['content-brief', ContentBriefSchema],
    ['content-draft', ContentDraftSchema],
  ] as const;

  for (const [name, schema] of schemas) {
    const json = z.toJSONSchema(schema, { target: 'draft-7' });
    await writeFile(
      path.join(dir, `${name}.schema.json`),
      `${JSON.stringify(json, null, 2)}\n`,
      'utf8',
    );
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
