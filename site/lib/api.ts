import { Logger } from './logger';

interface ApiConfig {
  baseUrl: string;
  timeout?: number;
}

export class ApiClient {
  private logger: Logger;
  private baseUrl: string;
  private timeout: number;

  constructor(config: ApiConfig) {
    this.logger = new Logger('ApiClient');
    this.baseUrl = config.baseUrl;
    this.timeout = config.timeout || 10000;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      this.logger.info(`Making request to ${url}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorMessage = `HTTP error! status: ${response.status}`;
        this.logger.error(errorMessage);
        throw new Error(errorMessage);
      }

      const data = await response.json();
      this.logger.info('Request completed successfully');
      return data;
    } catch (error: unknown) {
      const errMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(errMessage);
      throw error;
    }
  }

  public async get<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  public async post<T>(endpoint: string, body: unknown, options: RequestInit = {}): Promise<T> {
    try {
      return await this.request<T>(endpoint, {
        ...options,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
        body: JSON.stringify(body),
      });
    } catch (error: unknown) {
      const errMessage = error instanceof Error ? error.message : 'POST request failed';
      this.logger.error(errMessage);
      throw error;
    }
  }

  public async put<T>(endpoint: string, body: unknown, options: RequestInit = {}): Promise<T> {
    try {
      return await this.request<T>(endpoint, {
        ...options,
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
        body: JSON.stringify(body),
      });
    } catch (error: unknown) {
      const errMessage = error instanceof Error ? error.message : 'PUT request failed';
      this.logger.error(errMessage);
      throw error;
    }
  }

  public async delete<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    try {
      return await this.request<T>(endpoint, { ...options, method: 'DELETE' });
    } catch (error: unknown) {
      const errMessage = error instanceof Error ? error.message : 'DELETE request failed';
      this.logger.error(errMessage);
      throw error;
    }
  }
}
