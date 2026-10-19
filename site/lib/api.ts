import { Logger } from './logger';

export { Logger };

const logger = new Logger();

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function logApiError(message: string, extras?: Record<string, unknown>): void {
  logger.api('error', message, extras);
}

async function parseJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid JSON response';
    logApiError(message, { status: response.status });
    throw error;
  }
}

export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  if (typeof url !== 'string' || url.length === 0) {
    const message = 'API url is required';
    logApiError(message);
    throw new ApiError(message, 400);
  }

  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'API request failed';
    logApiError(message, { url });
    throw error;
  }

  if (!response.ok) {
    const message = `API request failed with status ${response.status}`;
    logApiError(message, { url, status: response.status });
    throw new ApiError(message, response.status);
  }

  return (await parseJson(response)) as T;
}

export async function apiSend<T>(
  url: string,
  method: 'POST' | 'PUT' | 'PATCH',
  body: Record<string, unknown>,
): Promise<T> {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    const message = 'API body must be a JSON object';
    logApiError(message, { url, method });
    throw new ApiError(message, 400);
  }

  return apiFetch<T>(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}
