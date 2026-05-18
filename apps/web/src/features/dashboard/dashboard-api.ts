import type { DashboardQuery, DeliveryTime } from '@te-pinta/shared';

import { apiClient } from '@/lib/api-client';

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
  status: string;
  total: number;
};

export type DashboardCalendarDay = {
  date: string;
  count: number;
  revenue: number;
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
  totals: DashboardTotals;
  varietySales: {
    all: DashboardTopVariety[];
    last30: DashboardTopVariety[];
    last7: DashboardTopVariety[];
    selectedDate: DashboardTopVariety[];
  };
};

export const getDailyDashboard = async (query: DashboardQuery = {}): Promise<DailyDashboard> => {
  const response = await apiClient.get<{ dashboard: DailyDashboard }>('/dashboard', {
    params: query,
  });

  return response.data.dashboard;
};
