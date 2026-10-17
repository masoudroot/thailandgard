import { NextResponse } from 'next/server';
import { logger } from './logger';

export function handleApiError(error: unknown, context: string = 'API_ERROR'): NextResponse {
  const errorMessage = error instanceof Error ? error.message : 'خطای ناشناخته در سرور';
  const errorStack = error instanceof Error ? error.stack : undefined;

  logger.error(`[${context}] ${errorMessage}`, {
    stack: errorStack,
    error: String(error),
  });

  return NextResponse.json(
    {
      success: false,
      message: errorMessage,
    },
    { status: 500 }
  );
}
