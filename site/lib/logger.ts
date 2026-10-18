type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogContext = Record<string, unknown>;

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function resolveLevel(): LogLevel {
  const raw = typeof process !== 'undefined' ? process.env?.LOG_LEVEL : undefined;
  const normalized = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (normalized === 'debug' || normalized === 'info' || normalized === 'warn' || normalized === 'error') {
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

export class Logger {
  private readonly minLevel: LogLevel;

  constructor(minLevel?: LogLevel) {
    this.minLevel = minLevel ?? resolveLevel();
  }

  private isEnabled(level: LogLevel): boolean {
    return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[this.minLevel];
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const upperLevel = level.toUpperCase();
    const safeMessage = typeof message === 'string' ? message : String(message);
    const contextPart =
      context && Object.keys(context).length > 0 ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${upperLevel}] ${safeMessage}${contextPart}`;
  }

  debug(message: string, context?: LogContext, error?: unknown): void {
    if (!this.isEnabled('debug')) {
      return;
    }
    const merged: LogContext = { ...(context ?? {}) };
    if (error !== undefined) {
      merged.error = toErrorPayload(error);
    }
    const formatted = this.formatMessage('debug', message, merged);
    console.log(formatted);
  }

  info(message: string, context?: LogContext, error?: unknown): void {
    if (!this.isEnabled('info')) {
      return;
    }
    const merged: LogContext = { ...(context ?? {}) };
    if (error !== undefined) {
      merged.error = toErrorPayload(error);
    }
    const formatted = this.formatMessage('info', message, merged);
    console.log(formatted);
  }

  warn(message: string, context?: LogContext, error?: unknown): void {
    if (!this.isEnabled('warn')) {
      return;
    }
    const merged: LogContext = { ...(context ?? {}) };
    if (error !== undefined) {
      merged.error = toErrorPayload(error);
    }
    const formatted = this.formatMessage('warn', message, merged);
    console.warn(formatted);
  }

  error(message: string, context?: LogContext, error?: unknown): void {
    if (!this.isEnabled('error')) {
      return;
    }
    const merged: LogContext = { ...(context ?? {}) };
    if (error !== undefined) {
      merged.error = toErrorPayload(error);
    }
    const formatted = this.formatMessage('error', message, merged);
    console.error(formatted);
  }
}

export const logger = new Logger();

export default logger;
