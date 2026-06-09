import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createQueryClient } from '@/lib/query-client';

import { listFinancePurchases } from '../finance/api';
import type { FinancePurchaseDetail } from '../finance/types';
import {
  listOrders,
  updateOrderPayment,
  updateOrderStatus,
  type OrderDetail,
  type OrderListResponse,
} from '../orders/orders-api';
import { getDailyDashboard, type DailyDashboard } from './dashboard-api';
import { DashboardPage } from './DashboardPage';

vi.mock('../finance/api', () => ({
  listFinancePurchases: vi.fn(),
}));

vi.mock('../finance/hooks/useFinanceAssumptions', () => ({
  useFinanceAssumptions: vi.fn(() => ({
    assumptions: { servicePercent: 10, targetMarginPercent: 50 },
    isLoading: false,
    isUpdating: false,
    updateAssumption: vi.fn(),
  })),
}));

vi.mock('../orders/orders-api', () => ({
  listOrders: vi.fn(),
  updateOrderPayment: vi.fn(),
  updateOrderStatus: vi.fn(),
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

const financePurchases: FinancePurchaseDetail[] = [
  {
    id: 'purchase-1',
    purchaseDate: '2026-06-02',
    supplier: 'Molino norte',
    receiptNumber: 'A-001',
    notes: null,
    fundingSource: 'production_cost',
    canceledAt: null,
    canceledReason: null,
    items: [
      {
        id: 'purchase-item-1',
        purchaseId: 'purchase-1',
        productId: 'product-1',
        purchaseUnit: 'kg',
        purchaseQuantity: 2,
        unitsPerPackage: 1,
        totalBaseUnits: 2,
        unitPriceCents: 600000,
        totalPriceCents: 1200000,
        costPerBaseUnitCents: 600000,
        notes: null,
      },
    ],
  },
  {
    id: 'purchase-2',
    purchaseDate: '2026-06-04',
    supplier: 'Verdulería centro',
    receiptNumber: 'B-014',
    notes: null,
    fundingSource: 'services',
    canceledAt: null,
    canceledReason: null,
    items: [
      {
        id: 'purchase-item-2',
        purchaseId: 'purchase-2',
        productId: 'product-2',
        purchaseUnit: 'kg',
        purchaseQuantity: 3,
        unitsPerPackage: 1,
        totalBaseUnits: 3,
        unitPriceCents: 200000,
        totalPriceCents: 600000,
        costPerBaseUnitCents: 200000,
        notes: null,
      },
    ],
  },
  {
    id: 'purchase-canceled',
    purchaseDate: '2026-06-04',
    supplier: 'Compra anulada',
    receiptNumber: null,
    notes: null,
    fundingSource: 'production_cost',
    canceledAt: '2026-06-04T12:00:00.000Z',
    canceledReason: 'Duplicada',
    items: [
      {
        id: 'purchase-item-canceled',
        purchaseId: 'purchase-canceled',
        productId: 'product-3',
        purchaseUnit: 'kg',
        purchaseQuantity: 1,
        unitsPerPackage: 1,
        totalBaseUnits: 1,
        unitPriceCents: 999000,
        totalPriceCents: 999000,
        costPerBaseUnitCents: 999000,
        notes: null,
      },
    ],
  },
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
    {
      customerId: 'customer-1',
      name: 'Distribuidora San Martín',
      orderCount: 4,
      totalRevenue: 48000,
    },
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
      {
        customerId: 'customer-1',
        name: 'Distribuidora San Martín',
        orderCount: 4,
        totalRevenue: 48000,
      },
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
  kpiComparisons: {
    sales: {
      value: '+26,7%',
      label: 'vs período anterior real',
      direction: 'positive',
      currentValue: 185000,
      previousValue: 146000,
      difference: 39000,
      changePercent: 26.7,
    },
    profit: {
      value: '+$11.200',
      label: 'vs período anterior real',
      direction: 'positive',
      currentValue: 54500,
      previousValue: 43300,
      difference: 11200,
      changePercent: 25.9,
    },
    orders: {
      value: '+4',
      label: 'vs período anterior real',
      direction: 'positive',
      currentValue: 13,
      previousValue: 9,
      difference: 4,
      changePercent: 44.4,
    },
    dozens: {
      value: '+3,5',
      label: 'vs período anterior real',
      direction: 'positive',
      currentValue: 17,
      previousValue: 13.5,
      difference: 3.5,
      changePercent: 25.9,
    },
    averageTicket: {
      value: '-$820',
      label: 'vs período anterior real',
      direction: 'negative',
      currentValue: 14230,
      previousValue: 15050,
      difference: -820,
      changePercent: -5.4,
    },
    pendingRevenue: {
      value: '+$7.500',
      label: 'vs período anterior real',
      direction: 'negative',
      currentValue: 32000,
      previousValue: 24500,
      difference: 7500,
      changePercent: 30.6,
    },
  },
  accountingSummary: {
    servicePercent: 25,
    totals: {
      paidRevenue: 150000,
      directCost: 95000,
      grossProfit: 55000,
      serviceReserve: 13750,
      profitReserve: 41250,
      purchases: {
        productionCost: 53000,
        services: 5750,
        profit: 8250,
      },
    },
    wallets: [
      {
        id: 'base-cost',
        title: 'Costo base',
        amount: 42000,
        percent: 63,
        objectiveLabel: 'Reserva API: $95.000',
        differenceLabel: 'Disponible API producción: $42.000',
        status: 'correct',
        progress: 44,
        description: 'Saldo contable all-time para producción.',
      },
      {
        id: 'services',
        title: 'Servicios',
        amount: 8000,
        percent: 12,
        objectiveLabel: 'Objetivo API: 25% de ganancia bruta',
        differenceLabel: 'Disponible API servicios: $8.000',
        status: 'correct',
        progress: 58,
        description: 'Saldo contable all-time para servicios.',
      },
      {
        id: 'profit',
        title: 'Ganancia',
        amount: 33000,
        percent: 49,
        objectiveLabel: 'Ganancia libre API: $41.250',
        differenceLabel: 'Disponible API ganancia: $33.000',
        status: 'correct',
        progress: 80,
        description: 'Saldo contable all-time para ganancia.',
      },
    ],
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
        {
          id: 'item-1',
          menuItemId: 'menu-1',
          menuItemName: 'Salteña',
          quantity: 24,
          unitPrice: 1200,
          subtotal: 28800,
        },
        {
          id: 'item-2',
          menuItemId: 'menu-2',
          menuItemName: 'Jamón y queso',
          quantity: 12,
          unitPrice: 1100,
          subtotal: 13200,
        },
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
        {
          id: 'item-3',
          menuItemId: 'menu-3',
          menuItemName: 'Caprese',
          quantity: 24,
          unitPrice: 1000,
          subtotal: 24000,
        },
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

const orderDetailFromListItem = (index: number): OrderDetail => {
  const order = ordersResponse.orders[index];

  if (!order) throw new Error(`Missing order fixture at index ${index}`);

  return {
    ...order,
    addons: [],
    items: order.items ?? [],
  };
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
    vi.mocked(updateOrderPayment).mockResolvedValue({
      ...orderDetailFromListItem(0),
      isPaid: true,
    });
    vi.mocked(updateOrderStatus).mockResolvedValue({
      ...orderDetailFromListItem(0),
      status: 'preparado',
    });
    vi.mocked(listFinancePurchases).mockResolvedValue(financePurchases);
  });

  it('shows the operational dashboard structure with real dashboard and order data', async () => {
    renderDashboardPage();

    expect(await screen.findByRole('heading', { name: /dashboard general/i })).toBeInTheDocument();
    expect(
      screen.getByText(/resumen operativo y financiero del emprendimiento/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /nuevo pedido/i })).toHaveAttribute('href', '/orders');
    expect(screen.getByRole('link', { name: /registrar gasto/i })).toHaveAttribute(
      'href',
      '/finanzas?section=purchases',
    );

    expect(screen.getByText('Ventas del período')).toBeInTheDocument();
    expect(screen.getByText('$185.000')).toBeInTheDocument();
    expect(await screen.findByText('+26,7%')).toBeInTheDocument();
    expect(screen.getAllByText(/vs período anterior real/i).length).toBeGreaterThan(0);
    expect(screen.queryByText('+12,4%')).not.toBeInTheDocument();
    expect(screen.getByText('Ganancia estimada')).toBeInTheDocument();
    expect(screen.getAllByText('$54.500').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Pendiente de cobro').length).toBeGreaterThan(0);

    expect(await screen.findByRole('region', { name: /alertas críticas/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /agenda inmediata/i })).toBeInTheDocument();
    expect(screen.getAllByText(/maría gómez/i).length).toBeGreaterThan(0);
    expect(await screen.findByRole('heading', { name: /dinero asignado/i })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: /top clientes/i })).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: /productos más vendidos/i }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: /desempeño por variedad/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: /qué hay que producir/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /resumen general/i })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: /seguimiento secundario/i }),
    ).not.toBeInTheDocument();
  });

  it('keeps the header compact and moves filters to KPI and commercial sections', async () => {
    renderDashboardPage();

    const header = await screen.findByRole('banner');
    expect(
      within(header).queryByRole('group', { name: /presets rápidos/i }),
    ).not.toBeInTheDocument();
    expect(within(header).queryByRole('group', { name: /rango manual/i })).not.toBeInTheDocument();
    expect(within(header).queryByLabelText(/fecha de referencia/i)).not.toBeInTheDocument();

    expect(
      screen.getByRole('group', { name: /filtro general del dashboard/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /filtro de indicadores/i })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /filtro comercial/i })).toBeInTheDocument();

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

  it('renders accounting wallets from the dashboard API instead of period purchase derivation', async () => {
    renderDashboardPage();

    const heading = await screen.findByRole('heading', { name: /dinero asignado/i });
    const walletsSection = heading.closest('section');
    expect(walletsSection).not.toBeNull();
    const wallets = within(walletsSection!);

    expect(wallets.getByRole('heading', { name: /costo base/i })).toBeInTheDocument();
    expect(wallets.getByRole('heading', { name: /servicios/i })).toBeInTheDocument();
    expect(wallets.getByRole('heading', { name: /ganancia/i })).toBeInTheDocument();
    expect(await wallets.findByText('$42.000')).toBeInTheDocument();
    expect(await wallets.findByText('$8.000')).toBeInTheDocument();
    expect(await wallets.findByText('$33.000')).toBeInTheDocument();
    expect(wallets.getByText(/objetivo api: 25% de ganancia bruta/i)).toBeInTheDocument();
    expect(wallets.queryByText('$118.500')).not.toBeInTheDocument();
  });

  it('syncs general and section filters while preserving sibling section overrides', async () => {
    renderDashboardPage();

    const generalFilter = await screen.findByRole('group', {
      name: /filtro general del dashboard/i,
    });
    const kpiFilter = screen.getByRole('group', { name: /filtro de indicadores/i });
    const commercialFilter = screen.getByRole('group', { name: /filtro comercial/i });

    expect(within(generalFilter).getByRole('button', { name: /semana/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(within(kpiFilter).getByRole('button', { name: /semana/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(within(commercialFilter).getByRole('button', { name: /semana/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    fireEvent.click(within(commercialFilter).getByRole('button', { name: /mes/i }));

    expect(within(generalFilter).getByRole('button', { name: /personalizado/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(within(kpiFilter).getByRole('button', { name: /semana/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(within(commercialFilter).getByRole('button', { name: /mes/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    fireEvent.change(screen.getByLabelText(/fecha de referencia/i), {
      target: { value: '2026-05-07' },
    });
    fireEvent.click(within(generalFilter).getByRole('button', { name: /siempre/i }));

    expect(within(generalFilter).getByRole('button', { name: /siempre/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(within(kpiFilter).getByRole('button', { name: /siempre/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(within(commercialFilter).getByRole('button', { name: /siempre/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await waitFor(() => {
      expect(getDailyDashboard).toHaveBeenCalledWith({
        date: '2026-05-07',
        analyticsMode: 'preset',
        preset: 'all',
      });
    });
  });

  it('runs agenda actions and refreshes dashboard/order queries', async () => {
    renderDashboardPage();

    const agendaHeading = await screen.findByRole('heading', { name: /agenda inmediata/i });
    const agendaSection = agendaHeading.closest('section');
    expect(agendaSection).not.toBeNull();
    const agenda = within(agendaSection!);
    await waitFor(() => {
      expect(agenda.getAllByRole('link', { name: /^ver pedido$/i })[0]).toHaveAttribute(
        'href',
        '/orders?orderId=order-1043',
      );
    });
    const dashboardCallsBeforeAction = vi.mocked(getDailyDashboard).mock.calls.length;
    const orderCallsBeforeAction = vi.mocked(listOrders).mock.calls.length;

    const markPaidButton = agenda.getByRole('button', {
      name: /marcar pagado.*maría gómez.*#1043/i,
    });

    fireEvent.click(markPaidButton);

    await waitFor(() => {
      expect(updateOrderPayment).toHaveBeenCalledWith('order-1043', true);
    });
    await waitFor(() => {
      expect(vi.mocked(getDailyDashboard).mock.calls.length).toBeGreaterThan(
        dashboardCallsBeforeAction,
      );
      expect(vi.mocked(listOrders).mock.calls.length).toBeGreaterThan(orderCallsBeforeAction);
    });

    fireEvent.click(
      agenda.getByRole('button', { name: /marcar preparado.*maría gómez.*#1043/i }),
    );

    await waitFor(() => {
      expect(updateOrderStatus).toHaveBeenCalledWith('order-1043', 'preparado');
    });
  });

  it('keeps paid state in dashboard upcoming fallback while orders are loading', async () => {
    vi.mocked(listOrders).mockReturnValue(new Promise<OrderListResponse>(() => undefined));
    vi.mocked(getDailyDashboard).mockResolvedValue({
      ...dashboardResponse,
      upcomingOrders: [
        {
          id: 'order-1044',
          customerName: 'Juan Pérez',
          deliveryDate: '2026-06-05',
          deliveryTime: 'noche',
          status: 'confirmado',
          isPaid: true,
          total: 24000,
        },
      ],
    });

    renderDashboardPage();

    const agendaHeading = await screen.findByRole('heading', { name: /agenda inmediata/i });
    const agendaSection = agendaHeading.closest('section');
    expect(agendaSection).not.toBeNull();
    const agenda = within(agendaSection!);

    expect(await agenda.findByText('Pagado')).toBeInTheDocument();
    expect(
      agenda.queryByRole('button', { name: /marcar pagado.*juan pérez.*#1044/i }),
    ).not.toBeInTheDocument();
    expect(
      agenda.getByRole('button', { name: /marcar preparado.*juan pérez.*#1044/i }),
    ).toBeInTheDocument();
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
    expect(screen.getAllByText(/no hay ventas en el período/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/no hay clientes para este período/i)).toBeInTheDocument();
  });
});
