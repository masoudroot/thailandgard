import { Logger } from '../../lib/api';

export class ApiErrorHandler {
  private static logger: any = new Logger();

  static setLogger(logger: any): void {
    this.logger = logger;
  }

  static async handle(error: any, req: any) {
    const message = error.message || 'خطای API';
    this.logger.error(message, error);

    if (error.status === 404) {
      return { status: 404, body: { error: 'Not Found' } };
    }
    return { status: 500, body: { error: 'Internal Server Error' } };
  }
}