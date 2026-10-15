import { NextResponse } from 'next/server';

export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: unknown;
}

export function handleApiError(error: unknown, defaultMessage: string = 'خطایی در سرور رخ داده است'): NextResponse<ApiErrorResponse> {
  console.error('API Error:', error);

  let message = defaultMessage;

  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === 'string') {
    message = error;
  }

  return NextResponse.json(
    {
      success: false,
      message,
      errors: process.env.NODE_ENV === 'development' ? error : undefined,
    },
    { status: 500 }
  );
}
