export class Logger {
  private static formatMessage(level: string, message: string, meta?: Record<string, unknown>): string {
    const timestamp = new Date().toISOString();
    const metaString = meta ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}]: ${message}${metaString}`;
  }

  static info(message: string, meta?: Record<string, unknown>): void {
    console.log(this.formatMessage('info', message, meta));
  }

  static error(message: string, error?: unknown, meta?: Record<string, unknown>): void {
    const errorMeta = error instanceof Error ? { ...meta, error: error.message, stack: error.stack } : { ...meta, error };
    console.error(this.formatMessage('error', message, errorMeta));
  }

  static warn(message: string, meta?: Record<string, unknown>): void {
    console.warn(this.formatMessage('warn', message, meta));
  }

  static debug(message: string, meta?: Record<string, unknown>): void {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(this.formatMessage('debug', message, meta));
    }
  }

  static api(method: string, endpoint: string, status: number, durationMs: number, meta?: Record<string, unknown>): void {
    const formatted = this.formatMessage('api', `${method} ${endpoint} - ${status} (${durationMs}ms)`, meta);
    console.log(formatted);
  }
}
