import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { loadFactoryConfig, type FactoryConfig } from './config';

export interface ArtifactStore {
  put(key: string, body: Uint8Array, contentType: string): Promise<void>;
}

export function artifactKey(workItemId: string, name: string): string {
  const safe = name
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!safe) throw new Error('Artifact name is empty after sanitization');
  return `work-items/${workItemId}/${safe}`;
}

export function createS3ArtifactStore(
  config: FactoryConfig = loadFactoryConfig(),
): ArtifactStore {
  const artifacts = config.artifacts;
  if (!artifacts) throw new Error('Artifact storage is not configured');

  const client = new S3Client({
    endpoint: artifacts.endpoint,
    region: artifacts.region,
    forcePathStyle: true,
    credentials: {
      accessKeyId: artifacts.accessKeyId,
      secretAccessKey: artifacts.secretAccessKey,
    },
  });

  return {
    async put(key, body, contentType) {
      await client.send(
        new PutObjectCommand({
          Bucket: artifacts.bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
        }),
      );
    },
  };
}
