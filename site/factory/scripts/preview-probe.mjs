#!/usr/bin/env node
/**
 * Factory preview probe.
 *
 * Proves that a branch pushed by the factory (GitHub Actions bot) results in
 * a working Vercel preview deployment, using only the GitHub API: Vercel's
 * git integration records every preview deployment through GitHub's
 * Deployments API, so no standing Vercel credential is needed.
 *
 * Expected environment (set by .github/workflows/factory-preview-probe.yml):
 *   GITHUB_REPOSITORY  e.g. masoudroot/thailandgard
 *   GITHUB_TOKEN       actions token (deployments:read is enough)
 *   PROBE_BRANCH       branch that was just pushed
 *   PROBE_SHA          commit sha of the probe commit
 *   PROBE_ALIAS_BASE   optional: branch alias URL for an informational check
 *
 * Success prints one line: PREVIEW_PROBE_OK {json}
 * Failure exits non-zero with PREVIEW_PROBE_FAILED or PREVIEW_PROBE_TIMEOUT.
 */
const repo = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const branch = process.env.PROBE_BRANCH;
const sha = process.env.PROBE_SHA;
const aliasBase = (process.env.PROBE_ALIAS_BASE || '').replace(/\/$/, '');
const timeoutSeconds = Number(process.env.PROBE_TIMEOUT_SECONDS || 900);
const pollIntervalMs = Number(process.env.PROBE_POLL_INTERVAL_MS || 15000);

if (!repo || !token || !branch || !sha) {
  console.error(
    'preview-probe: missing env (need GITHUB_REPOSITORY, GITHUB_TOKEN, PROBE_BRANCH, PROBE_SHA)',
  );
  process.exit(2);
}

const marker = `factory preview probe: ${branch}`;
const headers = {
  authorization: `Bearer ${token}`,
  accept: 'application/vnd.github+json',
  'user-agent': 'factory-preview-probe',
  'x-github-api-version': '2022-11-28',
};
const startedAt = Date.now();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function api(path) {
  const response = await fetch(`https://api.github.com${path}`, { headers });
  if (!response.ok) throw new Error(`GET ${path} -> ${response.status}`);
  return response.json();
}

async function findDeployment() {
  const list = await api(`/repos/${repo}/deployments?per_page=50`);
  const forSha = list.filter((item) => item.sha === sha || item.ref === sha);
  if (forSha.length === 0) return null;
  return (
    forSha.find(
      (item) => /vercel/i.test(item.creator?.login ?? '') && /preview/i.test(item.environment ?? ''),
    ) ??
    forSha.find((item) => /vercel/i.test(item.creator?.login ?? '')) ??
    forSha[0]
  );
}

async function markerCheck(url) {
  try {
    const response = await fetch(`${url.replace(/\/$/, '')}/factory-preview-probe.txt`, {
      redirect: 'manual',
    });
    if (response.status === 200) {
      const body = await response.text();
      return { verified: body.includes(marker), httpStatus: 200, access: 'public' };
    }
    const location = response.headers.get('location') ?? '';
    if ([301, 302, 307, 308, 401, 403].includes(response.status) && /sso|vercel\.com/i.test(location)) {
      return { verified: false, httpStatus: response.status, access: 'auth-required' };
    }
    return { verified: false, httpStatus: response.status, access: 'unexpected' };
  } catch (error) {
    return { verified: false, httpStatus: 0, access: 'network-error', error: String(error) };
  }
}

async function report(deployment, status, check) {
  let alias = null;
  if (aliasBase) {
    const aliasCheck = await markerCheck(aliasBase);
    alias = { url: aliasBase, ...aliasCheck };
  }
  console.log(
    `PREVIEW_PROBE_OK ${JSON.stringify({
      branch,
      sha,
      deploymentId: deployment.id,
      environment: deployment.environment ?? null,
      creator: deployment.creator?.login ?? null,
      url: status.environment_url,
      deploymentState: status.state,
      marker: check,
      alias,
      elapsedSeconds: Math.round((Date.now() - startedAt) / 1000),
    })}`,
  );
  process.exit(0);
}

let deployment = null;
let lastState = 'none';

while (Date.now() - startedAt < timeoutSeconds * 1000) {
  if (!deployment) {
    try {
      deployment = await findDeployment();
      if (deployment) {
        console.error(
          `found deployment ${deployment.id} (${deployment.environment ?? 'unknown env'}) — waiting for a terminal status`,
        );
      }
    } catch (error) {
      console.error(`warn: ${error.message}`);
    }
  }

  if (deployment) {
    let status = null;
    try {
      const statuses = await api(
        `/repos/${repo}/deployments/${deployment.id}/statuses?per_page=10`,
      );
      status = statuses[0] ?? null;
    } catch (error) {
      console.error(`warn: ${error.message}`);
    }
    lastState = status?.state ?? 'no-status';

    if (status && status.state === 'success' && status.environment_url) {
      const check = await markerCheck(status.environment_url);
      if (check.verified) await report(deployment, status, check);
      if (check.access === 'auth-required') {
        console.error(
          'marker not publicly reachable (deployment protection?) — accepting deployment success',
        );
        await report(deployment, status, check);
      }
      console.error(`marker check not conclusive yet: ${JSON.stringify(check)}`);
    } else if (status && ['error', 'failure', 'inactive'].includes(status.state)) {
      console.error(`PREVIEW_PROBE_FAILED deployment ${deployment.id} state=${status.state}`);
      process.exit(1);
    }
  }

  await sleep(pollIntervalMs);
}

console.error(
  `PREVIEW_PROBE_TIMEOUT after ${timeoutSeconds}s (deployment=${deployment?.id ?? 'not-found'}, lastState=${lastState})`,
);
process.exit(1);