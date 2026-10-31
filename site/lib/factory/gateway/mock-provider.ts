import "./server-guard";
import type {
  ModelProvider,
  ProviderCallInput,
  ProviderCallResult,
} from "./provider";

/**
 * Mock Provider قطعی برای تست قرارداد.
 *
 * سه حالت دارد: ok خروجی معتبر می‌دهد، invalid خروجی‌ای می‌دهد که
 * اسکیمای فراخواننده ردش می‌کند، hang تا زمان abort صبر می‌کند.
 * شمارندهٔ فراخوان، همان شاهد تست‌هاست که Provider دوباره صدا
 * زده نشده است.
 *
 * هزینهٔ Mock، شبیه‌سازی‌شده با واحد `mock-unit` است، نه هزینهٔ
 * واقعی ارائه‌دهنده؛ هر پاسخی این مبنا را با `cost_basis` صریح
 * می‌کند تا هیچ داشبوردی آن را هزینهٔ واقعی نشان ندهد.
 */
export type MockMode = "ok" | "invalid" | "hang";

export interface MockProviderConfig {
  mode?: MockMode;
  output?: unknown;
  invalidOutput?: unknown;
  promptTokens?: number;
  completionTokens?: number;
  /**
   * هزینهٔ هر توکن برای محاسبهٔ هزینهٔ گزارش‌شده. پیش‌فرض صفر است،
   * یعنی هزینهٔ واقعی mock صفر ثبت می‌شود.
   */
  costPerToken?: number;
}

function abortError(): Error {
  const error = new Error("provider call aborted");
  error.name = "AbortError";
  return error;
}

export class MockProvider implements ModelProvider {
  readonly id = "mock";

  readonly status = "available" as const;

  private calls = 0;

  private readonly config: MockProviderConfig;

  constructor(config: MockProviderConfig = {}) {
    this.config = config;
  }

  getCallCount(): number {
    return this.calls;
  }

  async call({ signal }: ProviderCallInput): Promise<ProviderCallResult> {
    this.calls += 1;
    const mode = this.config.mode ?? "ok";
    if (mode === "hang") {
      await new Promise<void>((_resolve, reject) => {
        if (signal.aborted) {
          reject(abortError());
          return;
        }
        signal.addEventListener("abort", () => reject(abortError()), {
          once: true,
        });
      });
    }
    if (signal.aborted) {
      throw abortError();
    }
    const promptTokens = this.config.promptTokens ?? 10;
    const completionTokens = this.config.completionTokens ?? 5;
    const totalTokens = promptTokens + completionTokens;
    const cost = totalTokens * (this.config.costPerToken ?? 0);
    const usage = { promptTokens, completionTokens, totalTokens };
    if (mode === "invalid") {
      return {
        output: this.config.invalidOutput ?? { wrong: true },
        usage,
        cost,
        cost_basis: "simulated",
        cost_unit: "mock-unit",
      };
    }
    return {
      output: this.config.output ?? { answer: "mock-ok" },
      usage,
      cost,
      cost_basis: "simulated",
      cost_unit: "mock-unit",
    };
  }
}
