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
  mapOrderToCard,
  productionStatusByOrderStatus,
  today,
  type DashboardOrderCard,
  type DashboardPeriod,
  type KpiCardData,
} from './dashboard-utils';

import type { DashboardKpiComparison, DashboardTotals } from './dashboard-api';
import { DashboardHeader } from './components/DashboardHeader';
import { DashboardPeriodControls } from './components/DashboardPeriodControls';
import { KpiCard } from './components/KpiCard';
import { UpcomingOrdersCard } from './components/UpcomingOrdersCard';
import { WalletsSummary } from './components/WalletsSummary';
import { CommercialAnalyticsSection } from './components/AnalyticsCards';
import { CriticalAlertsBar } from './components/CriticalAlertsBar';

const emptyComparison = (): DashboardKpiComparison => ({
  value: '—',
  label: 'Sin datos disponibles',
  direction: 'neutral',
  currentValue: 0,
  previousValue: null,
  difference: null,
  changePercent: null,
});

const fallbackKpiComparisons = {
  sales: emptyComparison(),
  profit: emptyComparison(),
  orders: emptyComparison(),
  dozens: emptyComparison(),
  averageTicket: emptyComparison(),
  pendingRevenue: emptyComparison(),
};

const emptyDashboardTotals: DashboardTotals = {
  orderCount: 0,
  activeOrderCount: 0,
  finalizedOrderCount: 0,
  unpaidOrderCount: 0,
  grossRevenue: 0,
  paidRevenue: 0,
  pendingRevenue: 0,
  estimatedCosts: 0,
  estimatedProfit: 0,
  totalUnits: 0,
  soldDozens: 0,
  averageTicket: 0,
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
  const commercialDashboard = commercialDashboardQuery.data;
  const selectedRangeAnalytics = dashboard?.selectedRangeAnalytics;
  const commercialRangeAnalytics = commercialDashboard?.selectedRangeAnalytics;
  const selectedTotals = selectedRangeAnalytics?.totals;

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

  const totals = selectedTotals ?? dashboard?.totals ?? emptyDashboardTotals;
  const topClients = commercialRangeAnalytics?.topClients ?? commercialDashboard?.topClients ?? [];
  const customerStats = commercialRangeAnalytics?.customerStats;
  const topVarieties =
    commercialRangeAnalytics?.topVarieties ?? commercialDashboard?.topVarieties ?? [];
  const comparisons = dashboard?.kpiComparisons ?? fallbackKpiComparisons;

  const orders = useMemo<DashboardOrderCard[]>(() => {
    if (ordersQuery.data) {
      return ordersQuery.data.orders.map((order) => mapOrderToCard(order, date));
    }

    if (dashboard?.upcomingOrders?.length) {
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

    return [];
  }, [dashboard?.upcomingOrders, date, ordersQuery.data]);

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

  const varietySales = useMemo(() => buildVarietySales(topVarieties), [topVarieties]);

  const customerSummary = useMemo(
    () => buildCustomerSummary(topClients, customerStats),
    [customerStats, topClients],
  );

  const wallets = useMemo(
    () => dashboard?.accountingSummary?.wallets ?? [],
    [dashboard?.accountingSummary?.wallets],
  );

  const criticalAlerts = useMemo(
    () =>
      buildCriticalAlerts({
        orders,
        pendingRevenue: totals.pendingRevenue ?? 0,
        productionSummary,
      }),
    [orders, productionSummary, totals.pendingRevenue],
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
          No se pudo cargar el dashboard completo. Las secciones sin respuesta muestran valores
          vacíos.
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
