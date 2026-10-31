/**
 * لایهٔ خواندن فقط‌خواندنی داشبورد کارخانه (DASH-01).
 *
 * فقط SELECT سمت سرور، با همان الگوی PostgREST سمت سرور که در
 * site/lib/factory/tick/internal-api.ts هست (dbConfig + هدر service_role).
 * هیچ مسیری برای نوشتن این‌جا نیست؛ هیچ POST و PATCH و RPCای صدا زده
 * نمی‌شود. ستون‌هایی که متن آزاد دارند (last_error، description،
 * payload، acceptance_criteria) هرگز select نمی‌شوند؛ خطاها فقط با کد
 * خطا برمی‌گردند و هیچ Secret و هیچ متن خطای دیتابیس در خروجی نیست.
 *
 * اگر env پیکربندی نشده باشد یا جدول‌های کارخانه نباشند، نتیجه
 * «پیکربندی‌نشده» است؛ صفحه در این حالت ادعای سلامت نمی‌کند.
 */
import { dbConfig, type DbCfg } from "@/lib/factory/tick/internal-api";

export type StatusCount = { status: string; count: number };

/** شمارش سطرها بر اساس وضعیت؛ تابع خالص، برای تست. */
export function countByStatus(statuses: string[]): StatusCount[] {
  const map = new Map<string, number>();
  for (const s of statuses) map.set(s, (map.get(s) ?? 0) + 1);
  return [...map.entries()]
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => (a.status < b.status ? -1 : 1));
}

export interface DashboardWorkItem {
  id: string;
  workKey: string;
  title: string;
  status: string;
  executionMode: string | null;
  workflowVersion: string | null;
  createdAt: string;
}

export interface DashboardStep {
  id: string;
  stepKey: string;
  status: string;
  attemptCount: number;
  workKey: string;
  createdAt: string;
}

export interface DashboardPublication {
  id: string;
  status: string;
  versionId: string;
  createdAt: string;
}

export interface DashboardOutboxEvent {
  id: string;
  eventType: string;
  status: string;
  createdAt: string;
  processedAt: string | null;
}

export interface DashboardError {
  finishStatus: string;
  errorCode: string | null;
  startedAt: string;
  workKey: string;
}

export interface DashboardRun {
  runStatus: string;
  startedAt: string;
  finishedAt: string | null;
  itemsClaimed: number;
  runnerVersion: string;
}

export interface DashboardPointer {
  slug: string;
  canonicalPath: string;
  publishedVersionId: string | null;
}

export interface DashboardBudget {
  ledgerRows: number;
  dailyLimit: string | null;
  dailySpent: number | null;
  budgetDate: string | null;
  /** باقی‌ماندهٔ روزانه، فقط وقتی قابل اتکاست؛ وگرنه null یعنی «نامشخص». */
  remainingDaily: number | null;
  /** شمار مصالحه‌های باز (وضعیت pending_reconciliation). */
  openReconciliationCount: number;
  /** شمار مصالحه‌های باز از نوع اضافه‌هزینه. */
  openExcessCount: number;
  /** مجموع اضافه‌هزینهٔ باز؛ null یعنی «نامشخص» (سطر excess با مبلغ تهی). */
  openExcessTotal: number | null;
  /** شمار مصالحه‌های باز از نوع نامشخص (بدون مبلغ). */
  openUnknownCount: number;
}

/** کار در انتظار تأیید انسانی؛ فقط شناسه‌ها و وضعیت، نه متن آزاد. */
export interface DashboardAwaitingItem {
  id: string;
  workKey: string;
  title: string;
  status: string;
  executionMode: string | null;
  workflowVersion: string | null;
  createdAt: string;
  resultArtifactId: string | null;
}

export interface DashboardGatewayOperation {
  id: string;
  state: string;
  providerCalls: number;
  reservedAmount: number | null;
  settledAmount: number | null;
  actualCost: number | null;
  estimatedCost: number | null;
  unresolvedExcess: number | null;
  costBasis: string | null;
  costUnit: string | null;
  updatedAt: string;
}

export interface DashboardGateway {
  totalCalls: number;
  totalEstimated: number;
  totalActual: number;
  costBases: string[];
  latestOperations: DashboardGatewayOperation[];
  /** مجموع settled_amount عملیات settled با مبنای simulated؛ null یعنی «نامشخص». */
  settledSimulated: number | null;
  /** مجموع رزروهای هنوز باز (حالت‌های reserved و sent و unknown و response_recorded). */
  openReservations: number;
}

