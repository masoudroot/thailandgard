import { z } from 'zod';

const EnvSchema = z.object({
  FACTORY_ENV: z.enum(['local', 'staging', 'production']).default('local'),
  FACTORY_DATABASE_URL: z.string().url(),
  FACTORY_CONTROL_TOKEN: z.string().min(32),
  FACTORY_EVIDENCE_SECRET: z.string().min(32).optional(),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
  FACTORY_ARTIFACT_ENDPOINT: z.string().url().optional(),
  FACTORY_ARTIFACT_REGION: z.string().min(1).default('auto'),
  FACTORY_ARTIFACT_BUCKET: z.string().min(1).optional(),
  FACTORY_ARTIFACT_ACCESS_KEY_ID: z.string().min(1).optional(),
  FACTORY_ARTIFACT_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  FACTORY_ARTIFACT_DIR: z.string().min(1).optional(),
});

export interface FactoryConfig {
  env: 'local' | 'staging' | 'production';
  databaseUrl: string;
  controlToken: string;
  evidenceSecret?: string;
  otlpEndpoint?: string;
  /**
   * Filesystem artifact store, used by CI and local runs when no
   * S3-compatible endpoint is configured. S3 settings win when both exist.
   */
  artifactDir?: string;
  artifacts?: {
    endpoint: string;
    region: string;
    bucket: string;
    accessKeyId: string;
    secretAccessKey: string;
  };
}

export type FactoryEnv = Record<string, string | undefined>;

export function loadFactoryConfig(env: FactoryEnv = process.env): FactoryConfig {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid factory configuration: ${details}`);
  }

  const artifactValues = [
    parsed.data.FACTORY_ARTIFACT_ENDPOINT,
    parsed.data.FACTORY_ARTIFACT_BUCKET,
    parsed.data.FACTORY_ARTIFACT_ACCESS_KEY_ID,
    parsed.data.FACTORY_ARTIFACT_SECRET_ACCESS_KEY,
  ];
  const artifactConfigured = artifactValues.every(Boolean);

  if (artifactValues.some(Boolean) && !artifactConfigured) {
    throw new Error(
      'Invalid factory configuration: artifact settings must be provided together',
    );
  }

  return {
    env: parsed.data.FACTORY_ENV,
    databaseUrl: parsed.data.FACTORY_DATABASE_URL,
    controlToken: parsed.data.FACTORY_CONTROL_TOKEN,
    evidenceSecret: parsed.data.FACTORY_EVIDENCE_SECRET,
    otlpEndpoint: parsed.data.OTEL_EXPORTER_OTLP_ENDPOINT,
    artifactDir: parsed.data.FACTORY_ARTIFACT_DIR,
    artifacts: artifactConfigured
      ? {
          endpoint: parsed.data.FACTORY_ARTIFACT_ENDPOINT as string,
          region: parsed.data.FACTORY_ARTIFACT_REGION,
          bucket: parsed.data.FACTORY_ARTIFACT_BUCKET as string,
          accessKeyId: parsed.data.FACTORY_ARTIFACT_ACCESS_KEY_ID as string,
          secretAccessKey: parsed.data.FACTORY_ARTIFACT_SECRET_ACCESS_KEY as string,
        }
      : undefined,
  };
}
