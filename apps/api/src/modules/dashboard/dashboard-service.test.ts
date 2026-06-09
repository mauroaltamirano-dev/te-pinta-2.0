import { describe, expect, it } from 'vitest';

import type {
  DashboardOrder,
  DashboardOrderItem,
  DashboardPurchase,
  DashboardRepository,
} from './dashboard-service';
import { getDailyDashboard } from './dashboard-service';

const item = (overrides: Partial<DashboardOrderItem> = {}): DashboardOrderItem => ({
  menuItemId: 'menu-1',
  menuItemName: 'Carne suave',
  quantity: 12,
  costPerDozen: 7000,
  priceDozen: 15000,
  ...overrides,
});

const order = (overrides: Partial<DashboardOrder> = {}): DashboardOrder => ({
  id: 'order-1',
  customerId: 'customer-1',
  customerName: 'Ana',
  deliveryDate: '2026-05-06',
  deliveryTime: 'noche',
  status: 'entregado',
  isPaid: true,
  createdAt: new Date('2026-05-06T10:00:00.000Z'),
  subtotal: 15000,
  total: 15000,
  items: [item()],
  ...overrides,
});

const purchase = (overrides: Partial<DashboardPurchase> = {}): DashboardPurchase => ({
  id: 'purchase-1',
  fundingSource: 'production_cost',
  canceledAt: null,
  items: [{ totalPriceCents: 3_000_00 }],
  ...overrides,
});

const repository = (
  orders: DashboardOrder[],
  overrides: Partial<DashboardRepository> = {},
): DashboardRepository => ({
  listOrders: async () => orders,
  listPurchases: async () => [],
  getSetting: async (key) =>
    key === 'finance_dashboard_service_percent' ? { key, value: '20' } : null,
  ...overrides,
});

