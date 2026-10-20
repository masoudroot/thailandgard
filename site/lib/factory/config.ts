import { z } from 'zod';

const EnvSchema = z.object({
  FACTORY_ENV: z.enum(['local', 'staging', 'production']).default('local'),
  FACTORY_DATABASE_URL: z.string().url(),
  FACTORY_CONTROL_TOKEN: z.string().min(32),
  TEMPORAL_ADDRESS: z.string().min(1).default('localhost:7233'),
  TEMPORAL_NAMESPACE: z.string().min(1).default('default'),
  TEMPORAL_TLS: z.enum(['true', 'false']).default('false'),
  TEMPORAL_API_KEY: z.string().min(1).optional(),
  FACTORY_TASK_QUEUE: z.string().min(1).default('factory-orchestration'),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
  FACTORY_ARTIFACT_ENDPOINT: z.string().url().optional(),
  FACTORY_ARTIFACT_REGION: z.string().min(1).default('auto'),
  FACTORY_ARTIFACT_BUCKET: z.string().min(1).optional(),
  FACTORY_ARTIFACT_ACCESS_KEY_ID: z.string().min(1).optional(),
  FACTORY_ARTIFACT_SECRET_ACCESS_KEY: z.string().min(1).optional(),
});

export interface FactoryConfig {
  env: 'local' | 'staging' | 'production';
  databaseUrl: string;
  controlToken: string;
  temporalAddress: string;
  temporalNamespace: string;
  temporalTls: boolean;
  temporalApiKey?: string;
  taskQueue: string;
  otlpEndpoint?: string;
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
    temporalAddress: parsed.data.TEMPORAL_ADDRESS,
    temporalNamespace: parsed.data.TEMPORAL_NAMESPACE,
    temporalTls: parsed.data.TEMPORAL_TLS === 'true',
    temporalApiKey: parsed.data.TEMPORAL_API_KEY,
    taskQueue: parsed.data.FACTORY_TASK_QUEUE,
    otlpEndpoint: parsed.data.OTEL_EXPORTER_OTLP_ENDPOINT,
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
