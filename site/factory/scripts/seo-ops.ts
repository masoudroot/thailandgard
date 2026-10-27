import { closePool, getPool } from '../../lib/factory/db';
import { loadFactoryEnvFile } from '../../lib/factory/local-env';
import { drainProjections } from '../../lib/factory/projector';
import { PgProjectorStore } from '../../lib/factory/projector-pg';
import { createWorkItem, getWorkItem } from '../../lib/factory/repository';
import { runSeoOps } from '../../lib/factory/runner';
import { logger } from '../../lib/logger';

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
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

  const result = await runSeoOps({
    workItemId: item.id,
    actor: 'seo-ops',
    previewUrl: option('--url'),
    expectedSeo,
    limit: option('--limit') ? Number(option('--limit')) : undefined,
  });

  await drainProjections(new PgProjectorStore(getPool()));
  const stored = await getWorkItem(item.id);

  logger.info(
    JSON.stringify(
      {
        workItemId: item.id,
        status: result.status,
        projectionStatus: stored?.status,
        signalCount: result.signalCount,
        planArtifactId: result.planArtifactId,
        reasons: result.reasons,
      },
      null,
      2,
    ),
  );
  if (result.status === 'blocked') process.exitCode = 1;
}

main()
  .catch((error) => {
    logger.error(
      '[seo-ops]',
      undefined,
      error instanceof Error ? error.message : String(error),
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });