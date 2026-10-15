export interface ApiErrorResponse {
  message?: string;
  error?: string;
  statusCode?: number;
}

export class ApiError extends Error {
  statusCode: number;
  data: any;

  constructor(message: string, statusCode: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.data = data;
  }
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean>;
}

export async function apiClient<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, ...fetchOptions } = options;

  let url = endpoint;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  const headers = new Headers(fetchOptions.headers || {});
  if (!headers.has('Content-Type') && !(fetchOptions.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...fetchOptions,
      headers,
    });
  } catch (error) {
    throw new ApiError(
      'خطا در ارتباط با سرور. لطفاً اتصال internet خود را بررسی کنید.',
      0,
      error
    );
  }

  let responseData: any = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      responseData = await response.json();
    } catch (err) {
      responseData = null;
    }
  } else {
    try {
      responseData = await response.text();
    } catch (err) {
      responseData = null;
    }
  }

  if (!response.ok) {
    let errorMessage = 'خطایی در پردازش درخواست شما رخ داد.';
    
    if (responseData) {
      if (typeof responseData === 'string') {
        errorMessage = responseData;
      } else if (typeof responseData === 'object') {
        errorMessage = (
          (responseData as ApiErrorResponse).message ||
          (responseData as ApiErrorResponse).error ||
          errorMessage
        );
      }
    }

    if (response.status === 401) {
      errorMessage = 'لطفاً ابتدا وارد حساب کاربری خود شوید.';
    } else if (response.status === 403) {
      errorMessage = 'شما دسترسی لازم برای انجام این عملیات را ندارید.';
    } else if (response.status === 404) {
      errorMessage = 'منبع مورد نظر یافت نشد.';
    } else if (response.status >= 500) {
      errorMessage = 'خطای داخلی سرور رخ داده است. لطفاً بعداً تلاش کنید.';
    }

    throw new ApiError(errorMessage, response.status, responseData);
  }

  return responseData as T;
}

export const api = {
  get: <T>(url: string, options?: RequestOptions) => 
    apiClient<T>(url, { ...options, method: 'GET' }),
    
  post: <T>(url: string, body?: any, options?: RequestOptions) => 
    apiClient<T>(url, { ...options, method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body) }),
    
  put: <T>(url: string, body?: any, options?: RequestOptions) => 
    apiClient<T>(url, { ...options, method: 'PUT', body: body instanceof FormData ? body : JSON.stringify(body) }),
    
  delete: <T>(url: string, options?: RequestOptions) => 
    apiClient<T>(url, { ...options, method: 'DELETE' }),
};
