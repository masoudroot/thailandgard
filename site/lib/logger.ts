type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogContext = Record<string, unknown>;

interface LogEntry {
  level: LogLevel;
  timestamp: string;
  message: string;
  context?: LogContext;
  formatted: string;
}

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const SENSITIVE_KEYS: ReadonlySet<string> = new Set([
  'authorization',
  'proxy-authorization',
  'cookie',
  'cookies',
  'set-cookie',
  'x-api-key',
  'api-key',
  'apikey',
  'password',
  'passwd',
  'pwd',
  'secret',
  'token',
  'access-token',
  'refresh-token',
  'id-token',
  'auth-token',
  'session-id',
  'sessionid',
  'x-auth-token',
]);

function isSensitiveKey(key: string): boolean {
  const normalized = key.trim().toLowerCase().replace(/_/g, '-');
  return (
    SENSITIVE_KEYS.has(normalized) ||
    normalized.includes('token') ||
    normalized.includes('secret') ||
    normalized.includes('password') ||
    normalized.includes('authorization') ||
    normalized.includes('cookie') ||
    normalized.includes('session') ||
    normalized.includes('credential')
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function sanitizeValue(value: unknown, ancestors: object[] = []): unknown {
  if (Array.isArray(value)) {
    if (ancestors.includes(value)) {
      return '[Circular]';
    }
    return value.map((item) => sanitizeValue(item, [...ancestors, value]));
  }

  if (isPlainObject(value)) {
    if (ancestors.includes(value)) {
      return '[Circular]';
    }

    const result: LogContext = {};
    for (const [key, nestedValue] of Object.entries(value)) {
      result[key] = isSensitiveKey(key)
        ? '[REDACTED]'
        : sanitizeValue(nestedValue, [...ancestors, value]);
    }
    return result;
  }

  return value;
}

export function sanitizeContext(context: LogContext): LogContext {
  return sanitizeValue(context) as LogContext;
}

function resolveLevel(): LogLevel {
  const raw = typeof process !== 'undefined' ? process.env?.LOG_LEVEL : undefined;
  const normalized = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (
    normalized === 'debug' ||
    normalized === 'info' ||
    normalized === 'warn' ||
    normalized === 'error'
  ) {
    return normalized;
  }
  return 'info';
}

function isErrorLike(value: unknown): value is Error {
  return value instanceof Error;
}

function toErrorPayload(error: unknown): unknown {
  if (isErrorLike(error)) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  return error;
}

function stringifyUnknown(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  try {
    const serialized = JSON.stringify(value);
    return serialized === undefined ? String(value) : serialized;
  } catch {
    return String(value);
  }
}

export class Logger {
  private readonly minLevel: LogLevel;

  constructor(minLevel?: LogLevel) {
    this.minLevel = minLevel ?? resolveLevel();
  }

  private isEnabled(level: LogLevel): boolean {
    return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[this.minLevel];
  }

  private buildEntry(level: LogLevel, message: string, meta?: LogContext): LogEntry {
    const timestamp = new Date().toISOString();
    const safeMessage = typeof message === 'string' ? message : String(message);
    const context = meta && Object.keys(meta).length > 0 ? { ...meta } : undefined;
    const formatted = Logger.formatMessage(level, timestamp, safeMessage, context);
    return { level, timestamp, message: safeMessage, context, formatted };
  }

  private static formatMessage(
    level: LogLevel,
    timestamp: string,
    message: string,
    context?: LogContext,
  ): string {
    const upperLevel = level.toUpperCase();
    const contextPart = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${upperLevel}] ${message}${contextPart}`;
  }

  private static log(level: LogLevel, formatted: string): void {
    if (level === 'error') {
      console.error(formatted);
      return;
    }
    if (level === 'warn') {
      console.warn(formatted);
      return;
    }
    console.log(formatted);
  }

  private emit(entry: LogEntry): void {
    Logger.log(entry.level, entry.formatted);
  }

  private write(level: LogLevel, message: string, context?: LogContext, error?: unknown): void {
    if (!this.isEnabled(level)) {
      return;
    }

    const merged: LogContext = { ...(context ?? {}) };
    if (error !== undefined) {
      merged.error = toErrorPayload(error);
    }

    const safeContext = sanitizeContext(merged);
    const entry = this.buildEntry(level, message, safeContext);
    this.emit(entry);
  }

  debug(message: string, context?: LogContext, error?: unknown): void {
    this.write('debug', message, context, error);
  }

  info(message: string, context?: LogContext, error?: unknown): void {
    this.write('info', message, context, error);
  }

  warn(message: string, context?: LogContext, error?: unknown): void {
    this.write('warn', message, context, error);
  }

  error(message: string, context?: LogContext, error?: unknown): void {
    this.write('error', message, context, error);
  }

  static api(message: unknown, context?: LogContext): void {
    const level: LogLevel = 'info';
    if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[resolveLevel()]) {
      return;
    }

    const timestamp = new Date().toISOString();
    const safeMessage = stringifyUnknown(message);
    const sanitizedContext = sanitizeContext(context ?? {});
    const contextForLog =
      Object.keys(sanitizedContext).length > 0 ? sanitizedContext : undefined;
    const formatted = this.formatMessage(level, timestamp, safeMessage, contextForLog);

    Logger.log(level, formatted);
  }
}

export const logger = new Logger();

export default logger;