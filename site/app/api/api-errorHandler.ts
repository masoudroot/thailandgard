import { Logger } from '../lib/logger';
export const logApiError = (error: any, context?: string) => {
  const formattedMessage = `API Error: ${error.message || error} ${context ? `| ${context}` : ''}`;
  Logger.error(formattedMessage);
};