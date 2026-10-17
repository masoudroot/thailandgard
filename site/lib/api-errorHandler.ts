import { NextResponse } from 'next/server';
import { Logger } from './logger';

export function handleApiError(error: unknown, context: string = 'API_ERROR'): NextResponse {
  let errorMessage = 'خطای ناشناخته در سرور رخ داده است';
  let statusCode = 500;

  if (error instanceof Error) {
    errorMessage = error.message;
    if ('statusCode' in error && typeof (error as any).statusCode === 'number') {
      statusCode = (error as any).statusCode;
    }
  } else if (typeof error === 'string') {
    errorMessage = error;
  }

  Logger.error(`[${context}] ${errorMessage}`, { error });

  return NextResponse.json(
    {
      success: false,
      error: errorMessage,
    },
    { status: statusCode }
  );
}
