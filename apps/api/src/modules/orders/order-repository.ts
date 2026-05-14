import { and, asc, desc, eq, ilike, inArray, or, type SQL } from 'drizzle-orm';

import type { OrderFilters, OrderStatus } from '@te-pinta/shared';

import type { createDbClient } from '../../db/index';
import { customers, menuItems, orderAddons, orderItems, orders, settings } from '../../db/schema';
import type {
  OrderAddonDetail,
  CustomerSnapshot,
  MenuItemPricing,
  OrderDetail,
  OrderItemDetail,
  OrderListItem,
  OrderRepository,
  PersistOrderInput,
} from './order-service';

type DbClient = ReturnType<typeof createDbClient>['db'];
type OrderRow = typeof orders.$inferSelect;
type CustomerRow = typeof customers.$inferSelect;
type OrderItemRow = typeof orderItems.$inferSelect;
type OrderAddonRow = typeof orderAddons.$inferSelect;
type MenuItemRow = typeof menuItems.$inferSelect;

const requireReturnedRow = <T>(row: T | undefined): T => {
  if (!row) {
    throw new Error('Database write did not return a row');
  }

  return row;
};

const moneyToDb = (value: number): string => value.toFixed(2);
const moneyFromDb = (value: string): number => Number(value);

const mapCustomer = (row: CustomerRow): CustomerSnapshot => ({
  id: row.id,
  name: row.name,
  phone: row.phone,
  address: row.address,
});

const mapMenuItemPricing = (row: MenuItemRow): MenuItemPricing => ({
  id: row.id,
  name: row.name,
  priceUnit: moneyFromDb(row.priceUnit),
  priceHalfDozen: moneyFromDb(row.priceHalfDozen),
  priceDozen: moneyFromDb(row.priceDozen),
  isActive: row.isActive,
});

const mapOrderItem = (row: OrderItemRow, menuItemName: string): OrderItemDetail => ({
  id: row.id,
  menuItemId: row.menuItemId,
  menuItemName,
  quantity: row.quantity,
  unitPrice: moneyFromDb(row.unitPrice),
  subtotal: moneyFromDb(row.subtotal),
});

const mapOrderAddon = (row: OrderAddonRow): OrderAddonDetail => ({
  id: row.id,
  addonId: row.addonId,
  name: row.name,
  quantity: row.quantity,
  unitPrice: moneyFromDb(row.unitPrice),
  subtotal: moneyFromDb(row.subtotal),
});

const mapOrderDetail = (
  order: OrderRow,
  customer: CustomerRow,
  items: OrderItemDetail[],
  addons: OrderAddonDetail[],
): OrderDetail => ({
  id: order.id,
  customer: mapCustomer(customer),
  deliveryDate: order.deliveryDate,
  deliveryTime: order.deliveryTime,
  deliveryType: order.deliveryType,
  cooked: order.cooked,
  notes: order.notes,
  discountPercent: moneyFromDb(order.discountPercent),
  deliveryFee: moneyFromDb(order.deliveryFee),
  subtotal: moneyFromDb(order.subtotal),
  total: moneyFromDb(order.total),
  status: order.status,
  isPaid: order.isPaid,
  items,
  addons,
});

const toOrderValues = (input: PersistOrderInput): typeof orders.$inferInsert => ({
  id: input.id,
  customerId: input.customerId,
  deliveryDate: input.deliveryDate,
  deliveryTime: input.deliveryTime,
  deliveryType: input.deliveryType,
  cooked: input.cooked,
  notes: input.notes,
  discountPercent: moneyToDb(input.discountPercent),
  deliveryFee: moneyToDb(input.deliveryFee),
  subtotal: moneyToDb(input.subtotal),
  total: moneyToDb(input.total),
  status: input.status,
  isPaid: input.isPaid,
  updatedAt: new Date(),
});

const toOrderItemValues = (input: PersistOrderInput): (typeof orderItems.$inferInsert)[] =>
  input.items.map((item) => ({
    id: item.id,
    orderId: input.id,
    menuItemId: item.menuItemId,
    quantity: item.quantity,
    unitPrice: moneyToDb(item.unitPrice),
    subtotal: moneyToDb(item.subtotal),
  }));

const toOrderAddonValues = (input: PersistOrderInput): (typeof orderAddons.$inferInsert)[] =>
  input.addons.map((addon) => ({
    id: addon.id,
    orderId: input.id,
    addonId: addon.addonId,
    name: addon.name,
    quantity: addon.quantity,
    unitPrice: moneyToDb(addon.unitPrice),
    subtotal: moneyToDb(addon.subtotal),
  }));

const buildFilterConditions = (filters: OrderFilters = {}): SQL[] => {
  const conditions: SQL[] = [];

  if (filters.fecha) {
    conditions.push(eq(orders.deliveryDate, filters.fecha));
  }
  if (filters.estado) {
    conditions.push(eq(orders.status, filters.estado));
  }
  if (filters.franja) {
    conditions.push(eq(orders.deliveryTime, filters.franja));
  }
  if (filters.cliente) {
    const term = `%${filters.cliente}%`;
    const customerCondition = or(ilike(customers.name, term), ilike(customers.phone, term));
    if (customerCondition) {
      conditions.push(customerCondition);
    }
  }

  return conditions;
};

const getOrderItems = async (db: DbClient, orderId: string): Promise<OrderItemDetail[]> => {
  const rows = await db
    .select({ orderItem: orderItems, menuItemName: menuItems.name })
    .from(orderItems)
    .innerJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
    .where(eq(orderItems.orderId, orderId))
    .orderBy(asc(orderItems.id));

  return rows.map((row) => mapOrderItem(row.orderItem, row.menuItemName));
};

