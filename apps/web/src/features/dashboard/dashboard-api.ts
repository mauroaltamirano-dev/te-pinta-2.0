import type { DashboardQuery, DeliveryTime, OrderStatus } from '@te-pinta/shared';

import { apiClient } from '@/lib/api-client';

export type DashboardTopVariety = {
  menuItemId: string;
  name: string;
  quantity: number;
};

export type DashboardWeekRange = {
  startDate: string;
  endDate: string;
};

export type DashboardVarietyWeekComparison = {
  menuItemId: string;
  name: string;
  currentWeekQuantity: number;
  previousWeekQuantity: number;
  difference: number;
  changePercent: number | null;
};

export type DashboardWeeklyVarietyAnalytics = {
  currentWeek: DashboardWeekRange;
  comparisonWeek: DashboardWeekRange;
  varieties: DashboardVarietyWeekComparison[];
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
  isPaid: boolean;
  total: number;
};

export type DashboardCalendarDay = {
  date: string;
  count: number;
  revenue: number;
  estimatedProfit?: number;
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

export type DashboardRange = 'all' | 'last31' | 'last7';

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
  soldDozens: number;
  averageTicket: number;
};

export type DashboardTrendDirection = 'positive' | 'negative' | 'neutral';

export type DashboardKpiComparison = {
  value: string;
  label: string;
  direction: DashboardTrendDirection;
  currentValue: number;
  previousValue: number | null;
  difference: number | null;
  changePercent: number | null;
};

export type DashboardKpiComparisons = {
  sales: DashboardKpiComparison;
  profit: DashboardKpiComparison;
  orders: DashboardKpiComparison;
  dozens: DashboardKpiComparison;
  averageTicket: DashboardKpiComparison;
  pendingRevenue: DashboardKpiComparison;
};

export type DashboardWalletStatus = 'correct' | 'low' | 'critical';

export type DashboardAccountingWallet = {
  id: 'base-cost' | 'services' | 'profit';
  title: string;
  amount: number;
  percent: number;
  objectiveLabel: string;
  differenceLabel: string;
  status: DashboardWalletStatus;
  progress: number;
  description: string;
};

export type DashboardPurchaseTotals = {
  productionCost: number;
  services: number;
  profit: number;
};

export type DashboardAccountingTotals = {
  paidRevenue: number;
  directCost: number;
  grossProfit: number;
  serviceReserve: number;
  profitReserve: number;
  purchases: DashboardPurchaseTotals;
};

export type DashboardAccountingSummary = {
  servicePercent: number;
  totals: DashboardAccountingTotals;
  wallets: DashboardAccountingWallet[];
};

export type DashboardRangeAnalytics = {
  totals: DashboardTotals;
  topClients: DashboardTopClient[];
  topVarieties: DashboardTopVariety[];
  statusSummary: DashboardStatusSummary;
  recentOrders: DashboardRecentOrder[];
  chartDays: DashboardCalendarDay[];
};

export type DashboardSelectedRange = {
  mode: 'preset' | 'custom' | 'weekComparison';
  label: string;
  startDate: string | null;
  endDate: string | null;
  preset?: DashboardRange;
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
  rangeTotals: Record<DashboardRange, DashboardTotals>;
  rangeAnalytics?: Record<DashboardRange, DashboardRangeAnalytics>;
  selectedRange?: DashboardSelectedRange;
  selectedRangeAnalytics?: DashboardRangeAnalytics;
  kpiComparisons?: DashboardKpiComparisons;
  weeklyVarietyAnalytics?: DashboardWeeklyVarietyAnalytics;
  accountingSummary?: DashboardAccountingSummary;
  varietySales: {
    all: DashboardTopVariety[];
    last31: DashboardTopVariety[];
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
