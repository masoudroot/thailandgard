import "./server-guard";

/**
 * دفتر رزرو محلی Gateway.
 *
 * میدان‌ها آینهٔ جدول‌های R2 است: factory_cost_ledger با
 * id و work_item_id و attempt_id و entry_kind و amount و created_at،
 * و factory_daily_budgets با budget_date و daily_limit و daily_spent.
 * رفتار هم رفتار همان RPCهاست: رد شدن سقف، سطر rejected می‌نویسد و
 * false برمی‌گرداند؛ رزرو، سطر reservation می‌نویسد و خرج را بالا می‌برد؛
 * release، سطر release می‌نویسد و خرج را با کف صفر کم می‌کند.
 *
 * دو تفاوت آگاهانه با R2 که با آداپتور PostgREST سر جایش می‌ماند:
 * ۱) سقف کار اگر تنظیم نشده باشد، یعنی «بدون سقف» (در R2، limit تهی
 *    یعنی رد). Gateway جدول کار ندارد، پس سقف نامشخص را رد نمی‌کند.
 * ۲) تاریخ روز با ساعت UTC گرفته می‌شود.
 *
 * اتصال به RPCهای واقعی reserve_budget و release_budget با PostgREST
 * سمت سرور، در `ledger.ts` (PostgrestBudgetLedger) آمده است و
 * Gateway از راه واسط BudgetLedger با هر دو حالت کار می‌کند.
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

export interface BudgetLedgerConfig {
  dailyLimit: number;
  workItemLimits?: ReadonlyMap<string, number>;
}

export class InMemoryBudgetLedger {
  private readonly dailyLimit: number;

  private readonly workItemLimits: ReadonlyMap<string, number>;

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
    const row = { daily_limit: this.dailyLimit, daily_spent: 0 };
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
   * رزرو بودجه پیش از فراخوان. false یعنی سقف رد شد و Provider
   * اصلاً صدا زده نمی‌شود.
   */
  reserve(
    work_item_id: string,
    attempt_id: string,
    amount: number,
  ): boolean {
    const itemLimit = this.workItemLimits.get(work_item_id);
    const itemSpent = this.workItemSpent.get(work_item_id) ?? 0;
    const day = this.dayRow();
    if (
      (itemLimit !== undefined && itemSpent + amount > itemLimit) ||
      day.daily_spent + amount > day.daily_limit
    ) {
      this.append("rejected", work_item_id, attempt_id, amount);
      return false;
    }
    this.append("reservation", work_item_id, attempt_id, amount);
    this.workItemSpent.set(work_item_id, itemSpent + amount);
    day.daily_spent += amount;
    return true;
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