describe('dashboard service', () => {
  it('summarizes selected day and full business metrics', async () => {
    const testRepository = repository([
      order(),
      order({
        id: 'order-2',
        customerId: 'customer-2',
        customerName: 'Beto',
        deliveryTime: 'mediodia',
        total: 9000,
        isPaid: false,
        status: 'confirmado',
        items: [
          item({ menuItemId: 'menu-2', menuItemName: 'Jamón y queso', quantity: 6 }),
          item({ quantity: 3 }),
        ],
      }),
      order({
        id: 'order-3',
        deliveryDate: '2026-05-01',
        total: 4500,
        items: [item({ menuItemId: 'menu-2', menuItemName: 'Jamón y queso', quantity: 2 })],
      }),
    ]);

    const result = await getDailyDashboard(
      { date: '2026-05-06' },
      testRepository,
      () => new Date('2026-05-06T12:00:00.000Z'),
    );

    expect(result).toMatchObject({
      date: '2026-05-06',
      orderCount: 2,
      totalRevenue: 24000,
      deliveryShifts: {
        mediodia: 1,
        tarde: 0,
        noche: 1,
      },
      topVarieties: [
        { menuItemId: 'menu-1', name: 'Carne suave', quantity: 15 },
        { menuItemId: 'menu-2', name: 'Jamón y queso', quantity: 6 },
      ],
      totals: {
        orderCount: 3,
        activeOrderCount: 1,
        finalizedOrderCount: 2,
        unpaidOrderCount: 1,
        grossRevenue: 28500,
        paidRevenue: 19500,
        pendingRevenue: 9000,
        totalUnits: 23,
        soldDozens: 1.92,
        averageTicket: 9500,
      },
      selectedRange: {
        mode: 'preset',
        preset: 'all',
        label: 'Siempre · desde 01/05/2026',
        startDate: '2026-05-01',
        endDate: '2026-05-06',
      },
      statusSummary: {
        confirmed: 1,
        inProduction: 0,
        ready: 0,
        delivered: 2,
        total: 3,
      },
      topClients: [
        { customerId: 'customer-1', name: 'Ana', orderCount: 2, totalRevenue: 19500 },
        { customerId: 'customer-2', name: 'Beto', orderCount: 1, totalRevenue: 9000 },
      ],
    });
  });

  it('uses today when no date is provided', async () => {
    const testRepository = repository([]);

    const result = await getDailyDashboard(
      {},
      testRepository,
      () => new Date('2026-05-06T12:00:00.000Z'),
    );

    expect(result.date).toBe('2026-05-06');
  });

  it('uses the saved finance cost snapshot before falling back to menu item costs', async () => {
    const testRepository = repository([
      order({
        costTotalCents: 10_000_00,
        total: 24000,
        items: [item({ quantity: 12, costPerDozen: 1000 })],
      }),
      order({
        id: 'order-without-snapshot',
        total: 12000,
        items: [item({ quantity: 12, costPerDozen: 4000 })],
      }),
    ]);

    const result = await getDailyDashboard(
      { date: '2026-05-06' },
      testRepository,
      () => new Date('2026-05-06T12:00:00.000Z'),
    );

    expect(result.totals.estimatedCosts).toBe(14000);
    expect(result.totals.estimatedProfit).toBe(22000);
  });

  it('uses the Argentina business date when UTC is already tomorrow', async () => {
    const testRepository = repository([
      order({
        id: 'order-today-argentina',
        deliveryDate: '2026-05-30',
        status: 'confirmado',
        isPaid: false,
      }),
    ]);

    const result = await getDailyDashboard(
      {},
      testRepository,
      () => new Date('2026-05-31T00:00:00.000Z'),
    );

    expect(result.date).toBe('2026-05-30');
    expect(result.upcomingOrders).toHaveLength(1);
  });

  it('builds preset range analytics anchored to the selected date', async () => {
    const testRepository = repository([
      order({
        id: 'order-recent',
        deliveryDate: '2026-05-06',
        total: 15000,
        items: [item({ menuItemId: 'menu-1', menuItemName: 'Carne suave', quantity: 12 })],
      }),
      order({
        id: 'order-last30',
        deliveryDate: '2026-04-20',
        total: 9000,
        items: [item({ menuItemId: 'menu-2', menuItemName: 'Humita', quantity: 6 })],
      }),
      order({
        id: 'order-old',
        deliveryDate: '2026-03-01',
        total: 6000,
        items: [item({ menuItemId: 'menu-3', menuItemName: 'Verdura', quantity: 3 })],
      }),
    ]);

    const result = await getDailyDashboard(
      { date: '2026-05-06' },
      testRepository,
      () => new Date('2026-05-06T12:00:00.000Z'),
    );

    expect(result.rangeAnalytics.all.totals.orderCount).toBe(3);
    expect(result.rangeAnalytics.last31.totals.orderCount).toBe(2);
    expect(result.rangeAnalytics.last7.totals.orderCount).toBe(1);
    expect(result.rangeAnalytics.last7.topVarieties).toEqual([
      { menuItemId: 'menu-1', name: 'Carne suave', quantity: 12 },
    ]);
    expect(result.rangeAnalytics.last31.chartDays).toHaveLength(31);
    expect(result.rangeAnalytics.last7.chartDays).toHaveLength(7);
  });

  it('returns custom range analytics with exact range metadata', async () => {
    const testRepository = repository([
      order({ id: 'inside-start', deliveryDate: '2026-05-01', total: 15000 }),
      order({ id: 'inside-end', deliveryDate: '2026-05-15', total: 9000 }),
      order({ id: 'outside', deliveryDate: '2026-05-16', total: 6000 }),
    ]);

    const result = await getDailyDashboard(
      {
        date: '2026-05-30',
        analyticsMode: 'custom',
        startDate: '2026-05-01',
        endDate: '2026-05-15',
      },
      testRepository,
      () => new Date('2026-05-30T12:00:00.000Z'),
    );

    expect(result.selectedRange).toEqual({
      mode: 'custom',
      label: '01/05/2026 – 15/05/2026',
      startDate: '2026-05-01',
      endDate: '2026-05-15',
    });
    expect(result.selectedRangeAnalytics.totals).toMatchObject({
      orderCount: 2,
      grossRevenue: 24000,
      totalUnits: 24,
      soldDozens: 2,
    });
    expect(result.selectedRangeAnalytics.chartDays).toHaveLength(15);
  });

  it('compares variety sales by arbitrary monday-to-sunday week starts', async () => {
    const testRepository = repository([
      order({
        id: 'order-current-week',
        deliveryDate: '2026-05-04',
        items: [item({ menuItemId: 'menu-1', menuItemName: 'Carne suave', quantity: 12 })],
      }),
      order({
        id: 'order-current-week-extra',
        deliveryDate: '2026-05-10',
        items: [item({ menuItemId: 'menu-2', menuItemName: 'Humita', quantity: 6 })],
      }),
      order({
        id: 'order-comparison-week',
        deliveryDate: '2026-04-07',
        items: [
          item({ menuItemId: 'menu-1', menuItemName: 'Carne suave', quantity: 6 }),
          item({ menuItemId: 'menu-3', menuItemName: 'Verdura', quantity: 12 }),
        ],
      }),
    ]);

    const result = await getDailyDashboard(
      {
        date: '2026-05-30',
        analyticsMode: 'weekComparison',
        currentWeekStart: '2026-05-04',
        comparisonWeekStart: '2026-04-07',
      },
      testRepository,
      () => new Date('2026-05-30T12:00:00.000Z'),
    );

    expect(result.weeklyVarietyAnalytics).toEqual({
      currentWeek: { startDate: '2026-05-04', endDate: '2026-05-10' },
      comparisonWeek: { startDate: '2026-04-06', endDate: '2026-04-12' },
      varieties: [
        {
          menuItemId: 'menu-1',
          name: 'Carne suave',
          currentWeekQuantity: 12,
          previousWeekQuantity: 6,
          difference: 6,
          changePercent: 100,
        },
        {
          menuItemId: 'menu-2',
          name: 'Humita',
          currentWeekQuantity: 6,
          previousWeekQuantity: 0,
          difference: 6,
          changePercent: null,
        },
        {
          menuItemId: 'menu-3',
          name: 'Verdura',
          currentWeekQuantity: 0,
          previousWeekQuantity: 12,
          difference: -12,
          changePercent: -100,
        },
      ],
    });
  });

  it('allocates paid sales to accounting wallets with service reserve deducted from gross profit', async () => {
    const testRepository = repository(
      [
        order({
          id: 'paid-order',
          total: 20_000,
          costTotalCents: 12_000_00,
          isPaid: true,
        }),
        order({
          id: 'unpaid-order',
          total: 50_000,
          costTotalCents: 5_000_00,
          isPaid: false,
        }),
      ],
      {
        getSetting: async (key) =>
          key === 'finance_dashboard_service_percent' ? { key, value: '25' } : null,
      },
    );

    const result = await getDailyDashboard(
      { date: '2026-05-06' },
      testRepository,
      () => new Date('2026-05-06T12:00:00.000Z'),
    );

    expect(result.accountingSummary.servicePercent).toBe(25);
    expect(result.accountingSummary.totals).toMatchObject({
      paidRevenue: 20_000,
      directCost: 12_000,
      grossProfit: 8_000,
      serviceReserve: 2_000,
      profitReserve: 6_000,
    });
    expect(result.accountingSummary.wallets.map(({ id, amount }) => ({ id, amount }))).toEqual([
      { id: 'base-cost', amount: 12_000 },
      { id: 'services', amount: 2_000 },
      { id: 'profit', amount: 6_000 },
    ]);
  });

  it('keeps signed profit losses when paid sales are below direct cost', async () => {
    const testRepository = repository(
      [
        order({
          id: 'below-cost-order',
          total: 10_000,
          costTotalCents: 12_000_00,
          isPaid: true,
        }),
      ],
      {
        getSetting: async (key) =>
          key === 'finance_dashboard_service_percent' ? { key, value: '25' } : null,
      },
    );

    const result = await getDailyDashboard(
      { date: '2026-05-06' },
      testRepository,
      () => new Date('2026-05-06T12:00:00.000Z'),
    );

    expect(result.accountingSummary.totals).toMatchObject({
      paidRevenue: 10_000,
      directCost: 12_000,
      grossProfit: -2_000,
      serviceReserve: 0,
      profitReserve: -2_000,
    });
    expect(result.accountingSummary.wallets.map(({ id, amount }) => ({ id, amount }))).toEqual([
      { id: 'base-cost', amount: 12_000 },
      { id: 'services', amount: 0 },
      { id: 'profit', amount: -2_000 },
    ]);
  });

  it('deducts active purchases from their selected wallet and ignores canceled purchases', async () => {
    const testRepository = repository(
      [
        order({
          id: 'paid-order',
          total: 20_000,
          costTotalCents: 12_000_00,
          isPaid: true,
        }),
      ],
      {
        getSetting: async (key) =>
          key === 'finance_dashboard_service_percent' ? { key, value: '25' } : null,
        listPurchases: async () => [
          purchase({
            id: 'flour',
            fundingSource: 'production_cost',
            items: [{ totalPriceCents: 3_000_00 }],
          }),
          purchase({
            id: 'gas',
            fundingSource: 'services',
            items: [{ totalPriceCents: 1_000_00 }],
          }),
          purchase({
            id: 'owner',
            fundingSource: 'profit',
            items: [{ totalPriceCents: 2_500_00 }],
          }),
          purchase({
            id: 'canceled',
            fundingSource: 'production_cost',
            canceledAt: new Date('2026-05-06T12:00:00.000Z'),
            items: [{ totalPriceCents: 9_999_00 }],
          }),
        ],
      },
    );

    const result = await getDailyDashboard(
      { date: '2026-05-06' },
      testRepository,
      () => new Date('2026-05-06T12:00:00.000Z'),
    );

    expect(result.accountingSummary.totals.purchases).toEqual({
      productionCost: 3_000,
      services: 1_000,
      profit: 2_500,
    });
    expect(result.accountingSummary.wallets.map(({ id, amount }) => ({ id, amount }))).toEqual([
      { id: 'base-cost', amount: 9_000 },
      { id: 'services', amount: 1_000 },
      { id: 'profit', amount: 3_500 },
    ]);
  });

  it('keeps accounting wallet balances independent from the selected dashboard period', async () => {
    const testRepository = repository([
      order({
        id: 'paid-may-order',
        deliveryDate: '2026-05-06',
        total: 20_000,
        costTotalCents: 12_000_00,
        isPaid: true,
      }),
    ]);

    const mayDashboard = await getDailyDashboard(
      {
        date: '2026-05-31',
        analyticsMode: 'custom',
        startDate: '2026-05-01',
        endDate: '2026-05-31',
      },
      testRepository,
      () => new Date('2026-05-31T12:00:00.000Z'),
    );
    const juneDashboard = await getDailyDashboard(
      {
        date: '2026-06-30',
        analyticsMode: 'custom',
        startDate: '2026-06-01',
        endDate: '2026-06-30',
      },
      testRepository,
      () => new Date('2026-06-30T12:00:00.000Z'),
    );

    expect(mayDashboard.selectedRangeAnalytics.totals.grossRevenue).toBe(20_000);
    expect(juneDashboard.selectedRangeAnalytics.totals.grossRevenue).toBe(0);
    expect(juneDashboard.accountingSummary.wallets).toEqual(mayDashboard.accountingSummary.wallets);
  });

  it('uses a 20 percent service fallback when the finance setting is missing or invalid', async () => {
    const testRepository = repository(
      [
        order({
          id: 'paid-order',
          total: 20_000,
          costTotalCents: 12_000_00,
          isPaid: true,
        }),
      ],
      {
        getSetting: async () => ({
          key: 'finance_dashboard_service_percent',
          value: '120',
        }),
      },
    );

    const result = await getDailyDashboard(
      { date: '2026-05-06' },
      testRepository,
      () => new Date('2026-05-06T12:00:00.000Z'),
    );

    expect(result.accountingSummary.servicePercent).toBe(20);
    expect(result.accountingSummary.wallets.map(({ id, amount }) => ({ id, amount }))).toEqual([
      { id: 'base-cost', amount: 12_000 },
      { id: 'services', amount: 1_600 },
      { id: 'profit', amount: 6_400 },
    ]);
  });
});
