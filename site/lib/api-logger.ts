import { logger } from './logger';

export class Logger {
  private static instance: Logger | null = null;

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  public logError(error: Error, context?: string): void {
    let message = error.message;
    if (typeof (error as any).formatMessage === 'function') {
      message = (error as any).formatMessage();
    }
    if (context) {
      message += ` | Context: ${context}`;
    }
    logger.error(message, { error });
  }
}