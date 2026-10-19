import { logger } from './logger';
import { ApiError } from './api-errorHandler';
export class ApiError extends Error {
  status: number;
  path: string;
  constructor(status: number, message: string, path: string, details?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.path = path;
    this.details = details || message;
  }
  details?: string;
}
export function api<T = unknown>(path: string, options?: {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: HeadersInit;
  timeoutMs?: number;
}): Promise<T> {
  const method = options?.method || 'GET';
  const timeout = options?.timeoutMs || 30000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeout);
  const fetchOptions: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {})
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
    signal: controller.signal
  };
  return fetch(path, fetchOptions)
    .then(async (response) => {
      if (!response.ok) {
        let details: string | undefined;
        try {
          details = await response.json();
        } catch {
          details = await response.text();
        }
        throw new ApiError(response.status, response.statusText, path, JSON.stringify(details));
      }
      return response.json() as Promise<T>;
    })
    .catch((error) => {
      if (error instanceof Error && error.name === 'AbortError') {
        logger.api('warn', `Request aborted for ${method} ${path}`, { timeoutMs: timeout });
        throw new ApiError(408, `Request timeout after ${timeout}ms for ${method} ${path}`, path);
      }
      logger.api('error', `Error in ${method} ${path}: ${error.message}`, { error });
      throw error;
    })
    .finally(() => {
      clearTimeout(timeoutId);
    });
}
