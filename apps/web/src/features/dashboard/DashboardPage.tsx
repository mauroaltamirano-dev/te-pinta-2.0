import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  CircleDollarSign,
  ClipboardList,
  CreditCard,
  HandCoins,
  PackageCheck,
  Wallet,
} from 'lucide-react';

import { dashboardQueryKeys, useDailyDashboard } from './dashboard-hooks';
import {
  dashboardCustomerSummaryMock,
  dashboardKpiComparisons,
  dashboardMockOrders,
  dashboardTotalsMock,
  dashboardVarietySalesMock,
  dashboardWalletsMock,
} from './dashboard.mock';
import { useOrders, useUpdateOrderPayment, useUpdateOrderStatus } from '../orders/orders-hooks';

import {
  buildCriticalAlerts,
  buildCustomerSummary,
  buildDashboardRequest,
  buildProductionSummaryFromOrders,
  buildVarietySales,
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

import type { DashboardKpiComparison } from './dashboard-api';
import { DashboardHeader } from './components/DashboardHeader';
import { DashboardPeriodControls } from './components/DashboardPeriodControls';
import { KpiCard } from './components/KpiCard';
import { UpcomingOrdersCard } from './components/UpcomingOrdersCard';
import { WalletsSummary } from './components/WalletsSummary';
import { CommercialAnalyticsSection } from './components/AnalyticsCards';
import { CriticalAlertsBar } from './components/CriticalAlertsBar';

const fallbackComparison = (
  comparison: (typeof dashboardKpiComparisons)[keyof typeof dashboardKpiComparisons],
): DashboardKpiComparison => ({
  ...comparison,
  currentValue: 0,
  previousValue: null,
  difference: null,
  changePercent: null,
});

const fallbackKpiComparisons = {
  sales: fallbackComparison(dashboardKpiComparisons.sales),
  profit: fallbackComparison(dashboardKpiComparisons.profit),
  orders: fallbackComparison(dashboardKpiComparisons.orders),
  dozens: fallbackComparison(dashboardKpiComparisons.dozens),
  averageTicket: fallbackComparison(dashboardKpiComparisons.averageTicket),
  pendingRevenue: fallbackComparison(dashboardKpiComparisons.pendingRevenue),
};

export const DashboardPage = () => {
  const queryClient = useQueryClient();
  const [date, setDate] = useState(today);
  const [globalPeriod, setGlobalPeriod] = useState<DashboardPeriod>('week');
  const [sectionPeriods, setSectionPeriods] = useState<{
    commercial: DashboardPeriod;
    kpis: DashboardPeriod;
  }>({ commercial: 'week', kpis: 'week' });
  const [customStartDate, setCustomStartDate] = useState(today);
  const [customEndDate, setCustomEndDate] = useState(today);

  const globalPeriodRange = useMemo(
    () => getPeriodRange(globalPeriod, date, customStartDate, customEndDate),
    [customEndDate, customStartDate, date, globalPeriod],
  );
  const kpiPeriodRange = useMemo(
    () => getPeriodRange(sectionPeriods.kpis, date, customStartDate, customEndDate),
    [customEndDate, customStartDate, date, sectionPeriods.kpis],
  );
  const commercialPeriodRange = useMemo(
    () => getPeriodRange(sectionPeriods.commercial, date, customStartDate, customEndDate),
    [customEndDate, customStartDate, date, sectionPeriods.commercial],
  );

  const kpiDashboardRequest = useMemo(
    () => buildDashboardRequest(sectionPeriods.kpis, kpiPeriodRange, date),
    [date, kpiPeriodRange, sectionPeriods.kpis],
  );
  const commercialDashboardRequest = useMemo(
    () => buildDashboardRequest(sectionPeriods.commercial, commercialPeriodRange, date),
    [commercialPeriodRange, date, sectionPeriods.commercial],
  );

  const dashboardQuery = useDailyDashboard(kpiDashboardRequest);
  const commercialDashboardQuery = useDailyDashboard(commercialDashboardRequest);
  const ordersQuery = useOrders({
    visibility: 'active',
    sortBy: 'deliveryDate',
    sortDir: 'asc',
    pageSize: 8,
  });
  const updateOrderPaymentMutation = useUpdateOrderPayment();
  const updateOrderStatusMutation = useUpdateOrderStatus();
  const dashboard = dashboardQuery.data;
  const commercialDashboard = commercialDashboardQuery.data ?? dashboard;
  const selectedRangeAnalytics = dashboard?.selectedRangeAnalytics;
  const commercialRangeAnalytics = commercialDashboard?.selectedRangeAnalytics;
  const selectedTotals = selectedRangeAnalytics?.totals;
  const hasDashboardResponse = Boolean(dashboard);
  const useMockDashboardData = !hasDashboardResponse && !dashboardQuery.isLoading;

  const handleGlobalPeriodChange = (nextPeriod: DashboardPeriod) => {
    setGlobalPeriod(nextPeriod);
    setSectionPeriods({ commercial: nextPeriod, kpis: nextPeriod });
  };
  const handleSectionPeriodChange = (
    section: keyof typeof sectionPeriods,
    nextPeriod: DashboardPeriod,
  ) => {
    setSectionPeriods((current) => ({ ...current, [section]: nextPeriod }));
    setGlobalPeriod('custom');
  };
  const handleCustomStartDateChange = (value: string) => {
    setCustomStartDate(value);
    handleGlobalPeriodChange('custom');
  };
  const handleCustomEndDateChange = (value: string) => {
    setCustomEndDate(value);
    handleGlobalPeriodChange('custom');
  };
  const invalidateDashboard = () => {
    void queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all });
  };
  const markOrderPaid = (orderId: string) => {
    updateOrderPaymentMutation.mutate(
      { id: orderId, isPaid: true },
      { onSuccess: invalidateDashboard },
    );
  };
  const markOrderPrepared = (orderId: string) => {
    updateOrderStatusMutation.mutate(
      { id: orderId, status: 'preparado' },
      { onSuccess: invalidateDashboard },
    );
  };
  const markOrderDelivered = (orderId: string) => {
    updateOrderStatusMutation.mutate(
      { id: orderId, status: 'entregado' },
      { onSuccess: invalidateDashboard },
    );
  };

  const totals = selectedTotals ?? (hasDashboardResponse ? dashboard!.totals : dashboardTotalsMock);
  const topClients = commercialRangeAnalytics?.topClients ?? commercialDashboard?.topClients ?? [];
  const topVarieties =
    commercialRangeAnalytics?.topVarieties ?? commercialDashboard?.topVarieties ?? [];
  const comparisons = dashboard?.kpiComparisons ?? fallbackKpiComparisons;

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
        paymentStatus: order.isPaid ? 'Pagado' : 'Pendiente',
        productionStatus: productionStatusByOrderStatus[order.status],
        urgency: getUrgency(order.deliveryDate, date),
        href: `/orders?orderId=${encodeURIComponent(order.id)}`,
        isPaid: order.isPaid,
        status: order.status,
      }));
    }

    return dashboardMockOrders.map(mapMockOrderToCard);
  }, [dashboard?.upcomingOrders, date, ordersQuery.data, ordersQuery.isError]);

  const productionSummary = useMemo(() => {
    if (ordersQuery.data) {
      return buildProductionSummaryFromOrders(ordersQuery.data.orders, date);
    }

    return {
      totalDozens: 0,
      todayDozens: 0,
      tomorrowDozens: 0,
      varieties: [],
      packaging: [],
      stockAlert: '',
    };
  }, [date, ordersQuery.data]);

  const varietySales = useMemo(() => {
    if (useMockDashboardData) return dashboardVarietySalesMock;

    return buildVarietySales(topVarieties);
  }, [topVarieties, useMockDashboardData]);

  const customerSummary = useMemo(() => {
    if (useMockDashboardData) return dashboardCustomerSummaryMock;

    return buildCustomerSummary(topClients);
  }, [topClients, useMockDashboardData]);

  const wallets = useMemo(() => {
    if (useMockDashboardData) {
      return dashboardWalletsMock;
    }

    return dashboard?.accountingSummary?.wallets ?? dashboardWalletsMock;
  }, [dashboard?.accountingSummary?.wallets, useMockDashboardData]);

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

  const kpis = useMemo<KpiCardData[]>(
    () => [
      {
        id: 'sales',
        title: 'Ventas del período',
        value: formatMoney(totals.grossRevenue),
        icon: CircleDollarSign,
        comparison: comparisons.sales,
        accent: 'primary',
      },
      {
        id: 'profit',
        title: 'Ganancia estimada',
        value: formatMoney(totals.estimatedProfit),
        icon: HandCoins,
        comparison: comparisons.profit,
        accent: 'success',
      },
      {
        id: 'orders',
        title: 'Pedidos',
        value: String(totals.orderCount ?? 0),
        icon: ClipboardList,
        comparison: comparisons.orders,
        accent: 'neutral',
      },
      {
        id: 'dozens',
        title: 'Docenas vendidas',
        value: formatQuantity(totals.soldDozens),
        icon: PackageCheck,
        comparison: comparisons.dozens,
        accent: 'olive',
      },
      {
        id: 'average-ticket',
        title: 'Ticket promedio',
        value: formatMoney(totals.averageTicket),
        icon: CreditCard,
        comparison: comparisons.averageTicket,
        accent: 'warning',
      },
      {
        id: 'pending-revenue',
        title: 'Pendiente de cobro',
        value: formatMoney(totals.pendingRevenue),
        icon: Wallet,
        comparison: comparisons.pendingRevenue,
        accent: 'danger',
        helpText:
          (totals.pendingRevenue ?? 0) === 0
            ? 'No hay pendientes de cobro en el período.'
            : `${totals.unpaidOrderCount ?? 0} pedidos con cobro pendiente.`,
      },
    ],
    [
      comparisons.averageTicket,
      comparisons.dozens,
      comparisons.orders,
      comparisons.pendingRevenue,
      comparisons.profit,
      comparisons.sales,
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
      <DashboardHeader date={date} />

      <DashboardPeriodControls
        ariaLabel="Filtro general del dashboard"
        customEndDate={customEndDate}
        customStartDate={customStartDate}
        date={date}
        onCustomEndDateChange={handleCustomEndDateChange}
        onCustomStartDateChange={handleCustomStartDateChange}
        onDateChange={setDate}
        onPeriodChange={handleGlobalPeriodChange}
        period={globalPeriod}
        periodRange={globalPeriodRange}
        showDateControls
      />

      {dashboardQuery.isLoading || commercialDashboardQuery.isLoading ? (
        <p className="rounded-2xl border border-border/70 bg-white/85 px-4 py-3 text-sm font-semibold text-muted-foreground shadow-card">
          Cargando dashboard con datos reales...
        </p>
      ) : null}
      {dashboardQuery.isError || commercialDashboardQuery.isError ? (
        <p className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
          No se pudo cargar el dashboard. Mostrando datos mockeados de referencia para no bloquear
          el diseño.
        </p>
      ) : null}

      <div className="flex flex-col gap-6">
        <CriticalAlertsBar alerts={criticalAlerts} />

        <section
          className="order-2 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6"
          aria-label="Indicadores principales"
        >
          <div className="sm:col-span-2 xl:col-span-3 2xl:col-span-6">
            <DashboardPeriodControls
              ariaLabel="Filtro de indicadores"
              customEndDate={customEndDate}
              customStartDate={customStartDate}
              date={date}
              onCustomEndDateChange={handleCustomEndDateChange}
              onCustomStartDateChange={handleCustomStartDateChange}
              onDateChange={setDate}
              onPeriodChange={(nextPeriod) => handleSectionPeriodChange('kpis', nextPeriod)}
              period={sectionPeriods.kpis}
              periodRange={kpiPeriodRange}
            />
          </div>
          {kpis.map((kpi) => (
            <KpiCard key={kpi.id} kpi={kpi} />
          ))}
        </section>

        <UpcomingOrdersCard
          isActionPending={
            updateOrderPaymentMutation.isPending || updateOrderStatusMutation.isPending
          }
          onMarkDelivered={markOrderDelivered}
          onMarkPaid={markOrderPaid}
          onMarkPrepared={markOrderPrepared}
          orders={orders}
        />
        <WalletsSummary wallets={wallets} />
        <CommercialAnalyticsSection
          filterControls={
            <DashboardPeriodControls
              ariaLabel="Filtro comercial"
              customEndDate={customEndDate}
              customStartDate={customStartDate}
              date={date}
              onCustomEndDateChange={handleCustomEndDateChange}
              onCustomStartDateChange={handleCustomStartDateChange}
              onDateChange={setDate}
              onPeriodChange={(nextPeriod) => handleSectionPeriodChange('commercial', nextPeriod)}
              period={sectionPeriods.commercial}
              periodRange={commercialPeriodRange}
            />
          }
          summary={customerSummary}
          varieties={varietySales}
        />
      </div>
    </div>
  );
};
