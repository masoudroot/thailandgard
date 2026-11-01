/**
 * گارد شکست پیش‌نمایش (R2): سه Build متوالیِ پیش‌نمایش که Fail شده
 * باشند، Pipeline را Hard-Stop می‌کنند. تا وقتی Hard-Stop فعال است،
 * هیچ Merge و هیچ Deployای مجاز نیست.
 *
 * قواعد شمارش (صریح و بدون حدس):
 * - فقط وضعیت‌های تأییدشدهٔ failure و error، شکست‌اند.
 * - success، زنجیرهٔ جاری را می‌بندد (شکست‌های قدیمی‌تر از تازه‌ترین
 *   موفقیت، «متوالیِ جاری» نیستند و شمرده نمی‌شوند).
 * - pending و inactive و unknown، نه شکست‌اند و نه بازنشانی؛ زنجیره را
 *   نمی‌شکنند و شمرده نمی‌شوند (inactive یعنی Deployment با نسخهٔ
 *   تازه‌تر جایگزین شده، نه این‌که Buildاش Fail شده باشد).
 * - ورودی باید از تازه‌ترین به قدیمی‌ترین مرتب باشد.
 * - خطای API یا نبودن هیچ پیش‌نمایشی، Unknown است، نه Hard-Stop؛
 *   Hard-Stop فقط با سه شکستِ تأییدشده فعال می‌شود.
 *
 * این ماژول هیچ دسترسی دیتابیسی و هیچ Secret ندارد؛ توکن فقط از
 * فراخواننده می‌آید و در لاگ نمی‌رود.
 */

export const PREVIEW_FAILURE_LIMIT = 3;

export type PreviewDeploymentState =
  | "success"
  | "failure"
  | "error"
  | "inactive"
  | "pending"
  | "unknown";

export interface PreviewDeploymentOutcome {
  id: number;
  environment: string;
  ref: string;
  sha: string;
  state: PreviewDeploymentState;
  createdAt: string;
}

export interface PreviewGuardDecision {
  hardStop: boolean;
  consecutiveFailures: number;
  blockingFailures: PreviewDeploymentOutcome[];
  canMerge: boolean;
  canDeploy: boolean;
  reason: string;
}

function isConfirmedFailure(state: PreviewDeploymentState): boolean {
  return state === "failure" || state === "error";
}

export function evaluatePreviewBuilds(outcomes: PreviewDeploymentOutcome[]): PreviewGuardDecision {
  let consecutiveFailures = 0;
  const blocking: PreviewDeploymentOutcome[] = [];
  for (const outcome of outcomes) {
    if (outcome.state === "success") {
      // تازه‌ترین موفقیت، زنجیرهٔ جاری را می‌بندد؛ شکست‌های قدیمی‌تر
      // از آن، دیگر «متوالیِ جاری» نیستند.
      break;
    }
    if (!isConfirmedFailure(outcome.state)) continue;
    consecutiveFailures += 1;
    blocking.push(outcome);
    if (consecutiveFailures >= PREVIEW_FAILURE_LIMIT) break;
  }
  const hardStop = consecutiveFailures >= PREVIEW_FAILURE_LIMIT;
  return {
    hardStop,
    consecutiveFailures,
    blockingFailures: blocking.slice(0, PREVIEW_FAILURE_LIMIT),
    canMerge: !hardStop,
    canDeploy: !hardStop,
    reason: hardStop
      ? `${PREVIEW_FAILURE_LIMIT} consecutive preview build failures: ${blocking
          .slice(0, PREVIEW_FAILURE_LIMIT)
          .map((o) => `${o.id}@${o.ref}:${o.state}`)
          .join(", ")}`
      : `no preview hard-stop (${consecutiveFailures} consecutive failures)`,
  };
}

interface GitHubDeploymentRow {
  id: number;
  sha: string;
  ref: string;
  environment: string | null;
  creator: { login: string } | null;
  created_at: string;
}

interface GitHubStatusRow {
  state: string;
}

function mapState(raw: string | undefined): PreviewDeploymentState {
  switch (raw) {
    case "success":
      return "success";
    case "failure":
      return "failure";
    case "error":
      return "error";
    case "inactive":
      return "inactive";
    case "pending":
    case "queued":
      return "pending";
    default:
      return "unknown";
  }
}

export async function fetchPreviewDeployments(options: {
  repo: string;
  token: string;
  fetchFn?: typeof fetch;
  perPage?: number;
}): Promise<{ outcomes: PreviewDeploymentOutcome[]; unknown: boolean }> {
  const fetchFn = options.fetchFn ?? fetch;
  const perPage = options.perPage ?? 50;
  const headers = {
    Authorization: `Bearer ${options.token}`,
    Accept: "application/vnd.github+json",
  };
  let listRes: Response;
  try {
    listRes = await fetchFn(
      `https://api.github.com/repos/${options.repo}/deployments?per_page=${perPage}`,
      { headers },
    );
  } catch {
    return { outcomes: [], unknown: true };
  }
  if (!listRes.ok) return { outcomes: [], unknown: true };
  const list = (await listRes.json()) as GitHubDeploymentRow[];
  const previews = list
    .filter(
      (d) =>
        /vercel/i.test(d.creator?.login ?? "") && /preview/i.test(d.environment ?? ""),
    )
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .slice(0, 10);
  if (previews.length === 0) return { outcomes: [], unknown: true };
  const outcomes: PreviewDeploymentOutcome[] = [];
  for (const deployment of previews) {
    let state: PreviewDeploymentState = "unknown";
    try {
      const statusRes = await fetchFn(
        `https://api.github.com/repos/${options.repo}/deployments/${deployment.id}/statuses?per_page=10`,
        { headers },
      );
      if (statusRes.ok) {
        const statuses = (await statusRes.json()) as GitHubStatusRow[];
        state = mapState(statuses[0]?.state);
      }
    } catch {
      state = "unknown";
    }
    outcomes.push({
      id: deployment.id,
      environment: deployment.environment ?? "",
      ref: deployment.ref,
      sha: deployment.sha,
      state,
      createdAt: deployment.created_at,
    });
  }
  return { outcomes, unknown: false };
}
