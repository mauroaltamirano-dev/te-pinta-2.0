import type { DashboardQuery, DeliveryTime } from '@te-pinta/shared';

export type DashboardOrderItem = {
  menuItemId: string;
  menuItemName: string;
  quantity: number;
};

export type DashboardOrder = {
  id: string;
  deliveryDate: string;
  deliveryTime: DeliveryTime;
  total: number;
  items: DashboardOrderItem[];
};

export type DashboardTopVariety = {
  menuItemId: string;
  name: string;
  quantity: number;
};

export type DailyDashboard = {
  date: string;
  orderCount: number;
  totalRevenue: number;
  deliveryShifts: Record<DeliveryTime, number>;
  topVarieties: DashboardTopVariety[];
};

export type DashboardRepository = {
  listOrdersByDate(date: string): Promise<DashboardOrder[]>;
};

const toIsoDate = (date: Date): string => date.toISOString().slice(0, 10);

export const getDailyDashboard = async (
  query: DashboardQuery,
  repository: DashboardRepository,
  now: () => Date = () => new Date(),
): Promise<DailyDashboard> => {
  const date = query.date ?? toIsoDate(now());
  const orders = await repository.listOrdersByDate(date);
  const deliveryShifts: Record<DeliveryTime, number> = {
    mediodia: 0,
    tarde: 0,
    noche: 0,
  };
  const varieties = new Map<string, DashboardTopVariety>();

  let totalRevenue = 0;

  for (const order of orders) {
    totalRevenue += order.total;
    deliveryShifts[order.deliveryTime] += 1;

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

  return {
    date,
    orderCount: orders.length,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    deliveryShifts,
    topVarieties: [...varieties.values()].sort((a, b) => b.quantity - a.quantity),
  };
};
