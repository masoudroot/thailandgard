export class Logger {
  formatMessage(level: string, message: string, meta?: Record<string, unknown>): string {
    const timestamp = new Date().toISOString();
    return JSON.stringify({ timestamp, level, message, meta });
  }
}