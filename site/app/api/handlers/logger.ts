import { createLogger } from '../lib/logger';

export async function logApiEvent(event: string, data: any) {
  const logger = createLogger('API');
  logger.info(event, data);
}