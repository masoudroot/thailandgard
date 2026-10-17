export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  meta?: Record<string, unknown>;
}

export class Logger {
  private static formatMessage(level: LogLevel, message: string, meta?: Record<string, unknown>): string {
    const timestamp = new Date().toISOString();
    const entry: LogEntry = {
      level,
      message,
      timestamp,
      ...(meta ? { meta } : {}),
    };
    return JSON.stringify(entry);
  }

  private static log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    const nodeEnv = process.env.NODE_ENV;
    if (nodeEnv === 'test' && level === LogLevel.DEBUG) {
      return;
    }
    const formatted = Logger.formatMessage(level, message, meta);
    switch (level) {
      case LogLevel.ERROR:
        console.error(formatted);
        break;
      case LogLevel.WARN:
        console.warn(formatted);
        break;
      case LogLevel.INFO:
        console.info(formatted);
        break;
      case LogLevel.DEBUG:
      default:
        console.debug(formatted);
        break;
    }
  }

  public static debug(message: string, meta?: Record<string, unknown>): void {
    Logger.log(LogLevel.DEBUG, message, meta);
  }

  public static info(message: string, meta?: Record<string, unknown>): void {
    Logger.log(LogLevel.INFO, message, meta);
  }

  public static warn(message: string, meta?: Record<string, unknown>): void {
    Logger.log(LogLevel.WARN, message, meta);
  }

  public static error(message: string, meta?: Record<string, unknown>): void {
    Logger.log(LogLevel.ERROR, message, meta);
  }
}
