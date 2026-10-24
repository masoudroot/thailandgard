import { runTechnicalSeoGate } from '../../lib/factory/gates/technical-seo';
import { loadFactoryEnvFile } from '../../lib/factory/local-env';

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index < 0) return undefined;
  return process.argv[index + 1];
}

function resolveUrl(): string {
  const direct = option('--url');
  if (direct) return direct;
  const base = process.env.FACTORY_PREVIEW_BASE_URL;
  if (!base) {
    throw new Error(
      'Provide --url or set FACTORY_PREVIEW_BASE_URL in site/.env.factory.local',
    );
  }
  return new URL(option('--path') ?? '/', base).toString();
}

async function main(): Promise<void> {
  loadFactoryEnvFile();
  const url = resolveUrl();
  const types = option('--jsonld')
    ?.split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  const result = await runTechnicalSeoGate({
    url,
    expected: {
      canonical: option('--canonical'),
      titleIncludes: option('--title'),
      jsonLdTypes: types,
    },
  });

  console.log(JSON.stringify({ url, result }, null, 2));
  if (!result.passed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(
    '[seo-gate]',
    error instanceof Error ? error.message : String(error),
  );
  process.exit(1);
});
