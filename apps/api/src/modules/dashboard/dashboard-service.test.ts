import { describe, expect, it } from 'vitest';

import type { DashboardOrder, DashboardOrderItem, DashboardRepository } from './dashboard-service';
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

describe('dashboard service', () => {
  it('summarizes selected day and full business metrics', async () => {
    const repository: DashboardRepository = {
      listOrders: async () => [
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
      ],
    };

    const result = await getDailyDashboard(
      { date: '2026-05-06' },
      repository,
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
    const repository: DashboardRepository = {
      listOrders: async () => [],
    };

    const result = await getDailyDashboard(
      {},
      repository,
      () => new Date('2026-05-06T12:00:00.000Z'),
    );

    expect(result.date).toBe('2026-05-06');
  });

  it('uses the saved finance cost snapshot before falling back to menu item costs', async () => {
    const repository: DashboardRepository = {
      listOrders: async () => [
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
      ],
    };

    const result = await getDailyDashboard(
      { date: '2026-05-06' },
      repository,
      () => new Date('2026-05-06T12:00:00.000Z'),
    );

    expect(result.totals.estimatedCosts).toBe(14000);
    expect(result.totals.estimatedProfit).toBe(22000);
  });

  it('uses the Argentina business date when UTC is already tomorrow', async () => {
    const repository: DashboardRepository = {
      listOrders: async () => [
        order({
          id: 'order-today-argentina',
          deliveryDate: '2026-05-30',
          status: 'confirmado',
          isPaid: false,
        }),
      ],
    };

    const result = await getDailyDashboard(
      {},
      repository,
      () => new Date('2026-05-31T00:00:00.000Z'),
    );

    expect(result.date).toBe('2026-05-30');
    expect(result.upcomingOrders).toHaveLength(1);
  });

  it('builds preset range analytics anchored to the selected date', async () => {
    const repository: DashboardRepository = {
      listOrders: async () => [
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
      ],
    };

    const result = await getDailyDashboard(
      { date: '2026-05-06' },
      repository,
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
    const repository: DashboardRepository = {
      listOrders: async () => [
        order({ id: 'inside-start', deliveryDate: '2026-05-01', total: 15000 }),
        order({ id: 'inside-end', deliveryDate: '2026-05-15', total: 9000 }),
        order({ id: 'outside', deliveryDate: '2026-05-16', total: 6000 }),
      ],
    };

    const result = await getDailyDashboard(
      {
        date: '2026-05-30',
        analyticsMode: 'custom',
        startDate: '2026-05-01',
        endDate: '2026-05-15',
      },
      repository,
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
    const repository: DashboardRepository = {
      listOrders: async () => [
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
      ],
    };

    const result = await getDailyDashboard(
      {
        date: '2026-05-30',
        analyticsMode: 'weekComparison',
        currentWeekStart: '2026-05-04',
        comparisonWeekStart: '2026-04-07',
      },
      repository,
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
});
