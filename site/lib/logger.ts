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

  private buildEntry(level: LogLevel, message: string, meta?: LogContext): LogEntry {
    const timestamp = new Date().toISOString();
    const safeMessage = typeof message === 'string' ? message : String(message);
    const context =
      meta && Object.keys(meta).length > 0 ? { ...meta } : undefined;
    const formatted = this.formatMessage(level, timestamp, safeMessage, context);
    return { level, timestamp, message: safeMessage, context, formatted };
  }

  private formatMessage(
    level: LogLevel,
    timestamp: string,
    message: string,
    context?: LogContext,
  ): string {
    const upperLevel = level.toUpperCase();
    const contextPart = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${upperLevel}] ${message}${contextPart}`;
  }

  private emit(entry: LogEntry): void {
    if (entry.level === 'error') {
      console.error(entry.formatted);
      return;
    }
    if (entry.level === 'warn') {
      console.warn(entry.formatted);
      return;
    }
    console.log(entry.formatted);
  }

  private write(level: LogLevel, message: string, context?: LogContext, error?: unknown): void {
    if (!this.isEnabled(level)) {
      return;
    }
    const merged: LogContext = { ...(context ?? {}) };
    if (error !== undefined) {
      merged.error = toErrorPayload(error);
    }
    const entry = this.buildEntry(level, message, merged);
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

  api(message: string, context?: LogContext, error?: unknown): void {
    this.write('info', message, context, error);
  }
}

export const logger = new Logger();

export default logger;
