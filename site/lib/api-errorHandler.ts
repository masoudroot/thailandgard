import { NextResponse } from 'next/server';

type ApiHandler = (
  request: Request,
  context?: any
) => Promise<NextResponse> | NextResponse;

export function withApiErrorHandler(handler: ApiHandler): ApiHandler {
  return async (request: Request, context?: any) => {
    try {
      return await handler(request, context);
    } catch (error: any) {
      const timestamp = new Date().toISOString();
      const path = new URL(request.url).pathname;
      
      console.error(JSON.stringify({
        level: 'ERROR',
        timestamp,
        path,
        method: request.method,
        message: error?.message || 'Unknown error',
        stack: error?.stack || ''
      }));

      return NextResponse.json(
        {
          success: false,
          error: 'خطای داخلی سرور رخ داده است. لطفاً بعداً دوباره تلاش کنید.'
        },
        { status: 500 }
      );
    }
  };
}
