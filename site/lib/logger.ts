export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface LoggerOptions {
  context?: string;
}

export class Logger {
  private context: string;

  constructor(options?: LoggerOptions) {
    this.context = options?.context || 'App';
  }

  private formatMessage(level: LogLevel, message: string, meta?: unknown): string {
    const timestamp = new Date().toISOString();
    const metaString = meta !== undefined ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] [${this.context}]: ${message}${metaString}`;
  }

  public log(level: LogLevel, message: string, meta?: unknown): string {
    const formatted = this.formatMessage(level, message, meta);
    
    switch (level) {
      case 'error':
        console.error(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      case 'debug':
        console.debug(formatted);
        break;
      case 'info':
      default:
        console.log(formatted);
        break;
    }

    return formatted;
  }

  public info(message: string, meta?: unknown): string {
    return this.log('info', message, meta);
  }

  public warn(message: string, meta?: unknown): string {
    return this.log('warn', message, meta);
  }

  public error(message: string, meta?: unknown): string {
    return this.log('error', message, meta);
  }

  public debug(message: string, meta?: unknown): string {
    return this.log('debug', message, meta);
  }

  public api(method: string, endpoint: string, status: number, meta?: unknown): string {
    const message = `API ${method.toUpperCase()} ${endpoint} - Status: ${status}`;
    const level: LogLevel = status >= 400 ? 'error' : 'info';
    const formatted = this.formatMessage(level, message, meta);

    if (level === 'error') {
      console.error(formatted);
    } else {
      console.log(formatted);
    }

    return formatted;
  }
}

export const logger = new Logger();
