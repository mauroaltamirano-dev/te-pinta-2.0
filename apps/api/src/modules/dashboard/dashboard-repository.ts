import { asc, eq } from 'drizzle-orm';

import type { createDbClient } from '../../db/index';
import { menuItems, orderItems, orders } from '../../db/schema';
import type { DashboardOrder, DashboardRepository } from './dashboard-service';

type DbClient = ReturnType<typeof createDbClient>['db'];

export const createDashboardRepository = (db: DbClient): DashboardRepository => ({
  async listOrdersByDate(date): Promise<DashboardOrder[]> {
    const rows = await db
      .select({
        order: orders,
        orderItem: orderItems,
        menuItemName: menuItems.name,
      })
      .from(orders)
      .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
      .innerJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
      .where(eq(orders.deliveryDate, date))
      .orderBy(asc(orders.id), asc(orderItems.id));

    const byOrder = new Map<string, DashboardOrder>();

    for (const row of rows) {
      const current = byOrder.get(row.order.id) ?? {
        id: row.order.id,
        deliveryDate: row.order.deliveryDate,
        deliveryTime: row.order.deliveryTime,
        total: Number(row.order.total),
        items: [],
      };

      current.items.push({
        menuItemId: row.orderItem.menuItemId,
        menuItemName: row.menuItemName,
        quantity: row.orderItem.quantity,
      });
      byOrder.set(row.order.id, current);
    }

    return [...byOrder.values()];
  },
});
