import { asc, desc, eq } from 'drizzle-orm';

import type { createDbClient } from '../../db/index';
import {
  customers,
  financePurchaseItems,
  financePurchases,
  financeWalletAdjustments,
  menuItems,
  orderItems,
  orders,
  settings,
} from '../../db/schema';
import type {
  DashboardOrder,
  DashboardPurchase,
  DashboardRepository,
  DashboardSetting,
} from './dashboard-service';

type DbClient = ReturnType<typeof createDbClient>['db'];

export const createDashboardRepository = (db: DbClient): DashboardRepository => ({
  async listOrders(): Promise<DashboardOrder[]> {
    const rows = await db
      .select({
        order: orders,
        customer: customers,
        orderItem: orderItems,
        orderCostTotalCents: orders.costTotalCents,
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
        customerCreatedAt: row.customer.createdAt,
        deliveryDate: row.order.deliveryDate,
        deliveryTime: row.order.deliveryTime,
        status: row.order.status,
        isPaid: row.order.isPaid,
        createdAt: row.order.createdAt,
        subtotal: Number(row.order.subtotal),
        total: Number(row.order.total),
        costTotalCents: row.orderCostTotalCents,
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

  async listPurchases(): Promise<DashboardPurchase[]> {
    const rows = await db
      .select({
        purchase: financePurchases,
        purchaseItem: financePurchaseItems,
      })
      .from(financePurchases)
      .innerJoin(financePurchaseItems, eq(financePurchaseItems.purchaseId, financePurchases.id))
      .orderBy(
        asc(financePurchases.purchaseDate),
        asc(financePurchases.id),
        asc(financePurchaseItems.id),
      );

    const byPurchase = new Map<string, DashboardPurchase>();

    for (const row of rows) {
      const current = byPurchase.get(row.purchase.id) ?? {
        id: row.purchase.id,
        purchaseDate: row.purchase.purchaseDate,
        fundingSource: row.purchase.fundingSource,
        canceledAt: row.purchase.canceledAt,
        items: [],
      };

      current.items.push({
        totalPriceCents: row.purchaseItem.totalPriceCents,
      });
      byPurchase.set(row.purchase.id, current);
    }

    return [...byPurchase.values()];
  },

  async listWalletAdjustments() {
    return db
      .select({
        id: financeWalletAdjustments.id,
        wallet: financeWalletAdjustments.wallet,
        direction: financeWalletAdjustments.direction,
        amountCents: financeWalletAdjustments.amountCents,
        reason: financeWalletAdjustments.reason,
        actorId: financeWalletAdjustments.actorId,
        actorName: financeWalletAdjustments.actorName,
        occurredAt: financeWalletAdjustments.occurredAt,
        createdAt: financeWalletAdjustments.createdAt,
      })
      .from(financeWalletAdjustments)
      .orderBy(desc(financeWalletAdjustments.occurredAt), desc(financeWalletAdjustments.id));
  },

  async getSetting(key: string): Promise<DashboardSetting | null> {
    const [row] = await db
      .select({
        key: settings.key,
        value: settings.value,
      })
      .from(settings)
      .where(eq(settings.key, key))
      .limit(1);

    return row ?? null;
  },
});
