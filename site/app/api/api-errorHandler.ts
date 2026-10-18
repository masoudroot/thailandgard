import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export interface ApiErrorResponse {
  success: false;
  message: string;
  error?: unknown;
}

export function handleApiError(error: unknown, defaultMessage: string = 'خطای داخلی سرور رخ داد'): NextResponse<ApiErrorResponse> {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  logger.error(defaultMessage, { error: errorMessage, stack: error instanceof Error ? error.stack : undefined });

  return NextResponse.json(
    {
      success: false,
      message: defaultMessage,
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage }),
    },
    { status: 500 }
  );
}
