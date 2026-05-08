import { render, screen, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { AppLayout } from './AppLayout';

const renderLayout = (initialPath = '/dashboard') => {
  const router = createMemoryRouter(
    [
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
  it('renders desktop sidebar, mobile bottom nav, header, and nested route content', () => {
    renderLayout();

    expect(screen.getByRole('banner')).toHaveTextContent('Dashboard');
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
    expect(within(mobileNav).getByRole('link', { name: /dashboard/i })).toHaveAttribute(
      'href',
      '/dashboard',
    );
    expect(within(mobileNav).getByRole('link', { name: /pedidos/i })).toHaveAttribute(
      'href',
      '/orders',
    );
    expect(within(mobileNav).getByRole('link', { name: /menú/i })).toHaveAttribute(
      'href',
      '/menu',
    );
    expect(within(mobileNav).queryByRole('link', { name: /settings/i })).not.toBeInTheDocument();
  });
});
