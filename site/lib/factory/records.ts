import type { Artifact, Evidence } from './contracts';
import { getPool } from './db';

export interface ReleaseRecord {
  id: string;
  workItemId: string;
  risk: string;
  buildSha: string;
  status: string;
}

export interface OutcomeRecord {
  id: string;
  workItemId: string;
  metric: string;
  window: string;
  baseline: number;
  value: number;
  status: string;
}

export async function insertArtifact(artifact: Artifact): Promise<void> {
  await getPool().query(
    `INSERT INTO artifacts (id, work_item_id, kind, hash, uri, producer, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      artifact.id,
      artifact.workItemId,
      artifact.kind,
      artifact.hash,
      artifact.uri,
      artifact.producer,
      artifact.createdAt,
    ],
  );
}

export async function insertEvidence(evidence: Evidence): Promise<void> {
  await getPool().query(
    `INSERT INTO evidence (id, work_item_id, gate, hash, uri, created_by, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      evidence.id,
      evidence.workItemId,
      evidence.gate,
      evidence.hash,
      evidence.uri,
      evidence.createdBy,
      evidence.createdAt,
    ],
  );
}

export async function insertRelease(record: ReleaseRecord): Promise<void> {
  await getPool().query(
    `INSERT INTO releases (id, work_item_id, risk, build_sha, status)
     VALUES ($1, $2, $3, $4, $5)`,
    [record.id, record.workItemId, record.risk, record.buildSha, record.status],
  );
}

export async function insertOutcome(record: OutcomeRecord): Promise<void> {
  await getPool().query(
    `INSERT INTO outcomes (id, work_item_id, metric, outcome_window, baseline, value, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      record.id,
      record.workItemId,
      record.metric,
      record.window,
      record.baseline,
      record.value,
      record.status,
    ],
  );
}
