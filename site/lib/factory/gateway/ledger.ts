import "./server-guard";
import { InMemoryBudgetLedger } from "./budget";

/**
 * آداپتور دفتر بودجهٔ Gateway (R3-A دلتا، نسخهٔ r3-gateway-2).
 *
 * دو حالت دارد:
 * - حالت محلی: دور InMemoryBudgetLedger، برای تست‌های واحد.
 * - حالت PostgREST سمت سرور: reserve و release با RPCهای واقعی
 *   reserve_budget و release_budget، و commit با insert مستقیم
 *   PostgREST روی factory_cost_ledger (برای commit، RPCای نیست).
 *
 * سربرگ‌ها آینهٔ الگوی internal-api.ts است: apikey و Bearer با کلید
 * service_role که فقط سمت سرور می‌ماند و هرگز به مرورگر نمی‌رسد.
 *
 * نکتهٔ attempt_id در حالت PostgREST: شناسهٔ attempt در Gateway،
 * شناسهٔ سطر factory_attempts نیست و factory_attempts.work_step_id
 * تهی‌پذیر نیست؛ پس ساختن سطر attempt ساختگی، مستلزم ساختن قدم
 * ساختگی هم هست و انجام نمی‌شود. RPCها p_attempt_id تهی را
 * می‌پذیرند (ستون تهی‌پذیر است) و سطرها با work_item_id قابل
 * انتساب‌اند. وقتی اتصال Tick برسد، فراخواننده شناسهٔ attempt
 * واقعی کارخانه را می‌دهد.
 */
export interface BudgetLedger {
  reserve(
    work_item_id: string,
    attempt_id: string,
    amount: number,
  ): Promise<boolean>;
  release(
    work_item_id: string,
    attempt_id: string,
    amount: number,
  ): Promise<void>;
  commit(
    work_item_id: string,
    attempt_id: string,
    amount: number,
  ): Promise<void>;
}

export class LedgerError extends Error {
  readonly code = "ledger_error" as const;

  constructor(message: string) {
    super(message);
    this.name = "LedgerError";
  }
}

/**
 * حالت محلی: دور دفتر حافظه‌ای، بدون هیچ فراخوان شبکه.
 */
export class LocalBudgetLedgerAdapter implements BudgetLedger {
  constructor(private readonly inner: InMemoryBudgetLedger) {}

  async reserve(
    work_item_id: string,
    attempt_id: string,
    amount: number,
  ): Promise<boolean> {
    return this.inner.reserve(work_item_id, attempt_id, amount);
  }

  async release(
    work_item_id: string,
    attempt_id: string,
    amount: number,
  ): Promise<void> {
    this.inner.release(work_item_id, attempt_id, amount);
  }

  async commit(
    work_item_id: string,
    attempt_id: string,
    amount: number,
  ): Promise<void> {
    this.inner.commit(work_item_id, attempt_id, amount);
  }
}

export interface PostgrestLedgerConfig {
  url: string;
  serviceKey: string;
  fetchImpl?: typeof fetch;
}

/**
 * حالت PostgREST سمت سرور: رزرو و تسویه روی دیتابیس واقعی.
 * سقف‌ها این‌جا در دیتابیس enforce می‌شوند، نه فقط در کد:
 * reserve_budget سطر rejected می‌نویسد و false برمی‌گرداند، اگر
 * از سقف کار یا سقف روز بگذرد.
 */
export class PostgrestBudgetLedger implements BudgetLedger {
  private readonly url: string;

  private readonly serviceKey: string;

  private readonly fetchImpl: typeof fetch;

  constructor(config: PostgrestLedgerConfig) {
    this.url = config.url.replace(/\/$/, "");
    this.serviceKey = config.serviceKey;
    this.fetchImpl = config.fetchImpl ?? fetch;
  }

  private headers(): Record<string, string> {
    return {
      apikey: this.serviceKey,
      Authorization: `Bearer ${this.serviceKey}`,
      "Content-Type": "application/json",
    };
  }

  private async rpc(
    fn: string,
    body: Record<string, unknown>,
  ): Promise<unknown> {
    const res = await this.fetchImpl(`${this.url}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) {
      throw new LedgerError(`rpc ${fn} failed with ${res.status}`);
    }
    return text ? (JSON.parse(text) as unknown) : null;
  }

  async reserve(
    work_item_id: string,
    _attempt_id: string,
    amount: number,
  ): Promise<boolean> {
    const result = await this.rpc("reserve_budget", {
      p_work_item_id: work_item_id,
      p_attempt_id: null,
      p_amount: amount,
    });
    return result === true;
  }

  async release(
    work_item_id: string,
    _attempt_id: string,
    amount: number,
  ): Promise<void> {
    await this.rpc("release_budget", {
      p_work_item_id: work_item_id,
      p_attempt_id: null,
      p_amount: amount,
    });
  }

  async commit(
    work_item_id: string,
    _attempt_id: string,
    amount: number,
  ): Promise<void> {
    const res = await this.fetchImpl(
      `${this.url}/rest/v1/factory_cost_ledger`,
      {
        method: "POST",
        headers: { ...this.headers(), Prefer: "return=minimal" },
        body: JSON.stringify({
          work_item_id,
          attempt_id: null,
          entry_kind: "commit",
          amount,
        }),
      },
    );
    if (!res.ok) {
      throw new LedgerError(
        `ledger commit insert failed with ${res.status}`,
      );
    }
  }
}
