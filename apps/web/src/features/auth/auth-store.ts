import { isAxiosError } from 'axios';
import { create } from 'zustand';

import type { AuthLoginInput, ApiError } from '@te-pinta/shared';

import { clearAccessToken, getAccessToken, setAccessToken } from '@/lib/access-token';

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

const authSessionStorageKey = 'te-pinta.authSession';

const readStoredUser = (): AuthUser | null => {
  if (typeof window === 'undefined' || !getAccessToken()) return null;

  try {
    const raw = window.localStorage.getItem(authSessionStorageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AuthUser>;
    if (!parsed.id || !parsed.email || !parsed.name) return null;
    return { id: parsed.id, email: parsed.email, name: parsed.name };
  } catch {
    return null;
  }
};

const writeStoredUser = (user: AuthUser | null) => {
  if (typeof window === 'undefined') return;

  try {
    if (user) {
      window.localStorage.setItem(authSessionStorageKey, JSON.stringify(user));
    } else {
      window.localStorage.removeItem(authSessionStorageKey);
    }
  } catch {
    // localStorage can be disabled; auth still works in memory for this tab.
  }
};

const storedUser = readStoredUser();

const defaultAuthState = {
  user: storedUser,
  status: (storedUser ? 'authenticated' : 'idle') as AuthStatus,
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
    writeStoredUser(session.user);
    set({ user: session.user, status: 'authenticated', error: null });
  },
  login: async (input) => {
    set({ status: 'loading', error: null });

    try {
      const session = await loginAdmin(input);
      setAccessToken(session.accessToken);
      writeStoredUser(session.user);
      set({ user: session.user, status: 'authenticated', error: null });
    } catch (error) {
      clearAccessToken();
      writeStoredUser(null);
      set({ user: null, status: 'unauthenticated', error: getErrorMessage(error) });
      throw error;
    }
  },
  refresh: async () => {
    set({ status: 'loading', error: null });

    try {
      const session = await refreshAdminSession();
      setAccessToken(session.accessToken);
      writeStoredUser(session.user);
      set({ user: session.user, status: 'authenticated', error: null });
    } catch {
      clearAccessToken();
      writeStoredUser(null);
      set({ user: null, status: 'unauthenticated', error: null });
    }
  },
  logout: async () => {
    set({ status: 'loading', error: null });

    try {
      await logoutAdmin();
    } finally {
      clearAccessToken();
      writeStoredUser(null);
      set({ user: null, status: 'unauthenticated', error: null });
    }
  },
}));

if (typeof window !== 'undefined') {
  window.addEventListener('te-pinta-auth-invalid', () => {
    writeStoredUser(null);
    useAuthStore.setState({ user: null, status: 'unauthenticated', error: null });
  });
}

export const resetAuthStoreForTests = () => {
  clearAccessToken();
  writeStoredUser(null);
  useAuthStore.setState({ user: null, status: 'idle', error: null });
};
