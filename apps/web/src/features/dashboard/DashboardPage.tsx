import { useMemo, useState } from 'react';
import {
  CircleDollarSign,
  ClipboardList,
  CreditCard,
  HandCoins,
  PackageCheck,
  Wallet,
} from 'lucide-react';

import type { DashboardQuery } from '@te-pinta/shared';

import { useDailyDashboard } from './dashboard-hooks';
import {
  dashboardCustomerSummaryMock,
  dashboardKpiComparisons,
  dashboardMockOrders,
  dashboardProductionMock,
  dashboardTotalsMock,
  dashboardVarietySalesMock,
  dashboardWalletsMock,
  dashboardWeeklySalesMock,
} from './dashboard.mock';
import { useOrders } from '../orders/orders-hooks';

import {
  buildCriticalAlerts,
  buildCustomerSummary,
  buildProductionSummaryFromOrders,
  buildSecondaryAlerts,
  buildVarietySales,
  buildWeeklySales,
  deliveryTextLabels,
  formatMoney,
  formatQuantity,
  getPeriodRange,
  getRelativeDeliveryLabel,
  getUrgency,
  mapMockOrderToCard,
  mapOrderToCard,
  productionStatusByOrderStatus,
  today,
  type DashboardOrderCard,
  type DashboardPeriod,
  type KpiCardData,
} from './dashboard-utils';

import { DashboardHeader } from './components/DashboardHeader';
import { KpiCard } from './components/KpiCard';
import { CriticalAlertsBar } from './components/CriticalAlertsBar';
import { UpcomingOrdersCard } from './components/UpcomingOrdersCard';
import { ProductionPendingCard } from './components/ProductionPendingCard';
import { WalletsSummary } from './components/WalletsSummary';
import { VarietySalesChart, WeeklySalesChart } from './components/AnalyticsCards';
import { CustomerSummaryCard } from './components/CustomerSummaryCard';
import { AlertsPanel } from './components/AlertsPanel';

