import { NextResponse } from 'next/server';
import { Logger } from '@/lib/logger';

export interface ApiErrorResponse {
  success: false;
  error: string;
  code?: string;
}

export function handleApiError(error: unknown, context: string = 'API_ERROR'): NextResponse<ApiErrorResponse> {
  let errorMessage = 'خطای ناشناخته در سرور رخ داده است';
  let statusCode = 500;
  let errorCode = 'INTERNAL_SERVER_ERROR';

  if (error instanceof Error) {
    errorMessage = error.message;
    
    if (error.name === 'ValidationError') {
      statusCode = 400;
      errorCode = 'VALIDATION_ERROR';
    } else if (error.name === 'UnauthorizedError') {
      statusCode = 401;
      errorCode = 'UNAUTHORIZED';
    } else if (error.name === 'ForbiddenError') {
      statusCode = 403;
      errorCode = 'FORBIDDEN';
    } else if (error.name === 'NotFoundError') {
      statusCode = 404;
      errorCode = 'NOT_FOUND';
    }
  } else if (typeof error === 'string') {
    errorMessage = error;
  }

  try {
    Logger.error(`[${context}] ${errorMessage}`, {
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : error,
      context,
      timestamp: new Date().toISOString(),
    });
  } catch (loggingError) {
    console.error('Critical failure in Logger system:', loggingError);
    console.error('Original error that failed to log:', error);
  }

  return NextResponse.json(
    {
      success: false,
      error: errorMessage,
      code: errorCode,
    },
    { status: statusCode }
  );
}

export async function withApiErrorHandler<T>(
  handler: () => Promise<NextResponse<T> | Response>,
  context: string = 'API_ROUTE'
): Promise<NextResponse<T | ApiErrorResponse>> {
  try {
    const response = await handler();
    return response as NextResponse<T>;
  } catch (error) {
    return handleApiError(error, context);
  }
}
