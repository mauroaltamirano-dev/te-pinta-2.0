import { isAxiosError } from 'axios';
import { create } from 'zustand';

import type { AuthLoginInput, ApiError } from '@te-pinta/shared';

import { clearAccessToken, setAccessToken } from '@/lib/access-token';

import { loginAdmin, logoutAdmin, refreshAdminSession } from './auth-api';
import type { AuthSession, AuthUser } from './auth-types';

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

export type AuthState = {
  user: AuthUser | null;
  status: AuthStatus;
  error: string | null;
  setSession: (session: AuthSession) => void;
  login: (input: AuthLoginInput) => Promise<void>;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const defaultAuthState = {
  user: null,
  status: 'idle' as AuthStatus,
  error: null,
};

const getErrorMessage = (error: unknown) => {
  if (isAxiosError<ApiError>(error) && error.response?.data?.error) {
    return error.response.data.error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'No pudimos completar la operación. Intentá nuevamente.';
};

export const useAuthStore = create<AuthState>((set) => ({
  ...defaultAuthState,
  setSession: (session) => {
    setAccessToken(session.accessToken);
    set({ user: session.user, status: 'authenticated', error: null });
  },
  login: async (input) => {
    set({ status: 'loading', error: null });

    try {
      const session = await loginAdmin(input);
      setAccessToken(session.accessToken);
      set({ user: session.user, status: 'authenticated', error: null });
    } catch (error) {
      clearAccessToken();
      set({ user: null, status: 'unauthenticated', error: getErrorMessage(error) });
      throw error;
    }
  },
  refresh: async () => {
    set({ status: 'loading', error: null });

    try {
      const session = await refreshAdminSession();
      setAccessToken(session.accessToken);
      set({ user: session.user, status: 'authenticated', error: null });
    } catch {
      clearAccessToken();
      set({ user: null, status: 'unauthenticated', error: null });
    }
  },
  logout: async () => {
    set({ status: 'loading', error: null });

    try {
      await logoutAdmin();
    } finally {
      clearAccessToken();
      set({ user: null, status: 'unauthenticated', error: null });
    }
  },
}));

export const resetAuthStoreForTests = () => {
  clearAccessToken();
  useAuthStore.setState(defaultAuthState);
};
