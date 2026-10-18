export class ApiErrorHandler {
  private static logger: any;
  static setLogger(logger: any) {
    this.logger = logger;
  }
  static async handle(error: any, req: any) {
    const message = error.message || 'خطای API';
    if (this.logger) {
      this.logger.error(message, error);
    } else {
      console.error('[API ERROR]', message, error);
    }
    // مدیریت خطای مناسب
    if (error.status === 404) {
      return { status: 404, body: { error: 'Not Found' } };
    }
    return { status: 500, body: { error: 'Internal Server Error' } };
  }
}