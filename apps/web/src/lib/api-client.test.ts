import axios, {
  AxiosError,
  type AxiosHeaders,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
import { describe, expect, it, beforeEach, vi } from 'vitest';

import { clearAccessToken, getAccessToken, setAccessToken } from './access-token';
import { apiClient } from './api-client';

const readAuthorizationHeader = (headers: InternalAxiosRequestConfig['headers']) => {
  const axiosHeaders = headers as AxiosHeaders;
  return axiosHeaders.get?.('Authorization') ?? headers?.Authorization;
};

const createUnauthorizedError = (config: InternalAxiosRequestConfig, data: unknown = {}) =>
  new AxiosError('Unauthorized', AxiosError.ERR_BAD_REQUEST, config, undefined, {
    data,
    status: 401,
    statusText: 'Unauthorized',
    headers: {},
    config,
  });

describe('apiClient', () => {
  beforeEach(() => {
    clearAccessToken();
    vi.restoreAllMocks();
  });

  it('uses the API v1 base URL and sends cookies for refresh sessions', () => {
    expect(apiClient.defaults.baseURL).toContain('/api/v1');
    expect(apiClient.defaults.withCredentials).toBe(true);
  });

  it('attaches the in-memory access token as a bearer header', async () => {
    setAccessToken('access-token-123');

    let authorizationHeader: unknown;

    await apiClient.get('/auth/me', {
      adapter: async (config) => {
        authorizationHeader = readAuthorizationHeader(config.headers);

        return {
          data: { ok: true },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        };
      },
    });

    expect(authorizationHeader).toBe('Bearer access-token-123');
  });

  it('does not attempt a cookie refresh after rejected login credentials', async () => {
    const refreshSpy = vi.spyOn(axios, 'post').mockResolvedValue({
      data: { accessToken: 'unexpected-refresh-token' },
    });

    await expect(
      apiClient.post('/auth/login', { email: 'admin@tepinta.test', password: 'wrong' }, {
        adapter: async (config) => {
          throw createUnauthorizedError(config, {
            error: 'Invalid credentials',
            code: 'INVALID_CREDENTIALS',
          });
        },
      }),
    ).rejects.toMatchObject({
      response: {
        status: 401,
        data: { code: 'INVALID_CREDENTIALS' },
      },
    });

    expect(refreshSpy).not.toHaveBeenCalled();
  });

  it('refreshes once and retries a protected endpoint after a 401', async () => {
    setAccessToken('stale-access-token');
    const refreshSpy = vi.spyOn(axios, 'post').mockResolvedValue({
      data: { accessToken: 'fresh-access-token' },
    });
    let requestAttempts = 0;
    let retryAuthorizationHeader: unknown;

    const response = await apiClient.get('/auth/me', {
      adapter: async (config) => {
        requestAttempts += 1;

        if (requestAttempts === 1) {
          throw createUnauthorizedError(config);
        }

        retryAuthorizationHeader = readAuthorizationHeader(config.headers);

        return {
          data: { ok: true },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        };
      },
    });

    expect(response.data).toEqual({ ok: true });
    expect(requestAttempts).toBe(2);
    expect(refreshSpy).toHaveBeenCalledOnce();
    expect(refreshSpy).toHaveBeenCalledWith(expect.stringContaining('/auth/refresh'), undefined, {
      withCredentials: true,
    });
    expect(retryAuthorizationHeader).toBe('Bearer fresh-access-token');
  });

  it('does not refresh again when /auth/refresh returns 401', async () => {
    const refreshSpy = vi.spyOn(axios, 'post').mockResolvedValue({
      data: { accessToken: 'unexpected-refresh-token' },
    });
    let originalError: AxiosError | undefined;
    let caughtError: unknown;

    try {
      await apiClient.post('/auth/refresh', undefined, {
        adapter: async (config) => {
          originalError = createUnauthorizedError(config);
          throw originalError;
        },
      });
    } catch (error) {
      caughtError = error;
    }

    expect(caughtError).toBe(originalError);
    expect(originalError).toBeDefined();
    expect(refreshSpy).not.toHaveBeenCalled();
  });

  it('does not refresh after a rejected logout request', async () => {
    const refreshSpy = vi.spyOn(axios, 'post').mockResolvedValue({
      data: { accessToken: 'unexpected-refresh-token' },
    });

    await expect(
      apiClient.post('/auth/logout', undefined, {
        adapter: async (config) => {
          throw createUnauthorizedError(config);
        },
      }),
    ).rejects.toMatchObject({ response: { status: 401 } });

    expect(refreshSpy).not.toHaveBeenCalled();
  });

  it('propagates refresh failure and clears the access token without retrying forever', async () => {
    setAccessToken('stale-access-token');
    const refreshError = new AxiosError('Refresh failed');
    const refreshSpy = vi.spyOn(axios, 'post').mockRejectedValue(refreshError);
    let requestAttempts = 0;

    await expect(
      apiClient.get('/auth/me', {
        adapter: async (config) => {
          requestAttempts += 1;
          throw createUnauthorizedError(config);
        },
      }),
    ).rejects.toBe(refreshError);

    expect(requestAttempts).toBe(1);
    expect(refreshSpy).toHaveBeenCalledOnce();
    expect(getAccessToken()).toBeNull();
  });

  it('does not refresh an already retried 401 request', async () => {
    const refreshSpy = vi.spyOn(axios, 'post').mockResolvedValue({
      data: { accessToken: 'unexpected-refresh-token' },
    });
    let originalError: AxiosError | undefined;
    let caughtError: unknown;

    try {
      await apiClient.get('/auth/me', {
        _authRetry: true,
        adapter: async (config) => {
          originalError = createUnauthorizedError(config);
          throw originalError;
        },
      } as AxiosRequestConfig & { _authRetry: true });
    } catch (error) {
      caughtError = error;
    }

    expect(caughtError).toBe(originalError);
    expect(originalError).toBeDefined();
    expect(refreshSpy).not.toHaveBeenCalled();
  });
});
