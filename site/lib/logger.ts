export class Logger {
  private static formatMessage(level: string, message: string, meta?: Record<string, unknown>): string {
    const timestamp = new Date().toISOString();
    const sanitizedMeta = meta ? JSON.stringify(meta) : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message} ${sanitizedMeta}`;
  }

  public static info(message: string, meta?: Record<string, unknown>): void {
    const formatted = Logger.formatMessage('info', message, meta);
    console.log(formatted);
  }

  public static warn(message: string, meta?: Record<string, unknown>): void {
    const formatted = Logger.formatMessage('warn', message, meta);
    console.warn(formatted);
  }

  public static error(message: string, meta?: Record<string, unknown>): void {
    const formatted = Logger.formatMessage('error', message, meta);
    console.error(formatted);
  }

  public static api(route: string, status: number, message: string, meta?: Record<string, unknown>): void {
    const formatted = Logger.formatMessage('api', `Route: ${route} | Status: ${status} | ${message}`, meta);
    if (process.env.NODE_ENV !== 'test') {
      console.log(formatted);
    }
  }
}
