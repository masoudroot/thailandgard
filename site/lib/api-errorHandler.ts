import { NextResponse } from 'next/server';
import { logger } from './logger';

function toHttpStatus(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 400 && value <= 599) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed >= 400 && parsed <= 599) {
      return parsed;
    }
  }

  return undefined;
}

function getErrorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') {
    return undefined;
  }

  const candidate = error as Record<string, unknown>;
  const response = candidate.response as Record<string, unknown> | undefined;

  return (
    toHttpStatus(candidate.status) ??
    toHttpStatus(candidate.statusCode) ??
    toHttpStatus(candidate.code) ??
    toHttpStatus(candidate.httpStatus) ??
    toHttpStatus(response?.status)
  );
}

function getErrorReason(status: number): string {
  if (status === 400) return 'BadRequest';
  if (status === 401) return 'Unauthorized';
  if (status === 403) return 'Forbidden';
  if (status === 404) return 'NotFound';
  if (status === 405) return 'MethodNotAllowed';
  if (status === 408) return 'RequestTimeout';
  if (status === 409) return 'Conflict';
  if (status === 422) return 'UnprocessableEntity';
  if (status === 429) return 'TooManyRequests';
  if (status >= 400 && status < 500) return 'ClientError';
  return 'InternalServerError';
}

function getClientMessage(status: number): string {
  if (status === 400) return 'Bad request.';
  if (status === 401) return 'Authentication is required.';
  if (status === 403) return 'Access is forbidden.';
  if (status === 404) return 'Resource was not found.';
  if (status === 405) return 'Method is not allowed.';
  if (status === 408) return 'Request timed out.';
  if (status === 409) return 'Request conflict.';
  if (status === 422) return 'Validation failed.';
  if (status === 429) return 'Too many requests.';
  if (status >= 400 && status < 500) return 'Request failed.';
  return 'Internal server error.';
}

export function apiErrorHandler(error: unknown): NextResponse {
  logger.error('api-error', {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });

  const status = getErrorStatus(error) ?? 500;

  return NextResponse.json(
    {
      error: getErrorReason(status),
      message: getClientMessage(status),
    },
    { status },
  );
}

export const handleApiError = apiErrorHandler;
export const errorHandler = apiErrorHandler;
export default apiErrorHandler;
