import { logger } from './logger';

type FormattableError = Error & { formatMessage?: () => string };

function hasFormatMessage(error: Error): error is FormattableError {
  return typeof (error as FormattableError).formatMessage === 'function';
}

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
    if (hasFormatMessage(error) && error.formatMessage) {
      message = error.formatMessage();
    }
    if (context) {
      message += ` | Context: ${context}`;
    }
    logger.error(message, { error });
  }
}