/** جمع‌بندی عملیات Gateway؛ تابع خالص، برای تست. */
export function summarizeGatewayOperations(
  rows: { [key: string]: unknown }[],
): { totalCalls: number; totalEstimated: number; totalActual: number; costBases: string[] } {
  let totalCalls = 0;
  let totalEstimated = 0;
  let totalActual = 0;
  const bases = new Set<string>();
  for (const r of rows) {
    totalCalls += asNumber(r.provider_calls);
    totalEstimated += asNumber(r.estimated_cost);
    totalActual += asNumber(r.actual_cost);
    const basis = asString(r.cost_basis);
    if (basis) bases.add(basis);
  }
  return { totalCalls, totalEstimated, totalActual, costBases: [...bases].sort() };
}

/**
 * هزینهٔ تسویه‌شدهٔ شبیه‌سازی‌شده (R3C-RECOVERY، §4): مجموع
 * settled_amount فقط برای عملیات settled با مبنای simulated. اگر
 * حتی یک عملیات settled، مبنای غیرشبیه‌سازی‌شده یا تهی داشته
 * باشد، یا settled_amount تهی باشد، نتیجه null است یعنی
 * «نامشخص»؛ جمع کورکورانه زده نمی‌شود.
 */
export function summarizeSettledSimulated(rows: { [key: string]: unknown }[]): number | null {
  let total = 0;
  for (const r of rows) {
    if (asString(r.state) !== "settled") continue;
    if (asString(r.cost_basis) !== "simulated") return null;
    if (r.settled_amount === null || r.settled_amount === undefined) return null;
    total += asNumber(r.settled_amount);
  }
  return total;
}

/**
 * رزروهای باز (R3C-RECOVERY، §4): مجموع reserved_amount برای
 * حالت‌هایی که رزرو هنوز نگه‌داشته شده است. reserved_amount در
 * اسکیما NOT NULL است، پس همیشه قابل محاسبه است.
 */
export function summarizeOpenReservations(rows: { [key: string]: unknown }[]): number {
  const OPEN = ["reserved", "sent", "unknown", "response_recorded"];
  let total = 0;
  for (const r of rows) {
    if (!OPEN.includes(asString(r.state))) continue;
    total += asNumber(r.reserved_amount);
  }
  return total;
}

/**
 * مصالحه‌های باز (R3C-RECOVERY، §4؛ تفکیک در مرج R3C):
 * excess و unknown جدا حساب می‌شوند. مجموع اضافه‌هزینه فقط
 * از سطرهای excess می‌آید؛ اگر سطر excess با مبلغ تهی باشد،
 * مجموع null است یعنی «نامشخص»، ولی شمارها همچنان دقیق‌اند.
 */
export function summarizeOpenReconciliations(rows: { [key: string]: unknown }[]): {
  count: number;
  excessCount: number;
  excessTotal: number | null;
  unknownCount: number;
} {
  let excessCount = 0;
  let unknownCount = 0;
  let excess = 0;
  let excessNull = false;
  for (const r of rows) {
    const kind = asString(r.kind);
    if (kind === "excess") {
      excessCount++;
      if (r.excess_amount === null || r.excess_amount === undefined) {
        excessNull = true;
      } else {
        excess += asNumber(r.excess_amount);
      }
    } else if (kind === "unknown") {
      unknownCount++;
    }
  }
  return { count: rows.length, excessCount, excessTotal: excessNull ? null : excess, unknownCount };
}

/**
 * باقی‌ماندهٔ بودجهٔ روزانه (R3C-RECOVERY، §4): فقط وقتی قابل
 * اتکاست که سطر روز، مربوط به امروز باشد و سقف و مصرف، هر دو
 * حاضر باشند و مصرف از سقف بیشتر نشده باشد و هیچ مبنای هزینهٔ
 * غیرشبیه‌سازی‌شده‌ای در کار نباشد؛ جز این، null یعنی «نامشخص».
 */
export function remainingDailyBudget(
  dailyLimit: unknown,
  dailySpent: unknown,
  budgetDate: string | null,
  costBases: string[],
  todayIso: string,
): number | null {
  if (budgetDate !== todayIso) return null;
  if (dailyLimit === null || dailyLimit === undefined) return null;
  if (dailySpent === null || dailySpent === undefined) return null;
  if (costBases.some((b) => b !== "simulated")) return null;
  const limit = asNumber(dailyLimit);
  const spent = asNumber(dailySpent);
  if (spent > limit) return null;
  return limit - spent;
}

