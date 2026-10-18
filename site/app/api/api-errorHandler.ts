import { NextResponse } from 'next/server';
import { Logger } from '@/site/lib/logger';

export interface ApiErrorResponse {
  error: string;
  status: number;
  details?: unknown;
}

export function handleApiError(error: unknown, defaultMessage = 'خطای داخلی سرور'): NextResponse<ApiErrorResponse> {
  let statusCode = 500;
  let errorMessage = defaultMessage;
  let errorDetails: unknown = undefined;

  if (error instanceof Error) {
    errorMessage = error.message || defaultMessage;
    errorDetails = process.env.NODE_ENV === 'development' ? error.stack : undefined;
  } else if (typeof error === 'string') {
    errorMessage = error;
  }

  Logger.error(`API Error: ${errorMessage}`, {
    error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
    timestamp: new Date().toISOString(),
  });

  return NextResponse.json(
    {
      error: errorMessage,
      status: statusCode,
      ...(errorDetails ? { details: errorDetails } : {}),
    },
    { status: statusCode }
  );
}
