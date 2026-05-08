import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, beforeEach, vi } from 'vitest';

import { clearAccessToken } from '@/lib/access-token';

import { ProtectedRoute } from './ProtectedRoute';
import { refreshAdminSession } from './auth-api';
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

const renderProtectedRoute = (initialPath = '/dashboard') => {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route
          element={
            <ProtectedRoute>
              <h1>Contenido privado</h1>
            </ProtectedRoute>
          }
          path="/dashboard"
        />
        <Route element={<h1>Login admin</h1>} path="/login" />
      </Routes>
    </MemoryRouter>,
  );
};

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    clearAccessToken();
    resetAuthStoreForTests();
  });

  it('renders children when the auth store is authenticated', () => {
    useAuthStore.setState({ status: 'authenticated', user: adminUser, error: null });

    renderProtectedRoute();

    expect(screen.getByRole('heading', { name: /contenido privado/i })).toBeInTheDocument();
  });

  it('redirects unauthenticated users to login', () => {
    useAuthStore.setState({ status: 'unauthenticated', user: null, error: null });

    renderProtectedRoute();

    expect(screen.getByRole('heading', { name: /login admin/i })).toBeInTheDocument();
  });

  it('refreshes an idle cookie session before rendering protected content', async () => {
    vi.mocked(refreshAdminSession).mockResolvedValue({
      user: adminUser,
      accessToken: 'fresh-token',
    });

    renderProtectedRoute();

    expect(screen.getByText(/verificando sesión/i)).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: /contenido privado/i })).toBeInTheDocument();
    expect(refreshAdminSession).toHaveBeenCalledOnce();
  });
});
