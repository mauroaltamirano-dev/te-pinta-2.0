import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createQueryClient } from '@/lib/query-client';

import { listOrders, type OrderListResponse } from '../orders/orders-api';
import { getDailyDashboard, type DailyDashboard } from './dashboard-api';
import { DashboardPage } from './DashboardPage';

vi.mock('../orders/orders-api', () => ({
  listOrders: vi.fn(),
}));

vi.mock('./dashboard-api', () => ({
  getDailyDashboard: vi.fn(),
}));

const totals = {
  orderCount: 13,
  activeOrderCount: 10,
  finalizedOrderCount: 3,
  unpaidOrderCount: 3,
  grossRevenue: 185000,
  paidRevenue: 153000,
  pendingRevenue: 32000,
  estimatedCosts: 130500,
  estimatedProfit: 54500,
  totalUnits: 204,
  soldDozens: 17,
  averageTicket: 14230,
};

const zeroTotals = {
  orderCount: 0,
  activeOrderCount: 0,
  finalizedOrderCount: 0,
  unpaidOrderCount: 0,
  grossRevenue: 0,
  paidRevenue: 0,
  pendingRevenue: 0,
  estimatedCosts: 0,
  estimatedProfit: 0,
  totalUnits: 0,
  soldDozens: 0,
  averageTicket: 0,
};

const chartDays = [
  { date: '2026-06-01', count: 1, revenue: 18000, estimatedProfit: 5400 },
  { date: '2026-06-02', count: 2, revenue: 22000, estimatedProfit: 6600 },
  { date: '2026-06-03', count: 2, revenue: 27000, estimatedProfit: 8100 },
  { date: '2026-06-04', count: 3, revenue: 31000, estimatedProfit: 9300 },
  { date: '2026-06-05', count: 2, revenue: 24000, estimatedProfit: 7200 },
  { date: '2026-06-06', count: 2, revenue: 38000, estimatedProfit: 11400 },
  { date: '2026-06-07', count: 1, revenue: 25000, estimatedProfit: 7500 },
];

const dashboardResponse: DailyDashboard = {
  date: '2026-06-04',
  orderCount: 3,
  totalRevenue: 31000,
  deliveryShifts: {
    mediodia: 1,
    tarde: 1,
    noche: 1,
  },
  topVarieties: [
    { menuItemId: 'menu-1', name: 'Salteña', quantity: 34 },
    { menuItemId: 'menu-2', name: 'Jamón y queso', quantity: 31 },
  ],
  topClients: [
    { customerId: 'customer-1', name: 'Distribuidora San Martín', orderCount: 4, totalRevenue: 48000 },
    { customerId: 'customer-2', name: 'María Gómez', orderCount: 2, totalRevenue: 36000 },
  ],
  upcomingOrders: [],
  nextSevenDays: chartDays,
  lastSevenDays: chartDays,
  statusSummary: { confirmed: 6, inProduction: 0, ready: 2, delivered: 5, total: 13 },
  recentOrders: [],
  totals,
  rangeTotals: { all: totals, last31: totals, last7: totals },
  rangeAnalytics: {
    all: {
      totals,
      topClients: [],
      topVarieties: [],
      statusSummary: { confirmed: 6, inProduction: 0, ready: 2, delivered: 5, total: 13 },
      recentOrders: [],
      chartDays,
    },
    last31: {
      totals,
      topClients: [],
      topVarieties: [],
      statusSummary: { confirmed: 6, inProduction: 0, ready: 2, delivered: 5, total: 13 },
      recentOrders: [],
      chartDays,
    },
    last7: {
      totals,
      topClients: [],
      topVarieties: [],
      statusSummary: { confirmed: 6, inProduction: 0, ready: 2, delivered: 5, total: 13 },
      recentOrders: [],
      chartDays,
    },
  },
  selectedRange: {
    mode: 'custom',
    label: '01/06/2026 – 07/06/2026',
    startDate: '2026-06-01',
    endDate: '2026-06-07',
  },
  selectedRangeAnalytics: {
    totals,
    topClients: [
      { customerId: 'customer-1', name: 'Distribuidora San Martín', orderCount: 4, totalRevenue: 48000 },
      { customerId: 'customer-2', name: 'María Gómez', orderCount: 2, totalRevenue: 36000 },
      { customerId: 'customer-3', name: 'Juan Pérez', orderCount: 1, totalRevenue: 12000 },
      { customerId: 'customer-4', name: 'Sofía López', orderCount: 1, totalRevenue: 9000 },
    ],
    topVarieties: [
      { menuItemId: 'menu-1', name: 'Salteña', quantity: 34 },
      { menuItemId: 'menu-2', name: 'Jamón y queso', quantity: 31 },
      { menuItemId: 'menu-3', name: 'Caprese', quantity: 26 },
    ],
    statusSummary: { confirmed: 6, inProduction: 0, ready: 2, delivered: 5, total: 13 },
    recentOrders: [],
    chartDays,
  },
  weeklyVarietyAnalytics: {
    currentWeek: { startDate: '2026-06-01', endDate: '2026-06-07' },
    comparisonWeek: { startDate: '2026-05-25', endDate: '2026-05-31' },
    varieties: [],
  },
  varietySales: {
    all: [],
    last31: [],
    last7: [],
    selectedDate: [],
  },
};

