import { createHash } from 'node:crypto';
import type { Risk } from './contracts';
import type { ContentDraft } from './content/contracts';

export interface ReleaseGateEvidence {
  gate: string;
  passed: boolean;
  evidenceHash: string;
}

export interface ReleaseManifest {
  mode: 'dry_run';
  workItemId: string;
  title: string;
  slug: string;
  risk: Risk;
  policyVersion: string;
  contentHash: string;
  gates: ReleaseGateEvidence[];
  createdAt: string;
}

export function releaseKey(workItemId: string, name: string): string {
  const safe = name
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!safe) throw new Error('Release artifact name is empty');
  return `releases/${workItemId}/${safe}`;
}

export function buildReleaseManifest(input: {
  workItemId: string;
  risk: Risk;
  draft: ContentDraft;
  policyVersion: string;
  gates: ReleaseGateEvidence[];
  createdAt: string;
}): ReleaseManifest {
  return {
    mode: 'dry_run',
    workItemId: input.workItemId,
    title: input.draft.title,
    slug: input.draft.slug,
    risk: input.risk,
    policyVersion: input.policyVersion,
    contentHash: createHash('sha256')
      .update(input.draft.bodyMarkdown)
      .digest('hex'),
    gates: input.gates,
    createdAt: input.createdAt,
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderPreviewHtml(
  manifest: ReleaseManifest,
  draft: ContentDraft,
): string {
  return `<!doctype html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(manifest.title)}</title>
</head>
<body>
  <main>
    <p>Dry-run preview — not published</p>
    ${draft.bodyMarkdown
      .split('\n')
      .map((line) => {
        if (line.startsWith('### ')) {
          return `<h3>${escapeHtml(line.slice(4))}</h3>`;
        }
        if (line.startsWith('## ')) {
          return `<h2>${escapeHtml(line.slice(3))}</h2>`;
        }
        if (line.startsWith('# ')) {
          return `<h1>${escapeHtml(line.slice(2))}</h1>`;
        }
        if (line.startsWith('- ')) {
          return `<li>${escapeHtml(line.slice(2))}</li>`;
        }
        return line.trim() ? `<p>${escapeHtml(line)}</p>` : '';
      })
      .join('\n')}
  </main>
</body>
</html>`;
}
