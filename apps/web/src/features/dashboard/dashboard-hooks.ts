import { useQuery } from '@tanstack/react-query';

import type { DashboardQuery } from '@te-pinta/shared';

import { getDailyDashboard } from './dashboard-api';

export const dashboardQueryKeys = {
  all: ['dashboard'] as const,
  daily: (query: DashboardQuery = {}) => [...dashboardQueryKeys.all, 'daily', query] as const,
};

export const useDailyDashboard = (query: DashboardQuery = {}) =>
  useQuery({
    queryKey: dashboardQueryKeys.daily(query),
    queryFn: () => getDailyDashboard(query),
  });
