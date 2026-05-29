import { and, asc, count, desc, eq, ilike, inArray, not, or, type SQL } from 'drizzle-orm';

import type { OrderFilters, OrderStatus } from '@te-pinta/shared';

import type { createDbClient } from '../../db/index';
import { customers, menuItems, orderAddons, orderItems, orders, settings } from '../../db/schema';
import { createFinanceRepository } from '../finance/finance-repository';
import { previewFinanceOrderCost } from '../finance/finance-service';
import type {
  OrderAddonDetail,
  CustomerSnapshot,
  OrderCostSnapshotFields,
  OrderCostSnapshotInput,
  MenuItemPricing,
  OrderDetail,
  OrderItemDetail,
  OrderListItem,
  OrderListPagination,
  OrderListStats,
  OrderRepository,
  PendingVarietyTotal,
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
const nullableMoneyFromDb = (value: string | null): number | null =>
  value === null ? null : moneyFromDb(value);

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
  isArchived: row.isArchived,
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
  cookingFee: moneyFromDb(order.cookingFee),
  subtotal: moneyFromDb(order.subtotal),
  total: moneyFromDb(order.total),
  costTotalCents: order.costTotalCents,
  grossProfitCents: order.grossProfitCents,
  profitMarginPercent: nullableMoneyFromDb(order.profitMarginPercent),
  costSnapshotJson: order.costSnapshotJson,
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
  cookingFee: moneyToDb(input.cookingFee),
  subtotal: moneyToDb(input.subtotal),
  total: moneyToDb(input.total),
  costTotalCents: input.costTotalCents,
  grossProfitCents: input.grossProfitCents,
  profitMarginPercent:
    input.profitMarginPercent === null ? null : moneyToDb(input.profitMarginPercent),
  costSnapshotJson: input.costSnapshotJson,
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

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 25;

const resolvePagination = (
  filters: OrderFilters = {},
): Pick<OrderListPagination, 'page' | 'pageSize'> => ({
  page: filters.page ?? DEFAULT_PAGE,
  pageSize: filters.pageSize ?? DEFAULT_PAGE_SIZE,
});

const buildFilterConditions = (
  filters: OrderFilters = {},
  options: { includeVisibility?: boolean } = {},
): SQL[] => {
  const conditions: SQL[] = [];
  const includeVisibility = options.includeVisibility ?? true;

  if (filters.fecha) {
    conditions.push(eq(orders.deliveryDate, filters.fecha));
  }
  if (filters.estado) {
    conditions.push(eq(orders.status, filters.estado));
  }
  if (filters.franja) {
    conditions.push(eq(orders.deliveryTime, filters.franja));
  }
  if (filters.deliveryType) {
    conditions.push(eq(orders.deliveryType, filters.deliveryType));
  }
  if (typeof filters.cooked === 'boolean') {
    conditions.push(eq(orders.cooked, filters.cooked));
  }
  if (typeof filters.isPaid === 'boolean') {
    conditions.push(eq(orders.isPaid, filters.isPaid));
  }
  if (filters.cliente) {
    const term = `%${filters.cliente}%`;
    const customerCondition = or(
      ilike(orders.id, term),
      ilike(customers.id, term),
      ilike(customers.name, term),
      ilike(customers.phone, term),
      ilike(customers.address, term),
    );
    if (customerCondition) {
      conditions.push(customerCondition);
    }
  }
  if (includeVisibility && filters.visibility === 'finalized') {
    conditions.push(and(eq(orders.status, 'entregado'), eq(orders.isPaid, true))!);
  }
  if (includeVisibility && filters.visibility === 'active') {
    conditions.push(not(and(eq(orders.status, 'entregado'), eq(orders.isPaid, true))!));
  }

  return conditions;
};

const countOrders = async (db: DbClient, conditions: SQL[]): Promise<number> => {
  const [row] = conditions.length
    ? await db
        .select({ value: count() })
        .from(orders)
        .innerJoin(customers, eq(orders.customerId, customers.id))
        .where(and(...conditions))
    : await db
        .select({ value: count() })
        .from(orders)
        .innerJoin(customers, eq(orders.customerId, customers.id));

  return row?.value ?? 0;
};

const getOrderByExpression = (filters: OrderFilters = {}) => {
  const sortBy = filters.sortBy ?? 'deliveryDate';
  const sortDir = filters.sortDir ?? 'desc';
  const column =
    sortBy === 'customerName'
      ? customers.name
      : sortBy === 'total'
        ? orders.total
        : sortBy === 'status'
          ? orders.status
          : sortBy === 'deliveryType'
            ? orders.deliveryType
            : sortBy === 'createdAt'
              ? orders.createdAt
              : orders.deliveryDate;

  return sortDir === 'asc' ? asc(column) : desc(column);
};

const groupOrderItems = (
  rows: { orderItem: OrderItemRow; menuItemName: string }[],
): Map<string, OrderItemDetail[]> => {
  const grouped = new Map<string, OrderItemDetail[]>();

  for (const row of rows) {
    const items = grouped.get(row.orderItem.orderId) ?? [];
    items.push(mapOrderItem(row.orderItem, row.menuItemName));
    grouped.set(row.orderItem.orderId, items);
  }

  return grouped;
};

const groupOrderAddons = (rows: OrderAddonRow[]): Map<string, OrderAddonDetail[]> => {
  const grouped = new Map<string, OrderAddonDetail[]>();

  for (const row of rows) {
    const addons = grouped.get(row.orderId) ?? [];
    addons.push(mapOrderAddon(row));
    grouped.set(row.orderId, addons);
  }

  return grouped;
};

const getOrderItemsByOrderIds = async (
  db: DbClient,
  orderIds: string[],
): Promise<Map<string, OrderItemDetail[]>> => {
  if (orderIds.length === 0) {
    return new Map();
  }

  const rows = await db
    .select({ orderItem: orderItems, menuItemName: menuItems.name })
    .from(orderItems)
    .innerJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
    .where(inArray(orderItems.orderId, orderIds))
    .orderBy(asc(orderItems.orderId), asc(orderItems.id));

  return groupOrderItems(rows);
};

const getOrderAddonsByOrderIds = async (
  db: DbClient,
  orderIds: string[],
): Promise<Map<string, OrderAddonDetail[]>> => {
  if (orderIds.length === 0) {
    return new Map();
  }

  const rows = await db
    .select()
    .from(orderAddons)
    .where(inArray(orderAddons.orderId, orderIds))
    .orderBy(asc(orderAddons.orderId), asc(orderAddons.id));

  return groupOrderAddons(rows);
};

const buildPagination = (filters: OrderFilters, total: number): OrderListPagination => {
  const { page, pageSize } = resolvePagination(filters);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    page,
    pageSize,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
};

const getPendingVarietyStats = async (
  db: DbClient,
  filters: OrderFilters = {},
): Promise<PendingVarietyTotal[]> => {
  const {
    estado: _estado,
    visibility: _visibility,
    page: _page,
    pageSize: _pageSize,
    ...rest
  } = filters;
  void _estado;
  void _visibility;
  void _page;
  void _pageSize;
  const baseConditions = buildFilterConditions(rest, { includeVisibility: false });
  const conditions = [...baseConditions, eq(orders.status, 'confirmado')];

  const rows = await db
    .select({
      menuItemId: orderItems.menuItemId,
      menuItemName: menuItems.name,
      quantity: orderItems.quantity,
    })
    .from(orders)
    .innerJoin(customers, eq(orders.customerId, customers.id))
    .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
    .innerJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
    .where(and(...conditions));

  const totals = rows.reduce<Map<string, PendingVarietyTotal>>((acc, row) => {
    const current = acc.get(row.menuItemId) ?? {
      menuItemId: row.menuItemId,
      menuItemName: row.menuItemName,
      quantity: 0,
    };
    current.quantity += row.quantity;
    acc.set(row.menuItemId, current);
    return acc;
  }, new Map());

  return [...totals.values()].sort((left, right) =>
    left.menuItemName.localeCompare(right.menuItemName, 'es-AR'),
  );
};

const getListStats = async (db: DbClient, filters: OrderFilters = {}): Promise<OrderListStats> => {
  const baseConditions = buildFilterConditions(filters, { includeVisibility: false });
  const finalizedCondition = and(eq(orders.status, 'entregado'), eq(orders.isPaid, true))!;

  const [active, finalized, pending, pendingVarieties] = await Promise.all([
    countOrders(db, [...baseConditions, not(finalizedCondition)]),
    countOrders(db, [...baseConditions, finalizedCondition]),
    countOrders(db, [...baseConditions, eq(orders.status, 'confirmado')]),
    getPendingVarietyStats(db, filters),
  ]);

  return { active, finalized, pending, pendingVarieties };
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

const buildCostSnapshotFromFinance = async (
  db: DbClient,
  input: OrderCostSnapshotInput,
): Promise<OrderCostSnapshotFields> => {
  const breakdown = await previewFinanceOrderCost(input, createFinanceRepository(db));

  return {
    costTotalCents: breakdown.totalCostCents,
    grossProfitCents: breakdown.profitSummary.grossProfitCents,
    profitMarginPercent: breakdown.profitSummary.profitMarginPercent,
    costSnapshotJson: breakdown,
  };
};

export const createOrderRepository = (db: DbClient): OrderRepository => ({
  async list(filters = {}) {
    const conditions = buildFilterConditions(filters);
    const { page, pageSize } = resolvePagination(filters);
    const offset = (page - 1) * pageSize;
    const orderByExpression = getOrderByExpression(filters);

    const [total, stats] = await Promise.all([
      countOrders(db, conditions),
      getListStats(db, filters),
    ]);
    const rows = conditions.length
      ? await db
          .select({ order: orders, customer: customers })
          .from(orders)
          .innerJoin(customers, eq(orders.customerId, customers.id))
          .where(and(...conditions))
          .orderBy(orderByExpression, desc(orders.createdAt))
          .limit(pageSize)
          .offset(offset)
      : await db
          .select({ order: orders, customer: customers })
          .from(orders)
          .innerJoin(customers, eq(orders.customerId, customers.id))
          .orderBy(orderByExpression, desc(orders.createdAt))
          .limit(pageSize)
          .offset(offset);

    const orderIds = rows.map((row) => row.order.id);
    const [itemsByOrderId, addonsByOrderId] = await Promise.all([
      getOrderItemsByOrderIds(db, orderIds),
      getOrderAddonsByOrderIds(db, orderIds),
    ]);

    const listItems: OrderListItem[] = rows.map((row) => {
      const items = itemsByOrderId.get(row.order.id) ?? [];
      const addons = addonsByOrderId.get(row.order.id) ?? [];
      const detail = mapOrderDetail(row.order, row.customer, items, addons);
      const { addons: _addons, ...listItem } = detail;
      void _addons;
      return {
        ...listItem,
        itemCount: items.length,
        totalQuantity: items.reduce((total, item) => total + item.quantity, 0),
      };
    });

    return {
      orders: listItems,
      pagination: buildPagination(filters, total),
      stats,
    };
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

  calculateCostSnapshot(input): Promise<OrderCostSnapshotFields> {
    return buildCostSnapshotFromFinance(db, input);
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
