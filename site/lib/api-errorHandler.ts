import { NextResponse } from 'next/server';
import { logger } from './logger';

export class ApiError extends Error {
  readonly statusCode: number;
  readonly details?: unknown;
  constructor(message: string, statusCode: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class ValidationError extends Error {
  readonly code: string;
  constructor(message: string, code = 'INVALID_INPUT') {
    super(message);
    this.name = 'ValidationError';
    this.code = code;
  }
}

export class AuthenticationError extends Error {
  readonly code: string;
  constructor(message = 'Authentication required', code = 'UNAUTHENTICATED') {
    super(message);
    this.name = 'AuthenticationError';
    this.code = code;
  }
}

export class AuthorizationError extends Error {
  readonly code: string;
  constructor(message = 'Permission denied', code = 'FORBIDDEN') {
    super(message);
    this.name = 'AuthorizationError';
    this.code = code;
  }
}

export interface ApiErrorContext {
  route: string;
  method?: string;
}

export interface ErrorDescriptor {
  status: number;
  code: string;
  message: string;
}

export interface NormalizedError {
  status: number;
  code: string;
  message: string;
  logMessage: string;
  stack?: string;
  cause?: unknown;
}

const DEFAULT_MESSAGES: Record<number, string> = {
  400: 'The request could not be processed due to invalid input.',
  401: 'Authentication is required to access this resource.',
  403: 'You do not have permission to access this resource.',
  500: 'An unexpected error occurred. Please try again later.',
};

function pickStatus(status: number): number {
  if (status === 400 || status === 401 || status === 403) {
    return status;
  }
  return 500;
}

function normalizeError(error: unknown): NormalizedError {
  if (error instanceof ValidationError) {
    return {
      status: 400,
      code: error.code,
      message: error.message,
      logMessage: error.message,
      stack: error.stack,
    };
  }
  if (error instanceof AuthenticationError) {
    return {
      status: 401,
      code: error.code,
      message: error.message,
      logMessage: error.message,
      stack: error.stack,
    };
  }
  if (error instanceof AuthorizationError) {
    return {
      status: 403,
      code: error.code,
      message: error.message,
      logMessage: error.message,
      stack: error.stack,
    };
  }
  if (error instanceof SyntaxError) {
    return {
      status: 400,
      code: 'MALFORMED_REQUEST',
      message: DEFAULT_MESSAGES[400],
      logMessage: `Malformed request body: ${error.message}`,
      stack: error.stack,
    };
  }
  if (error instanceof ApiError) {
    return {
      status: error.statusCode,
      code: 'CUSTOM_ERROR',
      message: error.message,
      logMessage: error.message,
      stack: error.stack,
      cause: error.details,
    };
  }
  if (error instanceof Error) {
    return {
      status: 500,
      code: 'INTERNAL_ERROR',
      message: DEFAULT_MESSAGES[500],
      logMessage: error.message,
      stack: error.stack,
      cause: error.cause,
    };
  }
  return {
    status: 500,
    code: 'INTERNAL_ERROR',
    message: DEFAULT_MESSAGES[500],
    logMessage: 'Unknown error of non-Error type was thrown.',
  };
}

function buildSafeMessage(status: number, requested: string): string {
  if (status === 400) {
    return requested;
  }
  const fallback = DEFAULT_MESSAGES[status] ?? DEFAULT_MESSAGES[500];
  const isProduction = process.env.NODE_ENV === 'production';
  return isProduction ? fallback : requested;
}

export function handleApiError(
  error: unknown,
  context: ApiErrorContext,
): NextResponse {
  const normalized = normalizeError(error);
  const status = pickStatus(normalized.status);
  logger.warn('API request failed', {
    route: context.route,
    method: context.method ?? 'UNKNOWN',
    status,
    code: normalized.code,
    message: normalized.logMessage,
    stack: normalized.stack,
    cause: normalized.cause,
  });
  const message = buildSafeMessage(status, normalized.message);
  return NextResponse.json(
    { error: { message, code: normalized.code } },
    { status },
  );
}

export interface FieldRule {
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'object' | 'array';
  minLength?: number;
  maxLength?: number;
}

export type ValidationSchema = Record<string, FieldRule>;

function matchesType(value: unknown, type: FieldRule['type']): boolean {
  switch (type) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'array':
      return Array.isArray(value);
    case 'object':
      return typeof value === 'object' && value !== null && !Array.isArray(value);
    default:
      return true;
  }
}

function assertField(
  field: string,
  value: unknown,
  rule: FieldRule,
): void {
  if (value === undefined || value === null) {
    if (rule.required) {
      throw new ValidationError(`Field "${field}" is required.`, 'MISSING_FIELD');
    }
    return;
  }
  if (!matchesType(value, rule.type)) {
    throw new ValidationError(
      `Field "${field}" must be of type ${rule.type}.`,
      'INVALID_FIELD_TYPE',
    );
  }
  if (typeof value === 'string') {
    if (rule.minLength !== undefined && value.length < rule.minLength) {
      throw new ValidationError(
        `Field "${field}" must be at least ${rule.minLength} characters long.`,
        'FIELD_TOO_SHORT',
      );
    }
    if (rule.maxLength !== undefined && value.length > rule.maxLength) {
      throw new ValidationError(
        `Field "${field}" must be at most ${rule.maxLength} characters long.`,
        'FIELD_TOO_LONG',
      );
    }
  }
}

export function assertValidInput(
  input: unknown,
  schema: ValidationSchema,
): Record<string, unknown> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new ValidationError(
      'Request body must be a JSON object.',
      'INVALID_BODY',
    );
  }
  const source = input as Record<string, unknown>;
  for (const [field, rule] of Object.entries(schema)) {
    assertField(field, source[field], rule);
  }
  return source;
}