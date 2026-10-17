export enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  DEBUG = 'DEBUG'
}

export class Logger {
  private static formatMessage(level: LogLevel, message: string, meta?: Record<string, unknown>): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` | ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level}]: ${message}${metaStr}`;
  }

  static info(message: string, meta?: Record<string, unknown>): void {
    const formatted = Logger.formatMessage(LogLevel.INFO, message, meta);
    console.log(formatted);
  }

  static warn(message: string, meta?: Record<string, unknown>): void {
    const formatted = Logger.formatMessage(LogLevel.WARN, message, meta);
    console.warn(formatted);
  }

  static error(message: string, meta?: Record<string, unknown>): void {
    const formatted = Logger.formatMessage(LogLevel.ERROR, message, meta);
    console.error(formatted);
  }

  static debug(message: string, meta?: Record<string, unknown>): void {
    if (process.env.NODE_ENV !== 'production') {
      const formatted = Logger.formatMessage(LogLevel.DEBUG, message, meta);
      console.debug(formatted);
    }
  }

  static api(method: string, path: string, statusCode: number, durationMs?: number, meta?: Record<string, unknown>): void {
    const message = `API ${method.toUpperCase()} ${path} - Status: ${statusCode}${durationMs !== undefined ? ` - ${durationMs}ms` : ''}`;
    const formatted = Logger.formatMessage(LogLevel.INFO, message, meta);
    console.log(formatted);
  }
}