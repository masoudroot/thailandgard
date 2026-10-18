import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { withApiErrorHandling } from '@/lib/api-errorHandler';

export const runtime = 'nodejs';

export const GET = withApiErrorHandling(async (_req: Request): Promise<NextResponse> => {
  logger.info('health check requested');
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
}, 'GET /api/health');
