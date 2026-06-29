import { describe, expect, it } from 'vitest';

import type {
  DashboardOrder,
  DashboardOrderItem,
  DashboardPurchase,
  DashboardRepository,
} from './dashboard-service';
import { getDailyDashboard } from './dashboard-service';
import {
  buildWalletMovements,
  calculateWalletBalances,
  toWalletAdjustmentRecord,
} from '../finance/wallet-ledger-service';

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
  customerCreatedAt: new Date('2026-04-01T10:00:00.000Z'),
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
  purchaseDate: '2026-05-06',
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
  listWalletAdjustments: async () => [],
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

  it('includes payment state in upcoming orders for dashboard fallback rendering', async () => {
    const testRepository = repository([
      order({
        id: 'paid-active-order',
        deliveryDate: '2026-05-30',
        status: 'confirmado',
        isPaid: true,
      }),
    ]);

    const result = await getDailyDashboard(
      { date: '2026-05-30' },
      testRepository,
      () => new Date('2026-05-30T12:00:00.000Z'),
    );

    expect(result.upcomingOrders).toEqual([
      expect.objectContaining({ id: 'paid-active-order', isPaid: true }),
    ]);
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

  it('classifies distinct customers by when they were added to the database', async () => {
    const testRepository = repository([
      order({
        id: 'existing-customer-order',
        customerId: 'existing-customer',
        customerName: 'Existing customer',
        customerCreatedAt: new Date('2026-06-01T12:00:00.000Z'),
        deliveryDate: '2026-06-22',
      }),
      order({
        id: 'single-order-existing-customer',
        customerId: 'single-order-existing',
        customerName: 'Single order existing customer',
        customerCreatedAt: new Date('2026-06-21T12:00:00.000Z'),
        deliveryDate: '2026-06-28',
      }),
      order({
        id: 'new-customer-first-order',
        customerId: 'new-customer',
        customerName: 'New customer',
        customerCreatedAt: new Date('2026-06-24T12:00:00.000Z'),
        deliveryDate: '2026-06-24',
      }),
      order({
        id: 'new-customer-second-order',
        customerId: 'new-customer',
        customerName: 'New customer',
        customerCreatedAt: new Date('2026-06-24T12:00:00.000Z'),
        deliveryDate: '2026-06-27',
      }),
    ]);

    const result = await getDailyDashboard(
      {
        date: '2026-06-28',
        analyticsMode: 'custom',
        startDate: '2026-06-22',
        endDate: '2026-06-28',
      },
      testRepository,
      () => new Date('2026-06-28T12:00:00.000Z'),
    );

    expect(result.selectedRangeAnalytics.customerStats).toEqual({
      newCustomers: 1,
      recurringCustomers: 2,
    });
    expect(result.selectedRangeAnalytics.chartDays.map((day) => day.date)).toEqual([
      '2026-06-22',
      '2026-06-23',
      '2026-06-24',
      '2026-06-25',
      '2026-06-26',
      '2026-06-27',
      '2026-06-28',
    ]);
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

  it('reconciles accounting wallet totals to all-time ledger movement sums across period changes', async () => {
    const adjustment = toWalletAdjustmentRecord({
      id: 'adjustment-profit-correction',
      wallet: 'profit',
      direction: 'credit',
      amountCents: 1_000_00,
      reason: 'Cash correction',
      actorId: 'admin',
      actorName: 'Admin Te Pinta',
      occurredAt: new Date('2026-06-10T12:00:00.000Z'),
    });
    const sale = {
      id: 'paid-may-order',
      isPaid: true,
      occurredAt: '2026-05-06',
      totalCents: 20_000_00,
      directCostCents: 12_000_00,
    };
    const purchases = [
      {
        id: 'active-flour',
        occurredAt: '2026-06-01',
        fundingSource: 'production_cost' as const,
        totalPriceCents: 3_000_00,
        canceledAt: null,
      },
    ];
    const testRepository = repository(
      [
        order({
          id: sale.id,
          deliveryDate: sale.occurredAt,
          total: sale.totalCents / 100,
          costTotalCents: sale.directCostCents,
          isPaid: sale.isPaid,
        }),
      ],
      {
        getSetting: async (key) =>
          key === 'finance_dashboard_service_percent' ? { key, value: '25' } : null,
        listPurchases: async () =>
          purchases.map((item) =>
            purchase({
              id: item.id,
              purchaseDate: item.occurredAt,
              fundingSource: item.fundingSource,
              items: [{ totalPriceCents: item.totalPriceCents }],
            }),
          ),
        listWalletAdjustments: async () => [adjustment],
      },
    );
    const expectedBalances = calculateWalletBalances(
      buildWalletMovements({
        sales: [sale],
        purchases,
        adjustments: [adjustment],
        servicePercent: 25,
      }),
    );

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
    const walletAmounts = ({ accountingSummary }: typeof mayDashboard) => ({
      production_cost: accountingSummary.wallets[0]?.amount,
      services: accountingSummary.wallets[1]?.amount,
      profit: accountingSummary.wallets[2]?.amount,
    });

    expect(mayDashboard.selectedRangeAnalytics.totals.grossRevenue).toBe(20_000);
    expect(juneDashboard.selectedRangeAnalytics.totals.grossRevenue).toBe(0);
    expect(walletAmounts(mayDashboard)).toEqual({
      production_cost: expectedBalances.production_cost / 100,
      services: expectedBalances.services / 100,
      profit: expectedBalances.profit / 100,
    });
    expect(walletAmounts(juneDashboard)).toEqual(walletAmounts(mayDashboard));
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

  it('builds KPI comparisons from the previous equivalent period', async () => {
    const testRepository = repository([
      order({
        id: 'current-large',
        deliveryDate: '2026-06-04',
        total: 30_000,
        costTotalCents: 18_000_00,
        isPaid: true,
        items: [item({ quantity: 24 })],
      }),
      order({
        id: 'current-pending',
        deliveryDate: '2026-06-05',
        total: 10_000,
        costTotalCents: 4_000_00,
        isPaid: false,
        items: [item({ quantity: 12 })],
      }),
      order({
        id: 'previous-paid',
        deliveryDate: '2026-05-29',
        total: 20_000,
        costTotalCents: 12_000_00,
        isPaid: true,
        items: [item({ quantity: 12 })],
      }),
    ]);

    const result = await getDailyDashboard(
      {
        date: '2026-06-07',
        analyticsMode: 'custom',
        startDate: '2026-06-01',
        endDate: '2026-06-07',
      },
      testRepository,
      () => new Date('2026-06-07T12:00:00.000Z'),
    );

    expect(result.kpiComparisons.sales).toMatchObject({
      value: '+100%',
      label: 'vs período anterior (25/05/2026 – 31/05/2026)',
      direction: 'positive',
      currentValue: 40_000,
      previousValue: 20_000,
      difference: 20_000,
      changePercent: 100,
    });
    expect(result.kpiComparisons.profit).toMatchObject({
      value: '+125%',
      direction: 'positive',
      currentValue: 18_000,
      previousValue: 8_000,
      difference: 10_000,
      changePercent: 125,
    });
    expect(result.kpiComparisons.orders).toMatchObject({
      value: '+1',
      direction: 'positive',
      currentValue: 2,
      previousValue: 1,
      difference: 1,
      changePercent: 100,
    });
    expect(result.kpiComparisons.dozens).toMatchObject({
      value: '+2',
      direction: 'positive',
      currentValue: 3,
      previousValue: 1,
      difference: 2,
      changePercent: 200,
    });
    expect(result.kpiComparisons.averageTicket).toMatchObject({
      value: '$0',
      direction: 'neutral',
      currentValue: 20_000,
      previousValue: 20_000,
      difference: 0,
      changePercent: 0,
    });
    expect(result.kpiComparisons.pendingRevenue).toMatchObject({
      value: '+$10.000',
      direction: 'negative',
      currentValue: 10_000,
      previousValue: 0,
      difference: 10_000,
      changePercent: null,
    });
  });

  it('uses neutral KPI comparisons for the all-time dashboard range', async () => {
    const testRepository = repository([order({ id: 'paid-order', total: 20_000 })]);

    const result = await getDailyDashboard(
      { date: '2026-06-07', analyticsMode: 'preset', preset: 'all' },
      testRepository,
      () => new Date('2026-06-07T12:00:00.000Z'),
    );

    expect(result.kpiComparisons.sales).toMatchObject({
      value: '—',
      label: 'Sin comparación equivalente para Siempre',
      direction: 'neutral',
      currentValue: 20_000,
      previousValue: null,
      difference: null,
      changePercent: null,
    });
  });
});
