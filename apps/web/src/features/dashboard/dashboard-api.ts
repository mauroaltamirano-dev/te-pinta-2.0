import type { DashboardQuery, DeliveryTime } from '@te-pinta/shared';

import { apiClient } from '@/lib/api-client';

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

export const getDailyDashboard = async (query: DashboardQuery = {}): Promise<DailyDashboard> => {
  const response = await apiClient.get<{ dashboard: DailyDashboard }>('/dashboard', {
    params: query,
  });

  return response.data.dashboard;
};
