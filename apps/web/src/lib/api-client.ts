import axios, { AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';

import { clearAccessToken, getAccessToken, setAccessToken } from './access-token';

export const defaultApiBaseUrl = 'http://localhost:3000/api/v1';

export const getApiBaseUrl = () => {
  return import.meta.env.VITE_API_URL || defaultApiBaseUrl;
};

type RefreshSessionResponse = {
  accessToken: string;
};

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _authRetry?: boolean;
};

const refreshExcludedAuthPaths = new Set(['/auth/login', '/auth/refresh', '/auth/logout']);

const getRequestPath = (config: InternalAxiosRequestConfig) => {
  const requestUrl = config.url ?? '';

  try {
    if (/^https?:\/\//i.test(requestUrl)) {
      return new URL(requestUrl).pathname.replace(/^\/api\/v1(?=\/)/, '');
    }
  } catch {
    return requestUrl;
  }

  const path = requestUrl.startsWith('/') ? requestUrl : `/${requestUrl}`;

  return path.replace(/^\/api\/v1(?=\/)/, '');
};

const shouldAttemptSessionRefresh = (
  status: number | undefined,
  request: RetryableRequestConfig | undefined,
): request is RetryableRequestConfig => {
  if (status !== 401 || !request || request._authRetry) return false;

  return !refreshExcludedAuthPaths.has(getRequestPath(request));
};

let refreshPromise: Promise<string> | null = null;

const requestFreshAccessToken = async (): Promise<string> => {
  refreshPromise ??= axios
    .post<RefreshSessionResponse>(`${getApiBaseUrl()}/auth/refresh`, undefined, {
      withCredentials: true,
    })
    .then((response) => {
      setAccessToken(response.data.accessToken);
      return response.data.accessToken;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
};

const notifyInvalidSession = () => {
  clearAccessToken();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('te-pinta-auth-invalid'));
  }
};

export const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();

  if (token) {
    const headers = AxiosHeaders.from(config.headers);
    headers.set('Authorization', `Bearer ${token}`);
    config.headers = headers;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    const originalRequest = axios.isAxiosError(error)
      ? (error.config as RetryableRequestConfig | undefined)
      : undefined;

    if (!shouldAttemptSessionRefresh(status, originalRequest)) {
      return Promise.reject(error);
    }

    originalRequest._authRetry = true;

    try {
      const token = await requestFreshAccessToken();
      const headers = AxiosHeaders.from(originalRequest.headers);
      headers.set('Authorization', `Bearer ${token}`);
      originalRequest.headers = headers;
      return apiClient(originalRequest);
    } catch (refreshError) {
      notifyInvalidSession();
      return Promise.reject(refreshError);
    }
  },
);
