import { describe, expect, it } from 'vitest';

import type { DashboardOrder, DashboardRepository } from './dashboard-service';
import { getDailyDashboard } from './dashboard-service';

const order = (overrides: Partial<DashboardOrder> = {}): DashboardOrder => ({
  id: 'order-1',
  deliveryDate: '2026-05-06',
  deliveryTime: 'noche',
  total: 15000,
  items: [
    {
      menuItemId: 'menu-1',
      menuItemName: 'Carne suave',
      quantity: 12,
    },
  ],
  ...overrides,
});

describe('dashboard service', () => {
  it('summarizes count, revenue, delivery shifts, and top varieties for a day', async () => {
    const repository: DashboardRepository = {
      listOrdersByDate: async () => [
        order(),
        order({
          id: 'order-2',
          deliveryTime: 'mediodia',
          total: 9000,
          items: [
            { menuItemId: 'menu-2', menuItemName: 'Jamón y queso', quantity: 6 },
            { menuItemId: 'menu-1', menuItemName: 'Carne suave', quantity: 3 },
          ],
        }),
        order({
          id: 'order-3',
          deliveryTime: 'noche',
          total: 4500,
          items: [{ menuItemId: 'menu-2', menuItemName: 'Jamón y queso', quantity: 2 }],
        }),
      ],
    };

    const result = await getDailyDashboard({ date: '2026-05-06' }, repository);

    expect(result).toEqual({
      date: '2026-05-06',
      orderCount: 3,
      totalRevenue: 28500,
      deliveryShifts: {
        mediodia: 1,
        tarde: 0,
        noche: 2,
      },
      topVarieties: [
        { menuItemId: 'menu-1', name: 'Carne suave', quantity: 15 },
        { menuItemId: 'menu-2', name: 'Jamón y queso', quantity: 8 },
      ],
    });
  });

  it('uses today when no date is provided', async () => {
    let requestedDate = '';
    const repository: DashboardRepository = {
      listOrdersByDate: async (date) => {
        requestedDate = date;
        return [];
      },
    };

    await getDailyDashboard({}, repository, () => new Date('2026-05-06T12:00:00.000Z'));

    expect(requestedDate).toBe('2026-05-06');
  });
});
