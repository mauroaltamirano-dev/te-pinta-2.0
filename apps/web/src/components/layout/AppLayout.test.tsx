import { render, screen, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import type * as ReactRouterDom from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { logoutAdmin } from '@/features/auth/auth-api';
import { resetAuthStoreForTests } from '@/features/auth/auth-store';

import { AppLayout } from './AppLayout';

const navigateMock = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouterDom>();

  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('@/features/auth/auth-api', () => ({
  loginAdmin: vi.fn(),
  logoutAdmin: vi.fn(),
  refreshAdminSession: vi.fn(),
}));

const renderLayout = (initialPath = '/dashboard') => {
  const router = createMemoryRouter(
    [
      { path: '/login', element: <h2>Login admin</h2> },
      {
        path: '/',
        element: <AppLayout />,
        children: [
          { path: 'dashboard', element: <h2>Contenido dashboard</h2> },
          { path: 'orders', element: <h2>Contenido pedidos</h2> },
        ],
      },
    ],
    { initialEntries: [initialPath] },
  );

  return render(<RouterProvider router={router} />);
};

describe('AppLayout', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    navigateMock.mockReset();
    resetAuthStoreForTests();
    vi.mocked(logoutAdmin).mockResolvedValue(undefined);
  });

  it('renders desktop sidebar, mobile bottom nav, and nested route content', () => {
    renderLayout();

    const sidebar = screen.getByRole('complementary', { name: /navegación principal/i });
    const mobileNav = screen.getByRole('navigation', { name: /navegación móvil/i });

    expect(sidebar).toBeInTheDocument();
    expect(mobileNav).toBeInTheDocument();
    expect(within(sidebar).getByRole('link', { name: /pedidos/i })).toHaveAttribute(
      'href',
      '/orders',
    );
    expect(screen.getByRole('heading', { name: /contenido dashboard/i })).toBeInTheDocument();
  });

  it('keeps desktop and mobile navigation responsive with the key mobile actions visible', () => {
    renderLayout('/orders');

    const sidebar = screen.getByRole('complementary', { name: /navegación principal/i });
    const mobileNav = screen.getByRole('navigation', { name: /navegación móvil/i });

    expect(sidebar.className).toContain('hidden');
    expect(sidebar.className).toContain('md:flex');
    expect(mobileNav.className).toContain('fixed');
    expect(mobileNav.className).toContain('bottom-0');
    expect(mobileNav.className).toContain('md:hidden');
    expect(mobileNav.className).toContain('bg-sidebar');

    const activeOrdersLink = within(mobileNav).getByRole('link', { name: /pedidos/i });
    const inactiveDashboardLink = within(mobileNav).getByRole('link', { name: /dashboard/i });

    expect(activeOrdersLink).toHaveAttribute('aria-current', 'page');
    expect(activeOrdersLink.className).toContain('bg-card');
    expect(activeOrdersLink.className).toContain('text-sidebar');
    expect(inactiveDashboardLink.className).toContain('text-card/78');

    expect(within(mobileNav).getByRole('link', { name: /dashboard/i })).toHaveAttribute(
      'href',
      '/dashboard',
    );
    expect(within(mobileNav).getByRole('link', { name: /pedidos/i })).toHaveAttribute(
      'href',
      '/orders',
    );
    expect(within(mobileNav).getByRole('link', { name: /finanzas/i })).toHaveAttribute(
      'href',
      '/finanzas',
    );
    expect(within(mobileNav).getByRole('link', { name: /productos/i })).toHaveAttribute(
      'href',
      '/menu',
    );
    expect(within(mobileNav).getByRole('link', { name: /configuración/i })).toHaveAttribute(
      'href',
      '/settings',
    );
    expect(within(mobileNav).getByRole('button', { name: /cerrar sesión/i })).toBeInTheDocument();
    expect(within(mobileNav).queryByRole('link', { name: /clientes/i })).not.toBeInTheDocument();
    expect(within(mobileNav).queryByRole('link', { name: /insumos/i })).not.toBeInTheDocument();
    expect(within(mobileNav).queryByRole('link', { name: /ingredientes/i })).not.toBeInTheDocument();
    expect(within(sidebar).queryByRole('link', { name: /ingredientes/i })).not.toBeInTheDocument();
  });

  it('logs out from the mobile navigation and replaces the route with login', async () => {
    renderLayout('/orders');

    await userEvent.click(
      within(screen.getByRole('navigation', { name: /navegación móvil/i })).getByRole('button', {
        name: /cerrar sesión/i,
      }),
    );

    expect(logoutAdmin).toHaveBeenCalledOnce();
    expect(navigateMock).toHaveBeenCalledWith('/login', { replace: true });
  });
});
