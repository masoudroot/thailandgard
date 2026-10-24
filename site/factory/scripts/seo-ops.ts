import { closePool, getPool } from '../../lib/factory/db';
import { loadFactoryEnvFile } from '../../lib/factory/local-env';
import { projectBatch } from '../../lib/factory/projector';
import { PgProjectorStore } from '../../lib/factory/projector-pg';
import { createWorkItem, getWorkItem } from '../../lib/factory/repository';
import { startSeoOpsWorkflow } from '../../lib/factory/temporal/client';

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
}

async function waitForStatus(
  id: string,
  expected: string[],
  timeoutMs = 120_000,
): Promise<string> {
  const store = new PgProjectorStore(getPool());
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await projectBatch(store);
    const item = await getWorkItem(id);
    if (item && expected.includes(item.status)) return item.status;
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error(`Timed out waiting for ${id} to reach ${expected.join(', ')}`);
}

async function main(): Promise<void> {
  loadFactoryEnvFile();
  const requestedId = option('--work-item');
  const item =
    requestedId !== undefined
      ? await getWorkItem(requestedId)
      : await createWorkItem({
          domain: 'seo',
          ownerRole: 'seo',
          title: `SEO Ops ${new Date().toISOString()}`,
          risk: 'R1',
          kpiTarget: 'organic_clicks_28d',
          outcomeWindow: '28d',
          budget: { tokens: 20_000, costUsd: 0.5, wallClockMinutes: 30 },
          actor: 'seo-ops',
        });

  if (!item) throw new Error(`WorkItem not found: ${requestedId}`);

  const canonical = option('--canonical');
  const titleIncludes = option('--title');
  const jsonLd = option('--jsonld');
  const minLinks = option('--min-links');
  const expectedSeo =
    canonical || titleIncludes || jsonLd || minLinks
      ? {
          ...(canonical ? { canonical } : {}),
          ...(titleIncludes ? { titleIncludes } : {}),
          ...(jsonLd
            ? {
                jsonLdTypes: jsonLd
                  .split(',')
                  .map((value) => value.trim())
                  .filter(Boolean),
              }
            : {}),
          ...(minLinks ? { minInternalLinks: Number(minLinks) } : {}),
        }
      : undefined;

  const workflowId = await startSeoOpsWorkflow({
    workItemId: item.id,
    actor: 'seo-ops',
    previewUrl: option('--url'),
    expectedSeo,
    limit: option('--limit') ? Number(option('--limit')) : undefined,
  });

  const status = process.argv.includes('--no-wait')
    ? 'started'
    : await waitForStatus(item.id, [
        'awaiting_approval',
        'blocked',
        'failed',
        'done',
      ]);

  console.log(
    JSON.stringify(
      { workItemId: item.id, workflowId, status },
      null,
      2,
    ),
  );
  if (status === 'blocked' || status === 'failed') process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(
      '[seo-ops]',
      error instanceof Error ? error.message : String(error),
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
