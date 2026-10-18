import { logger } from '@/lib/logger';

export interface ApiClientConfig {
  baseUrl?: string;
  headers?: Record<string, string>;
}

export class ApiError extends Error {
  status: number;
  info?: unknown;

  constructor(message: string, status: number, info?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.info = info;
  }
}

export class ApiClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;

  constructor(config?: ApiClientConfig) {
    this.baseUrl = config?.baseUrl || process.env.NEXT_PUBLIC_API_BASE_URL || '';
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...(config?.headers || {}),
    };
  }

  private getAuthHeader(): Record<string, string> {
    const token = process.env.API_SECRET_TOKEN;
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
    return {};
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      ...this.defaultHeaders,
      ...this.getAuthHeader(),
      ...(options.headers || {}),
    };

    let response: Response;
    try {
      response = await fetch(url, {
        ...options,
        headers,
      });
    } catch (error) {
      logger.error('Network error during API request', { url, error });
      throw new ApiError('خطا در ارتباط با شبکه. لطفاً اتصال خود را بررسی کنید.', 0, error);
    }

    let data: unknown;
    try {
      const text = await response.text();
      data = text ? JSON.parse(text) : null;
    } catch (error) {
      logger.error('Failed to parse response JSON', { url, error });
      data = null;
    }

    if (!response.ok) {
      const errorMessage = (typeof data === 'object' && data !== null && 'message' in data)
        ? String((data as { message: unknown }).message)
        : `خطای سرور: ${response.status}`;

      logger.error('API returned error status', { url, status: response.status, data });
      throw new ApiError(errorMessage, response.status, data);
    }

    return data as T;
  }

  async get<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T>(endpoint: string, body: unknown, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async put<T>(endpoint: string, body: unknown, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  async delete<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
