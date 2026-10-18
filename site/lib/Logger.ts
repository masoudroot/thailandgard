// site/lib/Logger.ts
class Logger {
  private formatMessage(level: string, message: string, meta?: Record<string, unknown>): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
  }

  public info(message: string, meta?: Record<string, unknown>): void {
    const formatted = this.formatMessage('info', message, meta);
    console.log(formatted);
  }

  public error(message: string, meta?: Record<string, unknown>): void {
    const formatted = this.formatMessage('error', message, meta);
    console.error(formatted);
  }

  public api(route: string, method: string, statusCode: number, responseTime?: number): void {
    const message = `${method} ${route} -> ${statusCode}`;
    const meta = responseTime !== undefined ? { responseTime } : undefined;
    const formatted = this.formatMessage('info', message, meta);
    console.log(formatted);
  }
}

export default Logger;
