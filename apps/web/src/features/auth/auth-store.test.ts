import { describe, expect, it, beforeEach, vi } from 'vitest';

import { clearAccessToken, getAccessToken } from '@/lib/access-token';

import { loginAdmin, logoutAdmin, refreshAdminSession } from './auth-api';
import { resetAuthStoreForTests, useAuthStore } from './auth-store';

vi.mock('./auth-api', () => ({
  loginAdmin: vi.fn(),
  logoutAdmin: vi.fn(),
  refreshAdminSession: vi.fn(),
}));

const adminUser = {
  id: 'admin-1',
  email: 'admin@tepinta.test',
  name: 'Admin Te Pinta',
};

describe('auth store', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    clearAccessToken();
    resetAuthStoreForTests();
  });

  it('logs in the admin and keeps the access token in memory', async () => {
    vi.mocked(loginAdmin).mockResolvedValue({ user: adminUser, accessToken: 'access-token' });

    await useAuthStore.getState().login({
      email: 'admin@tepinta.test',
      password: 'secret-password',
    });

    expect(loginAdmin).toHaveBeenCalledWith({
      email: 'admin@tepinta.test',
      password: 'secret-password',
    });
    expect(useAuthStore.getState()).toMatchObject({
      status: 'authenticated',
      user: adminUser,
      error: null,
    });
    expect(getAccessToken()).toBe('access-token');
  });

  it('refreshes an existing cookie session into an authenticated store state', async () => {
    vi.mocked(refreshAdminSession).mockResolvedValue({
      user: adminUser,
      accessToken: 'fresh-token',
    });

    await useAuthStore.getState().refresh();

    expect(refreshAdminSession).toHaveBeenCalledOnce();
    expect(useAuthStore.getState()).toMatchObject({
      status: 'authenticated',
      user: adminUser,
      error: null,
    });
    expect(getAccessToken()).toBe('fresh-token');
  });

  it('clears local auth state after logout', async () => {
    vi.mocked(logoutAdmin).mockResolvedValue(undefined);
    useAuthStore.setState({ status: 'authenticated', user: adminUser, error: null });
    useAuthStore.getState().setSession({ user: adminUser, accessToken: 'access-token' });

    await useAuthStore.getState().logout();

    expect(logoutAdmin).toHaveBeenCalledOnce();
    expect(useAuthStore.getState()).toMatchObject({
      status: 'unauthenticated',
      user: null,
      error: null,
    });
    expect(getAccessToken()).toBeNull();
  });
});
