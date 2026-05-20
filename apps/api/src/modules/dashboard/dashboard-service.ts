import type { DashboardQuery, DeliveryTime, OrderStatus } from '@te-pinta/shared';

export type DashboardOrderItem = {
  menuItemId: string;
  menuItemName: string;
  quantity: number;
  costPerDozen: number;
  priceDozen: number;
};

export type DashboardOrder = {
  id: string;
  customerId: string;
  customerName: string;
  deliveryDate: string;
  deliveryTime: DeliveryTime;
  status: OrderStatus;
  isPaid: boolean;
  createdAt: Date;
  subtotal: number;
  total: number;
  items: DashboardOrderItem[];
};

export type DashboardTopVariety = {
  menuItemId: string;
  name: string;
  quantity: number;
};

export type DashboardTopClient = {
  customerId: string;
  name: string;
  orderCount: number;
  totalRevenue: number;
};

export type DashboardUpcomingOrder = {
  id: string;
  customerName: string;
  deliveryDate: string;
  deliveryTime: DeliveryTime;
  status: OrderStatus;
  total: number;
};

export type DashboardCalendarDay = {
  date: string;
  count: number;
  revenue: number;
};

export type DashboardStatusSummary = {
  confirmed: number;
  inProduction: number;
  ready: number;
  delivered: number;
  total: number;
};

export type DashboardRecentOrder = {
  id: string;
  customerName: string;
  deliveryDate: string;
  deliveryTime: DeliveryTime;
  status: OrderStatus;
  isPaid: boolean;
  total: number;
};

export type DashboardTotals = {
  orderCount: number;
  activeOrderCount: number;
  finalizedOrderCount: number;
  unpaidOrderCount: number;
  grossRevenue: number;
  paidRevenue: number;
  pendingRevenue: number;
  estimatedCosts: number;
  estimatedProfit: number;
  totalUnits: number;
  averageTicket: number;
};

export type DailyDashboard = {
  date: string;
  orderCount: number;
  totalRevenue: number;
  deliveryShifts: Record<DeliveryTime, number>;
  topVarieties: DashboardTopVariety[];
  topClients: DashboardTopClient[];
  upcomingOrders: DashboardUpcomingOrder[];
  nextSevenDays: DashboardCalendarDay[];
  lastSevenDays: DashboardCalendarDay[];
  statusSummary: DashboardStatusSummary;
  recentOrders: DashboardRecentOrder[];
  totals: DashboardTotals;
  varietySales: {
    all: DashboardTopVariety[];
    last30: DashboardTopVariety[];
    last7: DashboardTopVariety[];
    selectedDate: DashboardTopVariety[];
  };
};

export type DashboardRepository = {
  listOrders(): Promise<DashboardOrder[]>;
};

const roundMoney = (value: number): number => Math.round(value * 100) / 100;

const toIsoDate = (date: Date): string => date.toISOString().slice(0, 10);

const addDays = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const isFinalized = (order: DashboardOrder): boolean =>
  order.status === 'entregado' && order.isPaid;

const sumEstimatedCost = (orders: DashboardOrder[]): number =>
  roundMoney(
    orders.reduce(
      (orderTotal, order) =>
        orderTotal +
        order.items.reduce(
          (itemTotal, item) => itemTotal + (item.quantity / 12) * item.costPerDozen,
          0,
        ),
      0,
    ),
  );

const buildTopVarieties = (orders: DashboardOrder[]): DashboardTopVariety[] => {
  const varieties = new Map<string, DashboardTopVariety>();

  for (const order of orders) {
    for (const item of order.items) {
      const current = varieties.get(item.menuItemId) ?? {
        menuItemId: item.menuItemId,
        name: item.menuItemName,
        quantity: 0,
      };
      current.quantity += item.quantity;
      varieties.set(item.menuItemId, current);
    }
  }

  return [...varieties.values()].sort((a, b) => b.quantity - a.quantity);
};

const buildTopClients = (orders: DashboardOrder[]): DashboardTopClient[] => {
  const clients = new Map<string, DashboardTopClient>();

  for (const order of orders) {
    const current = clients.get(order.customerId) ?? {
      customerId: order.customerId,
      name: order.customerName,
      orderCount: 0,
      totalRevenue: 0,
    };
    current.orderCount += 1;
    current.totalRevenue = roundMoney(current.totalRevenue + order.total);
    clients.set(order.customerId, current);
  }

  return [...clients.values()]
    .sort((a, b) => b.totalRevenue - a.totalRevenue || b.orderCount - a.orderCount)
    .slice(0, 6);
};

