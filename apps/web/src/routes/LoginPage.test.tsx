import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, beforeEach, vi } from 'vitest';

import { resetAuthStoreForTests } from '@/features/auth/auth-store';
import { clearAccessToken } from '@/lib/access-token';

import { LoginPage } from './LoginPage';
import { loginAdmin } from '@/features/auth/auth-api';

vi.mock('@/features/auth/auth-api', () => ({
  loginAdmin: vi.fn(),
  logoutAdmin: vi.fn(),
  refreshAdminSession: vi.fn(),
}));

const renderLogin = () => {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route element={<LoginPage />} path="/login" />
        <Route element={<h1>Dashboard cargado</h1>} path="/dashboard" />
      </Routes>
    </MemoryRouter>,
  );
};

describe('LoginPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    clearAccessToken();
    resetAuthStoreForTests();
  });

  it('submits admin credentials and redirects to the dashboard', async () => {
    vi.mocked(loginAdmin).mockResolvedValue({
      user: { id: 'admin-1', email: 'admin@tepinta.test', name: 'Admin Te Pinta' },
      accessToken: 'access-token',
    });

    renderLogin();

    await userEvent.type(screen.getByLabelText(/email/i), 'admin@tepinta.test');
    await userEvent.type(screen.getByLabelText(/contraseña/i), 'secret-password');
    await userEvent.click(screen.getByRole('button', { name: /ingresar/i }));

    expect(await screen.findByRole('heading', { name: /dashboard cargado/i })).toBeInTheDocument();
    expect(loginAdmin).toHaveBeenCalledWith({
      email: 'admin@tepinta.test',
      password: 'secret-password',
    });
  });

  it('does not submit invalid admin login input', async () => {
    renderLogin();

    await userEvent.type(screen.getByLabelText(/email/i), 'no-es-email');
    await userEvent.type(screen.getByLabelText(/contraseña/i), 'secret-password');
    await userEvent.click(screen.getByRole('button', { name: /ingresar/i }));

    expect(loginAdmin).not.toHaveBeenCalled();
    expect(screen.queryByRole('heading', { name: /dashboard cargado/i })).not.toBeInTheDocument();
  });
});
