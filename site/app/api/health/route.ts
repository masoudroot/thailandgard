import { NextResponse } from 'next/server';
import { logger } from '../../../lib/logger';
import { handleApiError } from '../../../lib/api-errorHandler';

export async function GET(): Promise<NextResponse> {
  const context = { route: '/api/health', method: 'GET' };

  try {
    logger.info('Health check requested', context);

    return NextResponse.json(
      { status: 'ok', timestamp: new Date().toISOString() },
      { status: 200 },
    );
  } catch (error) {
    return handleApiError(error, context);
  }
}
