export class Logger {
  private formatMessage(level: string, message: string, extras?: Record<string, unknown>): string {
    const timestamp = new Date().toISOString();
    const base = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    return extras ? `${base} ${JSON.stringify(extras)}` : base;
  }

  api(level: 'info' | 'warn' | 'error', message: string, extras?: Record<string, unknown>): void {
    const msg = this.formatMessage(level, message, extras);
    console.log(msg);
  }
}
