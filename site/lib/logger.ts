type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogContext = Record<string, unknown>;

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function resolveLevel(): LogLevel {
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

  private formatMessage(level: string, message: string): string {
    const timestamp = new Date().toISOString();
    const upperLevel = level.toUpperCase();
    const safeMessage = typeof message === 'string' ? message : String(message);
    return `[${timestamp}] [${upperLevel}] ${safeMessage}`;
  }

  debug(message: string, context?: LogContext, error?: unknown): void {
    if (!this.isEnabled('debug')) {
      return;
    }
    const formatted = this.formatMessage('DEBUG', message);
    if (context || error) {
      console.log(formatted, { ...(context ?? {}), ...(error !== undefined ? { error: toErrorPayload(error) } : {}) });
    } else {
      console.log(formatted);
    }
  }

  info(message: string, context?: LogContext, error?: unknown): void {
    if (!this.isEnabled('info')) {
      return;
    }
    const formatted = this.formatMessage('INFO', message);
    if (context || error) {
      console.log(formatted, { ...(context ?? {}), ...(error !== undefined ? { error: toErrorPayload(error) } : {}) });
    } else {
      console.log(formatted);
    }
  }

  warn(message: string, context?: LogContext, error?: unknown): void {
    if (!this.isEnabled('warn')) {
      return;
    }
    const formatted = this.formatMessage('WARN', message);
    if (context || error) {
      console.warn(formatted, { ...(context ?? {}), ...(error !== undefined ? { error: toErrorPayload(error) } : {}) });
    } else {
      console.warn(formatted);
    }
  }

  error(message: string, context?: LogContext, error?: unknown): void {
    if (!this.isEnabled('error')) {
      return;
    }
    const formatted = this.formatMessage('ERROR', message);
    if (context || error) {
      console.error(formatted, { ...(context ?? {}), ...(error !== undefined ? { error: toErrorPayload(error) } : {}) });
    } else {
      console.error(formatted);
    }
  }

  log(message: string, context?: LogContext, error?: unknown): void {
    this.info(message, context, error);
  }
}

export const logger = new Logger();

export default logger;
