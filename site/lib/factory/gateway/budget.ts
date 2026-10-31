import "./server-guard";

/**
 * دفتر رزرو محلی Gateway (R3A-SAFE، نسخهٔ r3-gateway-3).
 *
 * میدان‌ها آینهٔ جدول‌های R2 است: factory_cost_ledger با
 * id و work_item_id و attempt_id و entry_kind و amount و created_at،
 * و factory_daily_budgets با budget_date و daily_limit و daily_spent.
 *
 * سیاست سقف Fail-closed، یکسان با رفتار RPCهای reserve_budget و
 * release_budget:
 * - سقف کار null (ورودی نداشتن در نقشهٔ سقف): درخواست رد می‌شود، با
 *   دلیل `not_configured`، پیش از هر فراخوان Provider و بدون سطر
 *   rejected. حتی برآورد صفر هم با سقف کار null رد می‌شود، چون RPC
 *   برای سقف کار null بی‌قیدوشرط false برمی‌گرداند و Gateway نباید
 *   با RPC تناقض داشته باشد؛ تغییر RPC خارج از دامنه است، چون Tick
 *   هم از همان RPC استفاده می‌کند.
 * - سقف روز null مثل ۰ رفتار می‌کند (برابری با coalesce در RPC):
 *   برآورد مثبت با سطر rejected و دلیل `exceeded` رد می‌شود و برآورد
 *   صفر مجاز است.
 * - سقف کار ۰: برآورد مثبت رد (با سطر rejected) و برآورد صفر مجاز.
 * - هر دو سقف (کار و روز) همیشه اعمال می‌شوند.
 *
 * تفاوت آگاهانهٔ مانده با RPC: تاریخ روز با ساعت UTC گرفته می‌شود.
 */
export type LedgerEntryKind =
  | "reservation"
  | "commit"
  | "release"
  | "rejected";

export interface LedgerEntry {
  id: string;
  work_item_id: string;
  attempt_id: string;
  entry_kind: LedgerEntryKind;
  amount: number;
  created_at: string;
}

export type ReserveReason = "exceeded" | "not_configured";

export type ReserveResult =
  | { ok: true }
  | { ok: false; reason: ReserveReason };

export interface BudgetLedgerConfig {
  dailyLimit: number | null;
  workItemLimits?: ReadonlyMap<string, number | null>;
}

export class InMemoryBudgetLedger {
  private readonly dailyLimit: number | null;

  private readonly workItemLimits: ReadonlyMap<string, number | null>;

  private readonly daily = new Map<
    string,
    { daily_limit: number; daily_spent: number }
  >();

  private readonly workItemSpent = new Map<string, number>();

  private readonly rows: LedgerEntry[] = [];

  constructor(config: BudgetLedgerConfig) {
    this.dailyLimit = config.dailyLimit;
    this.workItemLimits = config.workItemLimits ?? new Map();
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private dayRow(): { daily_limit: number; daily_spent: number } {
    const key = this.today();
    const existing = this.daily.get(key);
    if (existing) {
      return existing;
    }
    const row = {
      daily_limit: this.dailyLimit ?? 0,
      daily_spent: 0,
    };
    this.daily.set(key, row);
    return row;
  }

  private append(
    entry_kind: LedgerEntryKind,
    work_item_id: string,
    attempt_id: string,
    amount: number,
  ): void {
    this.rows.push({
      id: crypto.randomUUID(),
      work_item_id,
      attempt_id,
      entry_kind,
      amount,
      created_at: new Date().toISOString(),
    });
  }

  /**
   * رزرو بودجه پیش از فراخوان. `ok: false` یعنی سقف رد شد و Provider
   * اصلاً صدا زده نمی‌شود. دلیل `not_configured` یعنی سقف کار معتبر
   * نیست و هیچ سطر rejected نوشته نمی‌شود؛ دلیل `exceeded` یعنی از
   * سقف گذشته و سطر rejected نوشته می‌شود.
   */
  reserve(
    work_item_id: string,
    attempt_id: string,
    amount: number,
  ): ReserveResult {
    const itemLimit = this.workItemLimits.get(work_item_id) ?? null;
    if (itemLimit === null) {
      return { ok: false, reason: "not_configured" };
    }
    const itemSpent = this.workItemSpent.get(work_item_id) ?? 0;
    const day = this.dayRow();
    if (
      itemSpent + amount > itemLimit ||
      day.daily_spent + amount > day.daily_limit
    ) {
      this.append("rejected", work_item_id, attempt_id, amount);
      return { ok: false, reason: "exceeded" };
    }
    this.append("reservation", work_item_id, attempt_id, amount);
    this.workItemSpent.set(work_item_id, itemSpent + amount);
    day.daily_spent += amount;
    return { ok: true };
  }

  release(
    work_item_id: string,
    attempt_id: string,
    amount: number,
  ): void {
    if (amount <= 0) {
      return;
    }
    this.append("release", work_item_id, attempt_id, amount);
    const itemSpent = this.workItemSpent.get(work_item_id) ?? 0;
    this.workItemSpent.set(work_item_id, Math.max(0, itemSpent - amount));
    const day = this.dayRow();
    day.daily_spent = Math.max(0, day.daily_spent - amount);
  }

  /**
   * ثبت هزینهٔ واقعی. خرجِ ثبت‌شده را جابه‌جا نمی‌کند؛ تسویهٔ
   * مابه‌التفاوت برآورد و واقعی با release جداگانه انجام می‌شود.
   */
  commit(
    work_item_id: string,
    attempt_id: string,
    amount: number,
  ): void {
    this.append("commit", work_item_id, attempt_id, amount);
  }

  entries(): readonly LedgerEntry[] {
    return this.rows;
  }

  dailySpent(): number {
    return this.dayRow().daily_spent;
  }

  workItemSpentAmount(work_item_id: string): number {
    return this.workItemSpent.get(work_item_id) ?? 0;
  }
}
