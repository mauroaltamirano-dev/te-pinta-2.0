import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createQueryClient } from '@/lib/query-client';

import { getDailyDashboard, type DailyDashboard } from '../dashboard/dashboard-api';
import { SalesPage } from './SalesPage';

vi.mock('../dashboard/dashboard-api', () => ({
  getDailyDashboard: vi.fn(),
}));

const totals = {
  orderCount: 3,
  activeOrderCount: 1,
  finalizedOrderCount: 2,
  unpaidOrderCount: 1,
  grossRevenue: 72000,
  paidRevenue: 60000,
  pendingRevenue: 12000,
  estimatedCosts: 30000,
  estimatedProfit: 42000,
  totalUnits: 60,
  soldDozens: 5,
  averageTicket: 24000,
};

const comparisons = {
  sales: {
    value: '+20%',
    label: 'vs período anterior',
    direction: 'positive' as const,
    currentValue: 72000,
    previousValue: 60000,
    difference: 12000,
    changePercent: 20,
  },
  profit: {
    value: '+10%',
    label: 'vs período anterior',
    direction: 'positive' as const,
    currentValue: 42000,
    previousValue: 38000,
    difference: 4000,
    changePercent: 10,
  },
  orders: {
    value: '+1',
    label: 'vs período anterior',
    direction: 'positive' as const,
    currentValue: 3,
    previousValue: 2,
    difference: 1,
    changePercent: 50,
  },
  dozens: {
    value: '+1',
    label: 'vs período anterior',
    direction: 'positive' as const,
    currentValue: 5,
    previousValue: 4,
    difference: 1,
    changePercent: 25,
  },
  averageTicket: {
    value: '+5%',
    label: 'vs período anterior',
    direction: 'positive' as const,
    currentValue: 24000,
    previousValue: 22800,
    difference: 1200,
    changePercent: 5,
  },
  pendingRevenue: {
    value: '-10%',
    label: 'vs período anterior',
    direction: 'positive' as const,
    currentValue: 12000,
    previousValue: 13300,
    difference: -1300,
    changePercent: -10,
  },
};

const chartDays = [
  { date: '2026-06-22', count: 1, revenue: 24000 },
  { date: '2026-06-23', count: 2, revenue: 48000 },
  { date: '2026-06-24', count: 0, revenue: 0 },
  { date: '2026-06-25', count: 0, revenue: 0 },
  { date: '2026-06-26', count: 0, revenue: 0 },
  { date: '2026-06-27', count: 0, revenue: 0 },
  { date: '2026-06-28', count: 0, revenue: 0 },
];

const dashboard: DailyDashboard = {
  date: '2026-06-16',
  orderCount: 3,
  totalRevenue: 72000,
  deliveryShifts: { mediodia: 1, tarde: 1, noche: 1 },
  topVarieties: [{ menuItemId: 'menu-1', name: 'Carne suave', quantity: 36 }],
  topClients: [{ customerId: 'customer-1', name: 'Ana Pérez', orderCount: 2, totalRevenue: 50000 }],
  upcomingOrders: [],
  nextSevenDays: chartDays,
  lastSevenDays: chartDays,
  statusSummary: { confirmed: 1, inProduction: 0, ready: 0, delivered: 2, total: 3 },
  recentOrders: [
    {
      id: 'order-1',
      customerName: 'Ana Pérez',
      deliveryDate: '2026-06-16',
      deliveryTime: 'noche',
      status: 'entregado',
      isPaid: true,
      total: 30000,
    },
  ],
  totals,
  rangeTotals: { all: totals, last31: totals, last7: totals },
  kpiComparisons: comparisons,
  selectedRange: {
    mode: 'custom',
    label: 'Semana actual',
    startDate: '2026-06-15',
    endDate: '2026-06-21',
  },
  selectedRangeAnalytics: {
    totals,
    customerStats: {
      newCustomers: 1,
      recurringCustomers: 2,
    },
    topClients: [
      { customerId: 'customer-1', name: 'Ana Pérez', orderCount: 2, totalRevenue: 50000 },
    ],
    topVarieties: [{ menuItemId: 'menu-1', name: 'Carne suave', quantity: 36 }],
    statusSummary: { confirmed: 1, inProduction: 0, ready: 0, delivered: 2, total: 3 },
    recentOrders: [
      {
        id: 'order-1',
        customerName: 'Ana Pérez',
        deliveryDate: '2026-06-16',
        deliveryTime: 'noche',
        status: 'entregado',
        isPaid: true,
        total: 30000,
      },
    ],
    chartDays,
  },
  varietySales: {
    all: [{ menuItemId: 'menu-1', name: 'Carne suave', quantity: 36 }],
    last31: [{ menuItemId: 'menu-1', name: 'Carne suave', quantity: 36 }],
    last7: [{ menuItemId: 'menu-1', name: 'Carne suave', quantity: 36 }],
    selectedDate: [{ menuItemId: 'menu-1', name: 'Carne suave', quantity: 36 }],
  },
};

describe('SalesPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getDailyDashboard).mockResolvedValue(dashboard);
  });

  it('renders sales KPIs, trends, clients, products, and recent orders from dashboard data', async () => {
    render(
      <QueryClientProvider client={createQueryClient()}>
        <MemoryRouter>
          <SalesPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByRole('heading', { name: 'Ventas' })).toBeInTheDocument();
    expect(await screen.findByLabelText(/ventas del período: \$\s*72\.000/i)).toBeInTheDocument();
    expect(screen.getAllByText('Ana Pérez').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Carne suave').length).toBeGreaterThan(0);
    expect(screen.getByText(/\$\s*30\.000/i)).toBeInTheDocument();
    expect(screen.getByText('Nuevos').nextElementSibling).toHaveTextContent('1');
    expect(screen.getByText('Recurrentes').nextElementSibling).toHaveTextContent('2');
    expect(screen.getByLabelText(/Lun: \$\s*24\.000/i).parentElement).toHaveClass('flex-1');
    expect(screen.getByLabelText(/Mié: \$\s*0/i)).toHaveStyle({ height: '0%' });
    expect(screen.getByText('+20% vs período anterior')).toBeInTheDocument();
  });
});