export const DashboardPage = () => {
  const [date, setDate] = useState(today);
  const [period, setPeriod] = useState<DashboardPeriod>('week');
  const [customStartDate, setCustomStartDate] = useState(today);
  const [customEndDate, setCustomEndDate] = useState(today);

  const periodRange = useMemo(
    () => getPeriodRange(period, date, customStartDate, customEndDate),
    [customEndDate, customStartDate, date, period],
  );

  const dashboardRequest = useMemo<DashboardQuery>(
    () => ({
      date,
      analyticsMode: 'custom',
      startDate: periodRange.startDate,
      endDate: periodRange.endDate,
    }),
    [date, periodRange.endDate, periodRange.startDate],
  );

  const dashboardQuery = useDailyDashboard(dashboardRequest);
  const ordersQuery = useOrders({
    visibility: 'active',
    sortBy: 'deliveryDate',
    sortDir: 'asc',
    pageSize: 8,
  });
  const dashboard = dashboardQuery.data;
  const selectedRangeAnalytics = dashboard?.selectedRangeAnalytics;
  const selectedTotals = selectedRangeAnalytics?.totals;
  const hasDashboardResponse = Boolean(dashboard);
  const useMockDashboardData = !hasDashboardResponse && !dashboardQuery.isLoading;

  const totals = selectedTotals ?? (hasDashboardResponse ? dashboard!.totals : dashboardTotalsMock);
  const topClients = selectedRangeAnalytics?.topClients ?? dashboard?.topClients ?? [];
  const topVarieties = selectedRangeAnalytics?.topVarieties ?? dashboard?.topVarieties ?? [];
  const chartDays = selectedRangeAnalytics?.chartDays ?? dashboard?.lastSevenDays ?? [];

  const orders = useMemo<DashboardOrderCard[]>(() => {
    if (ordersQuery.data) {
      return ordersQuery.data.orders.map((order) => mapOrderToCard(order, date));
    }

    if (dashboard?.upcomingOrders?.length && !ordersQuery.isError) {
      return dashboard.upcomingOrders.map((order) => ({
        id: order.id,
        customerName: order.customerName,
        deliveryDate: order.deliveryDate,
        deliveryTime: deliveryTextLabels[order.deliveryTime],
        deliveryLabel: getRelativeDeliveryLabel(order.deliveryDate, order.deliveryTime, date),
        dozens: null,
        paymentStatus: 'Pendiente',
        productionStatus: productionStatusByOrderStatus[order.status],
        urgency: getUrgency(order.deliveryDate, date),
        href: `/orders?orderId=${encodeURIComponent(order.id)}`,
      }));
    }

    return dashboardMockOrders.map(mapMockOrderToCard);
  }, [dashboard?.upcomingOrders, date, ordersQuery.data, ordersQuery.isError]);

  const productionSummary = useMemo(() => {
    if (ordersQuery.data) {
      return buildProductionSummaryFromOrders(ordersQuery.data.orders, date);
    }

    return dashboardProductionMock;
  }, [date, ordersQuery.data]);

  const varietySales = useMemo(() => {
    if (useMockDashboardData) return dashboardVarietySalesMock;

    return buildVarietySales(topVarieties);
  }, [topVarieties, useMockDashboardData]);

  const weeklySales = useMemo(() => {
    if (useMockDashboardData) return dashboardWeeklySalesMock;

    return buildWeeklySales(chartDays);
  }, [chartDays, useMockDashboardData]);

  const customerSummary = useMemo(() => {
    if (useMockDashboardData) return dashboardCustomerSummaryMock;

    return buildCustomerSummary(topClients);
  }, [topClients, useMockDashboardData]);

  const criticalAlerts = useMemo(
    () =>
      buildCriticalAlerts({
        orders,
        pendingRevenue: totals.pendingRevenue ?? 0,
        productionSummary,
        useMock: useMockDashboardData && !ordersQuery.data,
      }),
    [orders, ordersQuery.data, productionSummary, totals.pendingRevenue, useMockDashboardData],
  );

  const secondaryAlerts = useMemo(
    () =>
      buildSecondaryAlerts({
        criticalAlerts,
        pendingRevenue: totals.pendingRevenue ?? 0,
        useMock: useMockDashboardData && !ordersQuery.data,
      }),
    [criticalAlerts, ordersQuery.data, totals.pendingRevenue, useMockDashboardData],
  );

  const kpis = useMemo<KpiCardData[]>(
    () => [
      {
        id: 'sales',
        title: 'Ventas del período',
        value: formatMoney(totals.grossRevenue),
        icon: CircleDollarSign,
        comparison: dashboardKpiComparisons.sales,
        accent: 'primary',
      },
      {
        id: 'profit',
        title: 'Ganancia estimada',
        value: formatMoney(totals.estimatedProfit),
        icon: HandCoins,
        comparison: dashboardKpiComparisons.profit,
        accent: 'success',
      },
      {
        id: 'orders',
        title: 'Pedidos',
        value: String(totals.orderCount ?? 0),
        icon: ClipboardList,
        comparison: dashboardKpiComparisons.orders,
        accent: 'neutral',
      },
      {
        id: 'dozens',
        title: 'Docenas vendidas',
        value: formatQuantity(totals.soldDozens),
        icon: PackageCheck,
        comparison: dashboardKpiComparisons.dozens,
        accent: 'olive',
      },
      {
        id: 'average-ticket',
        title: 'Ticket promedio',
        value: formatMoney(totals.averageTicket),
        icon: CreditCard,
        comparison: dashboardKpiComparisons.averageTicket,
        accent: 'warning',
      },
      {
        id: 'pending-revenue',
        title: 'Pendiente de cobro',
        value: formatMoney(totals.pendingRevenue),
        icon: Wallet,
        comparison: dashboardKpiComparisons.pendingRevenue,
        accent: 'danger',
        helpText:
          (totals.pendingRevenue ?? 0) === 0
            ? 'No hay pendientes de cobro en el período.'
            : `${totals.unpaidOrderCount ?? 0} pedidos con cobro pendiente.`,
      },
    ],
    [
      totals.averageTicket,
      totals.estimatedProfit,
      totals.grossRevenue,
      totals.orderCount,
      totals.pendingRevenue,
      totals.soldDozens,
      totals.unpaidOrderCount,
    ],
  );

  return (
    <div className="space-y-6 pb-4">
      <DashboardHeader
        customEndDate={customEndDate}
        customStartDate={customStartDate}
        date={date}
        onCustomEndDateChange={setCustomEndDate}
        onCustomStartDateChange={setCustomStartDate}
        onDateChange={setDate}
        onPeriodChange={setPeriod}
        period={period}
        periodRange={periodRange}
      />

      {dashboardQuery.isLoading ? (
        <p className="rounded-2xl border border-border/70 bg-white/85 px-4 py-3 text-sm font-semibold text-muted-foreground shadow-card">
          Cargando dashboard con datos reales...
        </p>
      ) : null}
      {dashboardQuery.isError ? (
        <p className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
          No se pudo cargar el dashboard. Mostrando datos mockeados de referencia para no bloquear
          el diseño.
        </p>
      ) : null}

      <div className="flex flex-col gap-6">
        <section
          className="order-2 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 md:order-1"
          aria-label="Indicadores principales"
        >
          {kpis.map((kpi) => (
            <KpiCard key={kpi.id} kpi={kpi} />
          ))}
        </section>

        <CriticalAlertsBar alerts={criticalAlerts} />
        <UpcomingOrdersCard orders={orders} />
        <ProductionPendingCard summary={productionSummary} />
        <WalletsSummary wallets={dashboardWalletsMock} />

        <section className="order-6 grid gap-6 xl:grid-cols-2" aria-label="Analítica comercial">
          <VarietySalesChart varieties={varietySales} />
          <WeeklySalesChart weeklySales={weeklySales} />
        </section>

        <CustomerSummaryCard summary={customerSummary} />
        <AlertsPanel alerts={secondaryAlerts} />
      </div>
    </div>
  );
};