export const getDailyDashboard = async (
  query: DashboardQuery,
  repository: DashboardRepository,
  now: () => Date = () => new Date(),
): Promise<DailyDashboard> => {
  const currentDate = now();
  const date = query.date ?? toIsoDate(currentDate);
  const allOrders = await repository.listOrders();
  const selectedDateOrders = allOrders.filter((order) => order.deliveryDate === date);
  const last30Start = toIsoDate(addDays(currentDate, -29));
  const last7Start = toIsoDate(addDays(currentDate, -6));
  const last30Orders = allOrders.filter((order) => order.deliveryDate >= last30Start);
  const last7Orders = allOrders.filter((order) => order.deliveryDate >= last7Start);
  const deliveryShifts: Record<DeliveryTime, number> = {
    mediodia: 0,
    tarde: 0,
    noche: 0,
  };

  let selectedDateRevenue = 0;
  for (const order of selectedDateOrders) {
    selectedDateRevenue += order.total;
    deliveryShifts[order.deliveryTime] += 1;
  }

  const grossRevenue = roundMoney(allOrders.reduce((total, order) => total + order.total, 0));
  const paidRevenue = roundMoney(
    allOrders.filter((order) => order.isPaid).reduce((total, order) => total + order.total, 0),
  );
  const estimatedCosts = sumEstimatedCost(allOrders);
  const orderCount = allOrders.length;
  const totalUnits = allOrders.reduce(
    (total, order) => total + order.items.reduce((itemTotal, item) => itemTotal + item.quantity, 0),
    0,
  );
  const todayIso = toIsoDate(currentDate);
  const buildCalendarDay = (dayDate: string): DashboardCalendarDay => {
    const dayOrders = allOrders.filter((order) => order.deliveryDate === dayDate);
    return {
      date: dayDate,
      count: dayOrders.length,
      revenue: roundMoney(dayOrders.reduce((total, order) => total + order.total, 0)),
    };
  };
  const nextSevenDays = Array.from({ length: 7 }, (_, index) =>
    buildCalendarDay(toIsoDate(addDays(currentDate, index))),
  );
  const lastSevenDays = Array.from({ length: 7 }, (_, index) =>
    buildCalendarDay(toIsoDate(addDays(currentDate, index - 6))),
  );
  const statusSummary: DashboardStatusSummary = {
    confirmed: allOrders.filter((order) => order.status === 'confirmado').length,
    inProduction: 0,
    ready: allOrders.filter((order) => order.status === 'preparado').length,
    delivered: allOrders.filter((order) => order.status === 'entregado').length,
    total: allOrders.length,
  };
  const recentOrders = [...allOrders]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 8)
    .map((order) => ({
      id: order.id,
      customerName: order.customerName,
      deliveryDate: order.deliveryDate,
      deliveryTime: order.deliveryTime,
      status: order.status,
      isPaid: order.isPaid,
      total: order.total,
    }));

  const upcomingOrders = allOrders
    .filter((order) => order.deliveryDate >= todayIso && !isFinalized(order))
    .sort(
      (a, b) =>
        a.deliveryDate.localeCompare(b.deliveryDate) ||
        a.deliveryTime.localeCompare(b.deliveryTime) ||
        a.customerName.localeCompare(b.customerName, 'es-AR'),
    )
    .slice(0, 6)
    .map((order) => ({
      id: order.id,
      customerName: order.customerName,
      deliveryDate: order.deliveryDate,
      deliveryTime: order.deliveryTime,
      status: order.status,
      total: order.total,
    }));

  return {
    date,
    orderCount: selectedDateOrders.length,
    totalRevenue: roundMoney(selectedDateRevenue),
    deliveryShifts,
    topVarieties: buildTopVarieties(selectedDateOrders),
    topClients: buildTopClients(allOrders),
    upcomingOrders,
    nextSevenDays,
    lastSevenDays,
    statusSummary,
    recentOrders,
    totals: {
      orderCount,
      activeOrderCount: allOrders.filter((order) => !isFinalized(order)).length,
      finalizedOrderCount: allOrders.filter(isFinalized).length,
      unpaidOrderCount: allOrders.filter((order) => !order.isPaid).length,
      grossRevenue,
      paidRevenue,
      pendingRevenue: roundMoney(grossRevenue - paidRevenue),
      estimatedCosts,
      estimatedProfit: roundMoney(grossRevenue - estimatedCosts),
      totalUnits,
      averageTicket: orderCount > 0 ? roundMoney(grossRevenue / orderCount) : 0,
    },
    varietySales: {
      all: buildTopVarieties(allOrders),
      last30: buildTopVarieties(last30Orders),
      last7: buildTopVarieties(last7Orders),
      selectedDate: buildTopVarieties(selectedDateOrders),
    },
  };
};
