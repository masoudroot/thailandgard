import "./server-guard";
import type {
  CostBasis,
  GatewayRequest,
  GatewayUsage,
} from "./types";

/**
 * واسط Provider مدل. منطق دامنه هرگز مستقیم با یک مدل حرف نمی‌زند؛
 * فقط با این واسط و از راه رجیستری.
 *
 * هیچ میدان Endpoint و کلید و Model ID واقعی در این واسط نیست. Provider
 * واقعی، کلیدش را فقط از محیط سمت سرور خودش می‌خواند و این Gateway
 * هرگز کلید را لمس نمی‌کند.
 */
export type ProviderStatus = "available" | "blocked";

export interface ProviderCallInput {
  request: GatewayRequest;
  signal: AbortSignal;
}

export interface ProviderCallResult {
  output: unknown;
  usage: GatewayUsage;
  cost: number;
  /**
   * مبنای هزینهٔ گزارش‌شده. وقتی Provider چیزی اعلام نکند، Gateway
   * آن را `estimated` می‌گیرد، نه هزینهٔ قطعی.
   */
  cost_basis?: CostBasis;
  /**
   * واحد هزینه؛ وقتی اعلام نشود، رشتهٔ تهی است و هیچ واحد پولی
   * به آن نسبت داده نمی‌شود.
   */
  cost_unit?: string;
}

export interface ModelProvider {
  readonly id: string;
  readonly status: ProviderStatus;
  readonly blockedReason?: string;
  call(input: ProviderCallInput): Promise<ProviderCallResult>;
}

export class ProviderBlockedError extends Error {
  readonly code = "provider_blocked" as const;

  constructor(providerId: string, reason: string) {
    super(`provider ${providerId} is blocked: ${reason}`);
    this.name = "ProviderBlockedError";
  }
}

/**
 * رجیستری Providerها. `list` فقط شناسه و وضعیت و دلیل را برمی‌گرداند؛
 * هیچ Endpoint و کلیدی از این‌جا بیرون نمی‌آید.
 */
export class ProviderRegistry {
  private readonly providers = new Map<string, ModelProvider>();

  register(provider: ModelProvider): void {
    this.providers.set(provider.id, provider);
  }

  get(id: string): ModelProvider | undefined {
    return this.providers.get(id);
  }

  list(): Array<{
    id: string;
    status: ProviderStatus;
    blockedReason?: string;
  }> {
    return [...this.providers.values()].map((provider) => ({
      id: provider.id,
      status: provider.status,
      blockedReason: provider.blockedReason,
    }));
  }
}

/**
 * ورودی مسدود Muse Spark.
 *
 * دلیل: ثبت Provider، چهار جزء هم‌زمان می‌خواهد: API رسمی و Model ID و
 * Endpoint و Credential آزمایشی معتبر. صفحهٔ رسمی Meta برای Model API
 * می‌گوید این API در پیش‌نمایش عمومی است و دسترسی مستقیم به Muse Spark
 * می‌دهد، ولی Credential آزمایشی در این بسته نیست و جزء Credential
 * شرط، خالی است. پس فراخوان واقعی این Provider با همین وضعیت رد می‌شود
 * و هیچ Endpoint و Model ID و کلیدی این‌جا ثبت نشده است.
 * محیط Muse یا رابط کاربری Muse هرگز Runtime API فرض نشده است.
 */
class BlockedMuseSparkProvider implements ModelProvider {
  readonly id = "muse-spark";

  readonly status = "blocked" as const;

  readonly blockedReason =
    "blocked_missing_provider_access: registration requires official API, " +
    "model ID, endpoint, and a valid trial credential together; the official " +
    "Meta Model API surface is in public preview, but no trial credential is " +
    "available in this package, so the credential leg is missing and no real " +
    "call may be made. No endpoint, model ID, or key is recorded here.";

  call(): Promise<never> {
    return Promise.reject(
      new ProviderBlockedError(this.id, this.blockedReason),
    );
  }
}

/**
 * رجیستری پیش‌فرض: فقط ورودی مسدود Muse Spark. Mock و هر Provider
 * دیگر را فراخواننده با `register` اضافه می‌کند.
 */
export function createDefaultRegistry(): ProviderRegistry {
  const registry = new ProviderRegistry();
  registry.register(new BlockedMuseSparkProvider());
  return registry;
}