const getOrderAddons = async (db: DbClient, orderId: string): Promise<OrderAddonDetail[]> => {
  const rows = await db
    .select()
    .from(orderAddons)
    .where(eq(orderAddons.orderId, orderId))
    .orderBy(asc(orderAddons.id));

  return rows.map(mapOrderAddon);
};

const getOrderDetail = async (db: DbClient, id: string): Promise<OrderDetail | null> => {
  const [row] = await db
    .select({ order: orders, customer: customers })
    .from(orders)
    .innerJoin(customers, eq(orders.customerId, customers.id))
    .where(eq(orders.id, id))
    .limit(1);

  if (!row) {
    return null;
  }

  const items = await getOrderItems(db, id);
  const addons = await getOrderAddons(db, id);
  return mapOrderDetail(row.order, row.customer, items, addons);
};

export const createOrderRepository = (db: DbClient): OrderRepository => ({
  async list(filters): Promise<OrderListItem[]> {
    const conditions = buildFilterConditions(filters);
    const rows = conditions.length
      ? await db
          .select({ order: orders, customer: customers })
          .from(orders)
          .innerJoin(customers, eq(orders.customerId, customers.id))
          .where(and(...conditions))
          .orderBy(desc(orders.deliveryDate), desc(orders.createdAt))
      : await db
          .select({ order: orders, customer: customers })
          .from(orders)
          .innerJoin(customers, eq(orders.customerId, customers.id))
          .orderBy(desc(orders.deliveryDate), desc(orders.createdAt));

    return Promise.all(
      rows.map(async (row) => {
        const items = await getOrderItems(db, row.order.id);
        const addons = await getOrderAddons(db, row.order.id);
        const detail = mapOrderDetail(row.order, row.customer, items, addons);
        const { items: _items, addons: _addons, ...listItem } = detail;
        void _items;
        void _addons;
        return {
          ...listItem,
          itemCount: items.length,
          totalQuantity: items.reduce((total, item) => total + item.quantity, 0),
        };
      }),
    );
  },

  getById(id): Promise<OrderDetail | null> {
    return getOrderDetail(db, id);
  },

  async findCustomerById(id): Promise<CustomerSnapshot | null> {
    const [row] = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
    return row ? mapCustomer(row) : null;
  },

  async findCustomerByPhone(phone): Promise<CustomerSnapshot | null> {
    const [row] = await db.select().from(customers).where(eq(customers.phone, phone)).limit(1);
    return row ? mapCustomer(row) : null;
  },

  async createCustomer(customer): Promise<CustomerSnapshot> {
    const [row] = await db.insert(customers).values(customer).returning();
    return mapCustomer(requireReturnedRow(row));
  },

  async getMenuItemsByIds(ids): Promise<MenuItemPricing[]> {
    if (ids.length === 0) {
      return [];
    }

    const rows = await db.select().from(menuItems).where(inArray(menuItems.id, ids));
    return rows.map(mapMenuItemPricing);
  },

  async getSetting(key): Promise<string | null> {
    const [row] = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
    return row?.value ?? null;
  },

  async createOrderWithItems(input): Promise<OrderDetail> {
    await db.transaction(async (tx) => {
      await tx.insert(orders).values(toOrderValues(input));
      const itemValues = toOrderItemValues(input);
      if (itemValues.length > 0) {
        await tx.insert(orderItems).values(itemValues);
      }
      const addonValues = toOrderAddonValues(input);
      if (addonValues.length > 0) {
        await tx.insert(orderAddons).values(addonValues);
      }
    });

    const detail = await getOrderDetail(db, input.id);
    if (!detail) {
      throw new Error('Database write did not return an order detail');
    }

    return detail;
  },

  async replaceOrder(id, input): Promise<OrderDetail | null> {
    let updated = false;

    await db.transaction(async (tx) => {
      const [row] = await tx
        .update(orders)
        .set(toOrderValues({ ...input, id }))
        .where(eq(orders.id, id))
        .returning({ id: orders.id });

      updated = Boolean(row);
      if (!updated) {
        return;
      }

      await tx.delete(orderItems).where(eq(orderItems.orderId, id));
      await tx.delete(orderAddons).where(eq(orderAddons.orderId, id));
      const itemValues = toOrderItemValues({ ...input, id });
      if (itemValues.length > 0) {
        await tx.insert(orderItems).values(itemValues);
      }
      const addonValues = toOrderAddonValues({ ...input, id });
      if (addonValues.length > 0) {
        await tx.insert(orderAddons).values(addonValues);
      }
    });

    return updated ? getOrderDetail(db, id) : null;
  },

  async updateStatus(id: string, status: OrderStatus): Promise<OrderDetail | null> {
    const [row] = await db
      .update(orders)
      .set({ status, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning({ id: orders.id });

    return row ? getOrderDetail(db, id) : null;
  },

  async updatePayment(id: string, isPaid: boolean): Promise<OrderDetail | null> {
    const [row] = await db
      .update(orders)
      .set({ isPaid, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning({ id: orders.id });

    return row ? getOrderDetail(db, id) : null;
  },

  async delete(id): Promise<boolean> {
    let deleted = false;

    await db.transaction(async (tx) => {
      await tx.delete(orderItems).where(eq(orderItems.orderId, id));
      await tx.delete(orderAddons).where(eq(orderAddons.orderId, id));
      const [row] = await tx.delete(orders).where(eq(orders.id, id)).returning({ id: orders.id });
      deleted = Boolean(row);
    });

    return deleted;
  },
});
