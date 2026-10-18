import { createLogger } from '../lib/logger';

export async function handleApiError(error: any) {
  const logger = createLogger('API');
  logger.error(error.message || 'Unknown error', { stack: error.stack, ...error });
  throw error;
}