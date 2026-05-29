import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, beforeEach, vi } from 'vitest';

import { createQueryClient } from '@/lib/query-client';

import { listCustomers } from '../customers/customers-api';
import { listIngredients } from '../ingredients/ingredients-api';
import { listMenuItems } from '../menu/menu-api';
import { listOrders, type OrderListResponse } from '../orders/orders-api';
import { getDailyDashboard, type DailyDashboard } from './dashboard-api';
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
    const ordersResponse: OrderListResponse = {
      orders: [
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
          cookingFee: 0,
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
          cookingFee: 0,
          subtotal: 33600,
          total: 33600,
          status: 'entregado',
          isPaid: true,
          itemCount: 2,
          totalQuantity: 24,
        },
      ],
      pagination: {
        page: 1,
        pageSize: 20,
        total: 2,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
      stats: { active: 1, finalized: 1 },
    };
    vi.mocked(listOrders).mockResolvedValue(ordersResponse);
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
        isArchived: false,
      },
      {
        id: 'menu-2',
        name: 'Humita',
        priceUnit: 1100,
        priceHalfDozen: 6100,
        priceDozen: 11500,
        costPerDozen: 4300,
        isActive: false,
        isArchived: false,
      },
    ]);
    vi.mocked(listIngredients).mockResolvedValue([
      { id: 'ingredient-1', name: 'Harina 0000', unit: 'kg', purchasePrice: 900 },
    ]);
    const dashboardResponse: DailyDashboard = {
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
      topClients: [
        { customerId: 'customer-2', name: 'Mauro Altamirano', orderCount: 1, totalRevenue: 33600 },
      ],
      upcomingOrders: [],
      nextSevenDays: [{ date: '2026-05-06', count: 3, revenue: 45600 }],
      lastSevenDays: [{ date: '2026-05-06', count: 3, revenue: 45600 }],
      statusSummary: { confirmed: 1, inProduction: 0, ready: 0, delivered: 2, total: 3 },
      recentOrders: [],
      totals: {
        orderCount: 3,
        activeOrderCount: 1,
        finalizedOrderCount: 2,
        unpaidOrderCount: 1,
        grossRevenue: 45600,
        paidRevenue: 33600,
        pendingRevenue: 12000,
        estimatedCosts: 16000,
        estimatedProfit: 29600,
        totalUnits: 36,
        averageTicket: 15200,
      },
      rangeTotals: {
        all: {
          orderCount: 3,
          activeOrderCount: 1,
          finalizedOrderCount: 2,
          unpaidOrderCount: 1,
          grossRevenue: 45600,
          paidRevenue: 33600,
          pendingRevenue: 12000,
          estimatedCosts: 16000,
          estimatedProfit: 29600,
          totalUnits: 36,
          averageTicket: 15200,
        },
        last30: {
          orderCount: 2,
          activeOrderCount: 1,
          finalizedOrderCount: 1,
          unpaidOrderCount: 1,
          grossRevenue: 33600,
          paidRevenue: 21600,
          pendingRevenue: 12000,
          estimatedCosts: 12000,
          estimatedProfit: 21600,
          totalUnits: 24,
          averageTicket: 16800,
        },
        last7: {
          orderCount: 1,
          activeOrderCount: 1,
          finalizedOrderCount: 0,
          unpaidOrderCount: 1,
          grossRevenue: 12000,
          paidRevenue: 0,
          pendingRevenue: 12000,
          estimatedCosts: 4000,
          estimatedProfit: 8000,
          totalUnits: 12,
          averageTicket: 12000,
        },
      },
      rangeAnalytics: {
        all: {
          totals: {
            orderCount: 3,
            activeOrderCount: 1,
            finalizedOrderCount: 2,
            unpaidOrderCount: 1,
            grossRevenue: 45600,
            paidRevenue: 33600,
            pendingRevenue: 12000,
            estimatedCosts: 16000,
            estimatedProfit: 29600,
            totalUnits: 36,
            averageTicket: 15200,
          },
          topClients: [
            {
              customerId: 'customer-2',
              name: 'Mauro Altamirano',
              orderCount: 1,
              totalRevenue: 33600,
            },
          ],
          topVarieties: [{ menuItemId: 'menu-1', name: 'Carne suave', quantity: 24 }],
          statusSummary: { confirmed: 1, inProduction: 0, ready: 0, delivered: 2, total: 3 },
          recentOrders: [],
          chartDays: [{ date: '2026-05-06', count: 3, revenue: 45600, estimatedProfit: 29600 }],
        },
        last30: {
          totals: {
            orderCount: 2,
            activeOrderCount: 1,
            finalizedOrderCount: 1,
            unpaidOrderCount: 1,
            grossRevenue: 33600,
            paidRevenue: 21600,
            pendingRevenue: 12000,
            estimatedCosts: 12000,
            estimatedProfit: 21600,
            totalUnits: 24,
            averageTicket: 16800,
          },
          topClients: [
            {
              customerId: 'customer-2',
              name: 'Mauro Altamirano',
              orderCount: 1,
              totalRevenue: 21600,
            },
          ],
          topVarieties: [{ menuItemId: 'menu-2', name: 'Humita', quantity: 12 }],
          statusSummary: { confirmed: 1, inProduction: 0, ready: 0, delivered: 1, total: 2 },
          recentOrders: [],
          chartDays: [{ date: '2026-05-06', count: 2, revenue: 33600, estimatedProfit: 21600 }],
        },
        last7: {
          totals: {
            orderCount: 1,
            activeOrderCount: 1,
            finalizedOrderCount: 0,
            unpaidOrderCount: 1,
            grossRevenue: 12000,
            paidRevenue: 0,
            pendingRevenue: 12000,
            estimatedCosts: 4000,
            estimatedProfit: 8000,
            totalUnits: 12,
            averageTicket: 12000,
          },
          topClients: [
            { customerId: 'customer-1', name: 'Ana Pérez', orderCount: 1, totalRevenue: 12000 },
          ],
          topVarieties: [{ menuItemId: 'menu-1', name: 'Carne suave', quantity: 6 }],
          statusSummary: { confirmed: 1, inProduction: 0, ready: 0, delivered: 0, total: 1 },
          recentOrders: [],
          chartDays: [{ date: '2026-05-06', count: 1, revenue: 12000, estimatedProfit: 8000 }],
        },
      },
      varietySales: {
        all: [{ menuItemId: 'menu-1', name: 'Carne suave', quantity: 24 }],
        last30: [{ menuItemId: 'menu-2', name: 'Humita', quantity: 12 }],
        last7: [{ menuItemId: 'menu-1', name: 'Carne suave', quantity: 6 }],
        selectedDate: [],
      },
    };
    vi.mocked(getDailyDashboard).mockResolvedValue(dashboardResponse);
  });

  it('shows daily order count, revenue, delivery shifts and top varieties', async () => {
    renderDashboardPage();

    expect(await screen.findByText('Centro operativo')).toBeInTheDocument();
    expect(await screen.findByText('3')).toBeInTheDocument();
    expect(screen.getAllByText('ARS 45.600').length).toBeGreaterThan(0);
    expect(screen.getByText(/rango de análisis/i)).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /ventas en pesos · histórico completo/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('Carne suave')).toBeInTheDocument();
    expect(screen.getByText(/24 unidades/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /resumen general/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /accesos rápidos/i })).not.toBeInTheDocument();
  });

  it('applies the selected dashboard range to KPIs, rankings, status and chart', async () => {
    renderDashboardPage();

    fireEvent.click(await screen.findByRole('button', { name: /últimos 7 días/i }));

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /ventas en pesos · últimos 7 días/i }),
      ).toBeInTheDocument();
    });
    expect(screen.getAllByText('ARS 12.000').length).toBeGreaterThan(0);
    expect(screen.getByText('6 unidades')).toBeInTheDocument();
    expect(screen.getByText('Ana Pérez')).toBeInTheDocument();
    expect(screen.getAllByText(/^1$/).length).toBeGreaterThan(0);
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
