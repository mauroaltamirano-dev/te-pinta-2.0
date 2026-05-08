import type { AxiosHeaders, InternalAxiosRequestConfig } from 'axios';
import { describe, expect, it, beforeEach } from 'vitest';

import { clearAccessToken, setAccessToken } from './access-token';
import { apiClient } from './api-client';

const readAuthorizationHeader = (headers: InternalAxiosRequestConfig['headers']) => {
  const axiosHeaders = headers as AxiosHeaders;
  return axiosHeaders.get?.('Authorization') ?? headers?.Authorization;
};

describe('apiClient', () => {
  beforeEach(() => {
    clearAccessToken();
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
});
