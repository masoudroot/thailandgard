const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

interface ApiOptions extends RequestInit {
  params?: Record<string, string>;
}

export async function apiCall<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { params, headers, ...customOptions } = options;

  let url = `${API_BASE_URL}${endpoint}`;

  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...(headers || {}),
  };

  const config: RequestInit = {
    ...customOptions,
    headers: defaultHeaders,
  };

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { message: response.statusText };
      }

      throw {
        status: response.status,
        message: errorData.message || 'خطایی در ارتباط با سرور رخ داده است',
        data: errorData,
      };
    }

    if (response.status === 204) {
      return {} as T;
    }

    const data = await response.json();
    return data as T;
  } catch (error: any) {
    if (error && typeof error === 'object' && 'status' in error) {
      throw error;
    }

    throw {
      status: 500,
      message: error.message || 'خطای شبکه یا عدم دسترسی به سرور',
      data: null,
    };
  }
}
