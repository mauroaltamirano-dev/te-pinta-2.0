import { useMemo, useState } from 'react';
import {
  BarChart3,
  CircleDollarSign,
  ClipboardList,
  CreditCard,
  PackageCheck,
  Wallet,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { PageHero } from '@/components/layout/PageHero';
import { cn } from '@/lib/utils';

import type {
  DashboardKpiComparison,
  DashboardKpiComparisons,
  DashboardTotals,
} from '../dashboard/dashboard-api';
import { useDailyDashboard } from '../dashboard/dashboard-hooks';
import {
  buildCustomerSummary,
  buildDashboardRequest,
  buildVarietySales,
  buildWeeklySales,
  formatCompactDate,
  formatMoney,
  formatQuantity,
  getPeriodRange,
  today,
  type DashboardPeriod,
  type KpiCardData,
} from '../dashboard/dashboard-utils';
import {
  CommercialAnalyticsSection,
  WeeklySalesChart,
} from '../dashboard/components/AnalyticsCards';
import { DashboardPeriodControls } from '../dashboard/components/DashboardPeriodControls';
import { KpiCard } from '../dashboard/components/KpiCard';
import { EmptyState, SectionCard, StatusBadge } from '../dashboard/components/shared';

const zeroTotals: DashboardTotals = {
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

const neutralComparison = (label: string): DashboardKpiComparison => ({
  value: 'Sin comparación',
  label,
  direction: 'neutral',
  currentValue: 0,
  previousValue: null,
  difference: null,
  changePercent: null,
});

const fallbackComparisons: DashboardKpiComparisons = {
  sales: neutralComparison('Sin período anterior'),
  profit: neutralComparison('Sin período anterior'),
  orders: neutralComparison('Sin período anterior'),
  dozens: neutralComparison('Sin período anterior'),
  averageTicket: neutralComparison('Sin período anterior'),
  pendingRevenue: neutralComparison('Sin período anterior'),
};

const statusLabels = {
  confirmado: 'Confirmado',
  preparado: 'Preparado',
  entregado: 'Entregado',
} as const;

export const SalesPage = () => {
  const [date, setDate] = useState(today);
  const [period, setPeriod] = useState<DashboardPeriod>('week');
  const [customStartDate, setCustomStartDate] = useState(today);
  const [customEndDate, setCustomEndDate] = useState(today);
  const periodRange = useMemo(
    () => getPeriodRange(period, date, customStartDate, customEndDate),
    [customEndDate, customStartDate, date, period],
  );
  const dashboardRequest = useMemo(
    () => buildDashboardRequest(period, periodRange, date),
    [date, period, periodRange],
  );
  const dashboardQuery = useDailyDashboard(dashboardRequest);
  const dashboard = dashboardQuery.data;
  const analytics = dashboard?.selectedRangeAnalytics;
  const totals = analytics?.totals ?? dashboard?.totals ?? zeroTotals;
  const comparisons = dashboard?.kpiComparisons ?? fallbackComparisons;
  const varieties = useMemo(
    () => buildVarietySales(analytics?.topVarieties ?? dashboard?.topVarieties ?? []),
    [analytics?.topVarieties, dashboard?.topVarieties],
  );
  const customerSummary = useMemo(
    () =>
      buildCustomerSummary(
        analytics?.topClients ?? dashboard?.topClients ?? [],
        analytics?.customerStats,
      ),
    [analytics?.customerStats, analytics?.topClients, dashboard?.topClients],
  );
  const weeklySales = useMemo(
    () => buildWeeklySales(analytics?.chartDays ?? dashboard?.lastSevenDays ?? []),
    [analytics?.chartDays, dashboard?.lastSevenDays],
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
        id: 'paid',
        title: 'Ventas cobradas',
        value: formatMoney(totals.paidRevenue),
        icon: CreditCard,
        comparison: comparisons.sales,
        accent: 'success',
      },
      {
        id: 'pending',
        title: 'Pendiente de cobro',
        value: formatMoney(totals.pendingRevenue),
        icon: Wallet,
        comparison: comparisons.pendingRevenue,
        accent: 'danger',
      },
      {
        id: 'orders',
        title: 'Pedidos',
        value: String(totals.orderCount),
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
        icon: BarChart3,
        comparison: comparisons.averageTicket,
        accent: 'warning',
      },
    ],
    [comparisons, totals],
  );
  const recentOrders = analytics?.recentOrders ?? dashboard?.recentOrders ?? [];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 sm:gap-6">
      <PageHero
        compactOnMobile
        eyebrow="Análisis comercial"
        title="Ventas"
        description="Ingresos, cobros, clientes y variedades en una vista de lectura. La operación sigue viviendo en Pedidos."
      >
        <Link
          className="inline-flex min-h-11 items-center rounded-full bg-white px-3 text-xs font-black text-sidebar transition hover:bg-card lg:px-4 lg:text-sm"
          to="/orders"
        >
          Ir a Pedidos
        </Link>
      </PageHero>

      <DashboardPeriodControls
        ariaLabel="Período de ventas"
        customEndDate={customEndDate}
        customStartDate={customStartDate}
        date={date}
        onCustomEndDateChange={(value) => {
          setCustomEndDate(value);
          setPeriod('custom');
        }}
        onCustomStartDateChange={(value) => {
          setCustomStartDate(value);
          setPeriod('custom');
        }}
        onDateChange={setDate}
        onPeriodChange={setPeriod}
        period={period}
        periodRange={periodRange}
        showDateControls
      />

      {dashboardQuery.isLoading ? (
        <p className="rounded-2xl bg-white px-4 py-3 text-sm font-bold text-muted-foreground shadow-card">
          Cargando ventas reales...
        </p>
      ) : null}
      {dashboardQuery.isError ? (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-800 ring-1 ring-red-100">
          No se pudieron cargar las ventas.
        </p>
      ) : null}

      <section
        className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3"
        aria-label="Indicadores de ventas"
      >
        {kpis.map((kpi) => (
          <KpiCard compactOnMobile key={kpi.id} kpi={kpi} />
        ))}
      </section>

      <div className="grid gap-4 sm:gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(20rem,.85fr)]">
        <WeeklySalesChart comparison={comparisons.sales} weeklySales={weeklySales} />
        <SectionCard className="p-3 sm:p-5" aria-label="Ventas recientes">
          <div className="mb-3 flex items-start justify-between gap-3 sm:mb-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">
                Actividad
              </p>
              <h2 className="mt-1 text-xl font-black text-foreground">Ventas recientes</h2>
            </div>
            <StatusBadge tone="info">{recentOrders.length} pedidos</StatusBadge>
          </div>

          {recentOrders.length ? (
            <div className="grid gap-2">
              {recentOrders.slice(0, 8).map((order, index) => (
                <Link
                  className={cn(
                    'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-2xl bg-background px-3 py-2.5 ring-1 ring-border/70 transition hover:bg-white',
                    index >= 5 && 'hidden sm:grid',
                  )}
                  key={order.id}
                  to={`/orders?orderId=${encodeURIComponent(order.id)}`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-foreground">
                      {order.customerName}
                    </p>
                    <p className="mt-1 text-xs font-bold text-muted-foreground">
                      {formatCompactDate(order.deliveryDate)} · {statusLabels[order.status]}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusBadge tone={order.isPaid ? 'success' : 'danger'}>
                      {order.isPaid ? 'Cobrado' : 'Pendiente'}
                    </StatusBadge>
                    <span className="font-black tabular-nums text-sidebar">
                      {formatMoney(order.total)}
                    </span>
                  </div>
                </Link>
              ))}
              {recentOrders.length > 5 ? (
                <Link
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl text-sm font-black text-primary ring-1 ring-border/70 sm:hidden"
                  to="/orders"
                >
                  Ver todos los pedidos
                </Link>
              ) : null}
            </div>
          ) : (
            <EmptyState
              title="No hay ventas en el período"
              description="Probá otro rango o registrá pedidos."
            />
          )}
        </SectionCard>
      </div>

      <CommercialAnalyticsSection summary={customerSummary} varieties={varieties} />
    </div>
  );
};
