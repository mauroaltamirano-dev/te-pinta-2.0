import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, beforeEach, vi } from 'vitest';

import { createQueryClient } from '@/lib/query-client';

import { listCustomers } from '../customers/customers-api';
import { listIngredients } from '../ingredients/ingredients-api';
import { listMenuItems } from '../menu/menu-api';
import { listOrders } from '../orders/orders-api';
import { getDailyDashboard } from './dashboard-api';
import { DashboardPage } from './DashboardPage';

vi.mock('../customers/customers-api', () => ({
  listCustomers: vi.fn(),
}));

vi.mock('../ingredients/ingredients-api', () => ({
  listIngredients: vi.fn(),
}));

vi.mock('../menu/menu-api', () => ({
  listMenuItems: vi.fn(),
}));

vi.mock('../orders/orders-api', () => ({
  listOrders: vi.fn(),
}));

vi.mock('./dashboard-api', () => ({
  getDailyDashboard: vi.fn(),
}));

const renderDashboardPage = () => {
  const queryClient = createQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(listOrders).mockResolvedValue([
      {
        id: 'order-1',
        customer: {
          id: 'customer-1',
          name: 'Ana Pérez',
          phone: '1122334455',
          address: 'Av. Siempre Viva 742',
        },
        deliveryDate: '2026-05-06',
        deliveryTime: 'mediodia',
        deliveryType: 'envio',
        cooked: false,
        notes: null,
        discountPercent: 0,
        deliveryFee: 0,
        subtotal: 12000,
        total: 12000,
        status: 'confirmado',
        isPaid: false,
        itemCount: 1,
        totalQuantity: 12,
      },
      {
        id: 'order-2',
        customer: {
          id: 'customer-2',
          name: 'Mauro Altamirano',
          phone: '3537559269',
          address: 'Alcorta 66',
        },
        deliveryDate: '2026-05-06',
        deliveryTime: 'noche',
        deliveryType: 'retiro',
        cooked: true,
        notes: null,
        discountPercent: 0,
        deliveryFee: 0,
        subtotal: 33600,
        total: 33600,
        status: 'entregado',
        isPaid: true,
        itemCount: 2,
        totalQuantity: 24,
      },
    ]);
    vi.mocked(listCustomers).mockResolvedValue([
      { id: 'customer-1', name: 'Ana Pérez', phone: '1122334455', address: 'Av. Siempre Viva 742' },
      { id: 'customer-2', name: 'Mauro Altamirano', phone: '3537559269', address: 'Alcorta 66' },
    ]);
    vi.mocked(listMenuItems).mockResolvedValue([
      {
        id: 'menu-1',
        name: 'Carne suave',
        priceUnit: 1200,
        priceHalfDozen: 6500,
        priceDozen: 12000,
        costPerDozen: 4800,
        isActive: true,
      },
      {
        id: 'menu-2',
        name: 'Humita',
        priceUnit: 1100,
        priceHalfDozen: 6100,
        priceDozen: 11500,
        costPerDozen: 4300,
        isActive: false,
      },
    ]);
    vi.mocked(listIngredients).mockResolvedValue([
      { id: 'ingredient-1', name: 'Harina 0000', unit: 'kg', purchasePrice: 900 },
    ]);
    vi.mocked(getDailyDashboard).mockResolvedValue({
      date: '2026-05-06',
      orderCount: 3,
      totalRevenue: 45600,
      deliveryShifts: {
        mediodia: 1,
        tarde: 0,
        noche: 2,
      },
      topVarieties: [
        { menuItemId: 'menu-1', name: 'Carne suave', quantity: 24 },
        { menuItemId: 'menu-2', name: 'Humita', quantity: 12 },
      ],
    });
  });

  it('shows daily order count, revenue, delivery shifts and top varieties', async () => {
    renderDashboardPage();

    expect(await screen.findByText('Centro operativo')).toBeInTheDocument();
    expect(await screen.findByText('3')).toBeInTheDocument();
    expect(screen.getByText('$ 45.600')).toBeInTheDocument();
    expect(screen.getAllByText(/mediodía/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/noche/i).length).toBeGreaterThan(0);
    expect(screen.getByText('Carne suave')).toBeInTheDocument();
    expect(screen.getByText(/24 u./i)).toBeInTheDocument();
    expect(screen.getByText(/alertas operativas/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /accesos rápidos/i })).toBeInTheDocument();
  });

  it('reloads the dashboard for the selected date', async () => {
    renderDashboardPage();

    fireEvent.change(await screen.findByLabelText(/fecha del dashboard/i), {
      target: { value: '2026-05-07' },
    });

    await waitFor(() => {
      expect(getDailyDashboard).toHaveBeenLastCalledWith({ date: '2026-05-07' });
    });
  });
});
