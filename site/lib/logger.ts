export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface LogMeta {
  [key: string]: unknown;
}

export class Logger {
  private context: string;

  constructor(context: string = 'App') {
    this.context = context;
  }

  private formatMessage(level: LogLevel, message: string, meta?: LogMeta): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] [${this.context}]: ${message}${metaStr}`;
  }

  public info(message: string, meta?: LogMeta): void {
    const finalMessage = this.formatMessage('info', message, meta);
    console.info(finalMessage);
  }

  public warn(message: string, meta?: LogMeta): void {
    const finalMessage = this.formatMessage('warn', message, meta);
    console.warn(finalMessage);
  }

  public error(message: string, meta?: LogMeta): void {
    const finalMessage = this.formatMessage('error', message, meta);
    console.error(finalMessage);
  }

  public debug(message: string, meta?: LogMeta): void {
    const finalMessage = this.formatMessage('debug', message, meta);
    console.debug(finalMessage);
  }

  public api(method: string, endpoint: string, status: number, durationMs: number, meta?: LogMeta): void {
    const rawMessage = `API ${method.toUpperCase()} ${endpoint} - Status: ${status} - Duration: ${durationMs}ms`;
    const finalMessage = this.formatMessage(status >= 400 ? 'error' : 'info', rawMessage, meta);
    
    if (status >= 400) {
      console.error(finalMessage);
    } else {
      console.log(finalMessage);
    }
  }
}

export const logger = new Logger('ThailandTour');