export interface FactoryDashboardData {
  workItems: StatusCount[];
  workItemsTotal: number;
  latestWorkItems: DashboardWorkItem[];
  steps: StatusCount[];
  stepsTotal: number;
  latestSteps: DashboardStep[];
  publications: StatusCount[];
  publicationsTotal: number;
  latestPublications: DashboardPublication[];
  outbox: StatusCount[];
  outboxOpen: number;
  latestOutbox: DashboardOutboxEvent[];
  recentErrors: DashboardError[];
  lastRun: DashboardRun | null;
  switches: { key: string; value: string }[];
  budget: DashboardBudget;
  pointers: DashboardPointer[];
  /** بخش‌های R3C: نیازمند اقدام، فعالیت اخیر، و Model Gateway. */
  awaitingItems: DashboardAwaitingItem[];
  artifactsReadyCount: number;
  approvalsForAwaiting: StatusCount[];
  gateway: DashboardGateway;
}

export type DashboardResult =
  | { ok: true; data: FactoryDashboardData }
  | { ok: false; reason: "env" | "tables" | "read_error" };

interface Row {
  [key: string]: unknown;
}

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function asNumber(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * خواندن PostgREST با همان هدرهای internal-api؛ ولی 404 (جدول نیست)
 * را null برمی‌گرداند تا حالت «پیکربندی‌نشده» از خطای خواندن جدا بماند.
 */
async function postgrestGetOrNull(cfg: DbCfg, path: string): Promise<Row[] | null> {
  const res = await fetch(`${cfg.url}/rest/v1/${path}`, {
    headers: { apikey: cfg.serviceKey, Authorization: `Bearer ${cfg.serviceKey}` },
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`postgrest get ${path} failed with ${res.status}`);
  const data: unknown = await res.json();
  if (!Array.isArray(data)) throw new Error("postgrest did not return an array");
  return data as Row[];
}

export async function getFactoryDashboard(): Promise<DashboardResult> {
  const cfg = dbConfig();
  if (!cfg) return { ok: false, reason: "env" };
  try {
    const settings = await postgrestGetOrNull(cfg, "factory_settings?select=key,value");
    if (settings === null) return { ok: false, reason: "tables" };

    const switches = settings
      .map((r) => ({ key: asString(r.key), value: asString(r.value) }))
      .sort((a, b) => (a.key < b.key ? -1 : 1));

    const itemStatusRows = (await postgrestGetOrNull(cfg, "factory_work_items?select=status")) ?? [];
    const latestItems = (await postgrestGetOrNull(
      cfg,
      "factory_work_items?order=created_at.desc&limit=10&select=id,work_key,title,status,execution_mode,workflow_version,created_at",
    )) ?? [];

    const stepStatusRows = (await postgrestGetOrNull(cfg, "factory_work_steps?select=status")) ?? [];
    const latestStepsRaw = (await postgrestGetOrNull(
      cfg,
      "factory_work_steps?order=created_at.desc&limit=10&select=id,work_item_id,step_key,status,attempt_count,created_at",
    )) ?? [];
    const stepItemIds = [...new Set(latestStepsRaw.map((r) => asString(r.work_item_id)))].filter(Boolean);
    const stepItems = stepItemIds.length
      ? ((await postgrestGetOrNull(
          cfg,
          `factory_work_items?id=in.(${stepItemIds.join(",")})&select=id,work_key`,
        )) ?? [])
      : [];
    const workKeyById = new Map(stepItems.map((r) => [asString(r.id), asString(r.work_key)]));

    const pubStatusRows = (await postgrestGetOrNull(cfg, "factory_publications?select=status")) ?? [];
    const latestPubs = (await postgrestGetOrNull(
      cfg,
      "factory_publications?order=created_at.desc&limit=10&select=id,status,version_id,created_at",
    )) ?? [];

    const outboxStatusRows = (await postgrestGetOrNull(cfg, "factory_outbox_events?select=status")) ?? [];
    const latestOutbox = (await postgrestGetOrNull(
      cfg,
      "factory_outbox_events?order=created_at.desc&limit=10&select=id,event_type,status,created_at,processed_at",
    )) ?? [];

    const errorRows = (await postgrestGetOrNull(
      cfg,
      "factory_attempts?finish_status=in.(failed,timeout,outcome_unknown)&order=started_at.desc&limit=5&select=finish_status,error_code,started_at,work_item_id",
    )) ?? [];
    const errorItemIds = [...new Set(errorRows.map((r) => asString(r.work_item_id)))].filter(Boolean);
    const errorItems = errorItemIds.length
      ? ((await postgrestGetOrNull(
          cfg,
          `factory_work_items?id=in.(${errorItemIds.join(",")})&select=id,work_key`,
        )) ?? [])
      : [];
    const errorKeyById = new Map(errorItems.map((r) => [asString(r.id), asString(r.work_key)]));

    const runRows = (await postgrestGetOrNull(
      cfg,
      "factory_runs?order=started_at.desc&limit=1&select=run_status,started_at,finished_at,items_claimed,runner_version",
    )) ?? [];

    const ledgerRows = (await postgrestGetOrNull(cfg, "factory_cost_ledger?select=amount,entry_kind")) ?? [];
    const budgetRows = (await postgrestGetOrNull(
      cfg,
      "factory_daily_budgets?order=budget_date.desc&limit=1&select=budget_date,daily_limit,daily_spent",
    )) ?? [];

    const pointerRows = (await postgrestGetOrNull(
      cfg,
      "content_documents?select=slug,canonical_path,published_version_id",
    )) ?? [];

    // بخش‌های R3C: فقط SELECT، مثل بقیهٔ لایه؛ اگر جدول عملیات
    // Gateway نباشد، بخش Gateway خالی می‌ماند، نه خطا.
    const awaitingRows = (await postgrestGetOrNull(
      cfg,
      "factory_work_items?status=eq.awaiting_approval&order=created_at.desc&select=id,work_key,title,status,execution_mode,workflow_version,created_at,result_artifact_id",
    )) ?? [];
    const awaitingIds = awaitingRows.map((r) => asString(r.id)).filter(Boolean);
    const readyArtifacts = awaitingIds.length
      ? ((await postgrestGetOrNull(
          cfg,
          `factory_artifacts?work_item_id=in.(${awaitingIds.join(",")})&select=id`,
        )) ?? [])
      : [];
    const awaitingApprovals = awaitingIds.length
      ? ((await postgrestGetOrNull(
          cfg,
          `factory_approvals?work_item_id=in.(${awaitingIds.join(",")})&select=decision`,
        )) ?? [])
      : [];

    const gatewayLatest = (await postgrestGetOrNull(
      cfg,
      "factory_gateway_operations?order=updated_at.desc&limit=10&select=id,state,provider_calls,reserved_amount,settled_amount,actual_cost,estimated_cost,unresolved_excess,cost_basis,cost_unit,updated_at",
    )) ?? [];
    const gatewayAll = (await postgrestGetOrNull(
      cfg,
      "factory_gateway_operations?select=provider_calls,estimated_cost,actual_cost,cost_basis,state,reserved_amount,settled_amount",
    )) ?? [];
    const gatewaySummary = summarizeGatewayOperations(gatewayAll);
    const gatewaySettledSimulated = summarizeSettledSimulated(gatewayAll);
    const gatewayOpenReservations = summarizeOpenReservations(gatewayAll);

    const reconciliationRows = (await postgrestGetOrNull(
      cfg,
      "factory_gateway_reconciliations?status=eq.pending_reconciliation&select=kind,excess_amount",
    )) ?? [];
    const openReconciliations = summarizeOpenReconciliations(reconciliationRows);

    const outboxCounts = countByStatus(outboxStatusRows.map((r) => asString(r.status)));
    const outboxOpen = outboxCounts
      .filter((c) => c.status === "pending" || c.status === "claimed")
      .reduce((sum, c) => sum + c.count, 0);

    const run = runRows[0];
    const budgetRow = budgetRows[0];

    return {
      ok: true,
      data: {
        workItems: countByStatus(itemStatusRows.map((r) => asString(r.status))),
        workItemsTotal: itemStatusRows.length,
        latestWorkItems: latestItems.map((r) => ({
          id: asString(r.id),
          workKey: asString(r.work_key),
          title: asString(r.title),
          status: asString(r.status),
          executionMode: typeof r.execution_mode === "string" ? r.execution_mode : null,
          workflowVersion: typeof r.workflow_version === "string" ? r.workflow_version : null,
          createdAt: asString(r.created_at),
        })),
        steps: countByStatus(stepStatusRows.map((r) => asString(r.status))),
        stepsTotal: stepStatusRows.length,
        latestSteps: latestStepsRaw.map((r) => ({
          id: asString(r.id),
          stepKey: asString(r.step_key),
          status: asString(r.status),
          attemptCount: asNumber(r.attempt_count),
          workKey: workKeyById.get(asString(r.work_item_id)) ?? "",
          createdAt: asString(r.created_at),
        })),
        publications: countByStatus(pubStatusRows.map((r) => asString(r.status))),
        publicationsTotal: pubStatusRows.length,
        latestPublications: latestPubs.map((r) => ({
          id: asString(r.id),
          status: asString(r.status),
          versionId: asString(r.version_id),
          createdAt: asString(r.created_at),
        })),
        outbox: outboxCounts,
        outboxOpen,
        latestOutbox: latestOutbox.map((r) => ({
          id: asString(r.id),
          eventType: asString(r.event_type),
          status: asString(r.status),
          createdAt: asString(r.created_at),
          processedAt: typeof r.processed_at === "string" ? r.processed_at : null,
        })),
        recentErrors: errorRows.map((r) => ({
          finishStatus: asString(r.finish_status),
          errorCode: typeof r.error_code === "string" ? r.error_code : null,
          startedAt: asString(r.started_at),
          workKey: errorKeyById.get(asString(r.work_item_id)) ?? "",
        })),
        lastRun: run
          ? {
              runStatus: asString(run.run_status),
              startedAt: asString(run.started_at),
              finishedAt: typeof run.finished_at === "string" ? run.finished_at : null,
              itemsClaimed: asNumber(run.items_claimed),
              runnerVersion: asString(run.runner_version),
            }
          : null,
        switches,
        budget: {
          ledgerRows: ledgerRows.length,
          // سقف روزانه، numeric برمی‌گردد نه رشته؛ asString برای عدد،
          // تهی می‌داد و سقف در داشبورد خالی دیده می‌شد (باگ DASH-01
          // که R3C اصلاح می‌کند، چون بخش Gateway سقف را نشان می‌دهد).
          dailyLimit:
            budgetRow && budgetRow.daily_limit !== null && budgetRow.daily_limit !== undefined
              ? String(budgetRow.daily_limit)
              : null,
          dailySpent: budgetRow ? asNumber(budgetRow.daily_spent) : null,
          budgetDate: budgetRow ? asString(budgetRow.budget_date) : null,
          // R3C-RECOVERY §4: جمع کورکورانهٔ مبلغ‌های ledger (رزرو
          // و آزادسازی و تسویه و رد، با هم) حذف شد؛ به‌جای آن،
          // باقی‌ماندهٔ روزانهٔ قابل اتکا و مصالحه‌های باز نشان
          // داده می‌شوند و هر مقدار نامطمئن، «نامشخص» است.
          remainingDaily: remainingDailyBudget(
            budgetRow?.daily_limit,
            budgetRow?.daily_spent,
            budgetRow ? asString(budgetRow.budget_date) : null,
            gatewaySummary.costBases,
            new Date().toISOString().slice(0, 10),
          ),
          openReconciliationCount: openReconciliations.count,
          openExcessCount: openReconciliations.excessCount,
          openExcessTotal: openReconciliations.excessTotal,
          openUnknownCount: openReconciliations.unknownCount,
        },
        pointers: pointerRows.map((r) => ({
          slug: asString(r.slug),
          canonicalPath: asString(r.canonical_path),
          publishedVersionId:
            typeof r.published_version_id === "string" ? r.published_version_id : null,
        })),
        awaitingItems: awaitingRows.map((r) => ({
          id: asString(r.id),
          workKey: asString(r.work_key),
          title: asString(r.title),
          status: asString(r.status),
          executionMode: typeof r.execution_mode === "string" ? r.execution_mode : null,
          workflowVersion: typeof r.workflow_version === "string" ? r.workflow_version : null,
          createdAt: asString(r.created_at),
          resultArtifactId: typeof r.result_artifact_id === "string" ? r.result_artifact_id : null,
        })),
        artifactsReadyCount: readyArtifacts.length,
        approvalsForAwaiting: countByStatus(awaitingApprovals.map((r) => asString(r.decision))),
        gateway: {
          totalCalls: gatewaySummary.totalCalls,
          totalEstimated: gatewaySummary.totalEstimated,
          totalActual: gatewaySummary.totalActual,
          costBases: gatewaySummary.costBases,
          settledSimulated: gatewaySettledSimulated,
          openReservations: gatewayOpenReservations,
          latestOperations: gatewayLatest.map((r) => ({
            id: asString(r.id),
            state: asString(r.state),
            providerCalls: asNumber(r.provider_calls),
            reservedAmount: r.reserved_amount === null ? null : asNumber(r.reserved_amount),
            settledAmount: r.settled_amount === null ? null : asNumber(r.settled_amount),
            actualCost: r.actual_cost === null ? null : asNumber(r.actual_cost),
            estimatedCost: r.estimated_cost === null ? null : asNumber(r.estimated_cost),
            unresolvedExcess: r.unresolved_excess === null ? null : asNumber(r.unresolved_excess),
            costBasis: typeof r.cost_basis === "string" ? r.cost_basis : null,
            costUnit: typeof r.cost_unit === "string" ? r.cost_unit : null,
            updatedAt: asString(r.updated_at),
          })),
        },
      },
    };
  } catch {
    return { ok: false, reason: "read_error" };
  }
}
