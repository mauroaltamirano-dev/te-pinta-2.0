import { asc, eq } from 'drizzle-orm';

import type { createDbClient } from '../../db/index';
import { customers, menuItems, orderItems, orders } from '../../db/schema';
import type { DashboardOrder, DashboardRepository } from './dashboard-service';

type DbClient = ReturnType<typeof createDbClient>['db'];

export const createDashboardRepository = (db: DbClient): DashboardRepository => ({
  async listOrders(): Promise<DashboardOrder[]> {
    const rows = await db
      .select({
        order: orders,
        customer: customers,
        orderItem: orderItems,
        menuItemName: menuItems.name,
        menuItemCostPerDozen: menuItems.costPerDozen,
        menuItemPriceDozen: menuItems.priceDozen,
      })
      .from(orders)
      .innerJoin(customers, eq(orders.customerId, customers.id))
      .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
      .innerJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
      .orderBy(asc(orders.deliveryDate), asc(orders.id), asc(orderItems.id));

    const byOrder = new Map<string, DashboardOrder>();

    for (const row of rows) {
      const current = byOrder.get(row.order.id) ?? {
        id: row.order.id,
        customerId: row.customer.id,
        customerName: row.customer.name,
        deliveryDate: row.order.deliveryDate,
        deliveryTime: row.order.deliveryTime,
        status: row.order.status,
        isPaid: row.order.isPaid,
        subtotal: Number(row.order.subtotal),
        total: Number(row.order.total),
        items: [],
      };

      current.items.push({
        menuItemId: row.orderItem.menuItemId,
        menuItemName: row.menuItemName,
        quantity: row.orderItem.quantity,
        costPerDozen: Number(row.menuItemCostPerDozen),
        priceDozen: Number(row.menuItemPriceDozen),
      });
      byOrder.set(row.order.id, current);
    }

    return [...byOrder.values()];
  },
});
