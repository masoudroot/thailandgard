import { NextResponse } from 'next/server';

type ApiHandler = (
  request: Request,
  context?: any
) => Promise<NextResponse> | NextResponse;

export function withErrorHandler(handler: ApiHandler): ApiHandler {
  return async (request: Request, context?: any) => {
    try {
      return await handler(request, context);
    } catch (error) {
      console.error('[API Error]:', error);
      return NextResponse.json(
        { success: false, error: 'Internal Server Error' },
        { status: 500 }
      );
    }
  };
}
