export class Logger {
  private static formatMessage(level: string, message: string, meta?: Record<string, unknown>): string {
    const timestamp = new Date().toISOString();
    const metaString = meta ? JSON.stringify(meta) : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message} ${metaString}`;
  }

  public static info(message: string, meta?: Record<string, unknown>): void {
    const formatted = Logger.formatMessage('info', message, meta);
    console.log(formatted);
  }

  public static error(message: string, meta?: Record<string, unknown>): void {
    const formatted = Logger.formatMessage('error', message, meta);
    console.error(formatted);
  }

  public static warn(message: string, meta?: Record<string, unknown>): void {
    const formatted = Logger.formatMessage('warn', message, meta);
    console.warn(formatted);
  }

  public static api(message: string, meta?: Record<string, unknown>): string {
    return Logger.formatMessage('api', message, meta);
  }
}