const ordersResponse: OrderListResponse = {
  orders: [
    {
      id: 'order-1043',
      customer: { id: 'customer-2', name: 'María Gómez', phone: '1122334455', address: null },
      deliveryDate: '2026-06-04',
      deliveryTime: 'tarde',
      deliveryType: 'retiro',
      cooked: false,
      notes: null,
      discountPercent: 0,
      deliveryFee: 0,
      cookingFee: 0,
      subtotal: 42000,
      total: 42000,
      status: 'confirmado',
      isPaid: false,
      itemCount: 2,
      totalQuantity: 36,
      items: [
        { id: 'item-1', menuItemId: 'menu-1', menuItemName: 'Salteña', quantity: 24, unitPrice: 1200, subtotal: 28800 },
        { id: 'item-2', menuItemId: 'menu-2', menuItemName: 'Jamón y queso', quantity: 12, unitPrice: 1100, subtotal: 13200 },
      ],
    },
    {
      id: 'order-1044',
      customer: { id: 'customer-3', name: 'Juan Pérez', phone: null, address: null },
      deliveryDate: '2026-06-05',
      deliveryTime: 'noche',
      deliveryType: 'envio',
      cooked: false,
      notes: null,
      discountPercent: 0,
      deliveryFee: 0,
      cookingFee: 0,
      subtotal: 24000,
      total: 24000,
      status: 'confirmado',
      isPaid: true,
      itemCount: 1,
      totalQuantity: 24,
      items: [
        { id: 'item-3', menuItemId: 'menu-3', menuItemName: 'Caprese', quantity: 24, unitPrice: 1000, subtotal: 24000 },
      ],
    },
  ],
  pagination: {
    page: 1,
    pageSize: 8,
    total: 2,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  },
  stats: { active: 2, finalized: 0 },
};

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
    vi.mocked(getDailyDashboard).mockResolvedValue(dashboardResponse);
    vi.mocked(listOrders).mockResolvedValue(ordersResponse);
  });

  it('shows the operational dashboard structure with real dashboard and order data', async () => {
    renderDashboardPage();

    expect(await screen.findByRole('heading', { name: /dashboard general/i })).toBeInTheDocument();
    expect(screen.getByText(/resumen operativo y financiero del emprendimiento/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /nuevo pedido/i })).toHaveAttribute('href', '/orders');
    expect(screen.getByRole('link', { name: /registrar gasto/i })).toHaveAttribute(
      'href',
      '/finanzas?section=purchases',
    );

    expect(screen.getByText('Ventas del período')).toBeInTheDocument();
    expect(screen.getByText('$185.000')).toBeInTheDocument();
    expect(screen.getByText('Ganancia estimada')).toBeInTheDocument();
    expect(screen.getAllByText('$54.500').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Pendiente de cobro').length).toBeGreaterThan(0);

    expect(screen.getByRole('heading', { name: /agenda inmediata/i })).toBeInTheDocument();
    expect(screen.getAllByText(/maría gómez/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: /qué hay que producir/i })).toBeInTheDocument();
    expect(screen.getByText(/salteña/i)).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: /dinero asignado/i })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: /top clientes/i })).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: /productos más vendidos/i }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: /desempeño por variedad/i }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: /seguimiento secundario/i }),
    ).toBeInTheDocument();
  });

  it('groups range controls and commercial analytics without the weekly calendar', async () => {
    renderDashboardPage();

    expect(await screen.findByRole('group', { name: /presets rápidos/i })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /rango manual/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/fecha de referencia/i)).toBeInTheDocument();

    const commercialAnalytics = await screen.findByRole('region', {
      name: /analítica comercial/i,
    });

    expect(
      within(commercialAnalytics).getByRole('heading', { name: /top clientes/i }),
    ).toBeInTheDocument();
    expect(
      within(commercialAnalytics).getByRole('heading', { name: /productos más vendidos/i }),
    ).toBeInTheDocument();
    expect(
      within(commercialAnalytics).getByRole('heading', { name: /desempeño por variedad/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/ventas semanales/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /ritmo de venta/i })).not.toBeInTheDocument();
  });

  it('requests custom range analytics with explicit from and to dates', async () => {
    renderDashboardPage();

    fireEvent.click(await screen.findByRole('button', { name: /rango personalizado/i }));
    fireEvent.change(screen.getByLabelText(/desde/i), { target: { value: '2026-05-01' } });
    fireEvent.change(screen.getByLabelText(/hasta/i), { target: { value: '2026-05-15' } });

    await waitFor(() => {
      expect(getDailyDashboard).toHaveBeenLastCalledWith({
        date: expect.any(String),
        analyticsMode: 'custom',
        startDate: '2026-05-01',
        endDate: '2026-05-15',
      });
    });
  });

  it('reloads the dashboard for the selected day filter and date', async () => {
    renderDashboardPage();

    fireEvent.click(await screen.findByRole('button', { name: /^hoy$/i }));
    fireEvent.change(screen.getByLabelText(/fecha de referencia/i), {
      target: { value: '2026-05-07' },
    });

    await waitFor(() => {
      expect(getDailyDashboard).toHaveBeenLastCalledWith({
        date: '2026-05-07',
        analyticsMode: 'custom',
        startDate: '2026-05-07',
        endDate: '2026-05-07',
      });
    });
  });

  it('shows empty states when real data exists but the period has no activity', async () => {
    vi.mocked(getDailyDashboard).mockResolvedValue({
      ...dashboardResponse,
      totals: zeroTotals,
      rangeTotals: { all: zeroTotals, last31: zeroTotals, last7: zeroTotals },
      topClients: [],
      topVarieties: [],
      selectedRangeAnalytics: {
        totals: zeroTotals,
        topClients: [],
        topVarieties: [],
        statusSummary: { confirmed: 0, inProduction: 0, ready: 0, delivered: 0, total: 0 },
        recentOrders: [],
        chartDays: [],
      },
    });
    vi.mocked(listOrders).mockResolvedValue({
      orders: [],
      pagination: {
        page: 1,
        pageSize: 8,
        total: 0,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
      stats: { active: 0, finalized: 0 },
    });

    renderDashboardPage();

    expect(await screen.findByText(/no hay pedidos próximos/i)).toBeInTheDocument();
    expect(screen.getByText(/no hay producción pendiente/i)).toBeInTheDocument();
    expect(screen.getAllByText(/no hay ventas en el período/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/no hay clientes para este período/i)).toBeInTheDocument();
  });
});
