import { Logger } from '../lib/logger';

export const handleApiError = (error: unknown, endpoint: string): Promise<void> => {
  const message = error instanceof Error ? error.message : 'خطای ناشناخته';
  Logger.error(`[${endpoint}] ${message}`, { stack: error instanceof Error ? error.stack : undefined });
  return Promise.resolve();
};
