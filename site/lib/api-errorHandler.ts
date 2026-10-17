import { NextResponse } from 'next/server';
import { logger } from './logger';

export function handleApiError(error: unknown, contextMessage = 'API Error') {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
  const errorStack = error instanceof Error ? error.stack : undefined;

  logger.error(contextMessage, {
    message: errorMessage,
    stack: errorStack,
    raw: error,
  });

  return NextResponse.json(
    {
      success: false,
      error: contextMessage,
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
    },
    { status: 500 }
  );
}
