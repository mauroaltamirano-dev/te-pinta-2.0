import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronUp,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  CreditCard,
  Gauge,
  LineChart,
  PackageCheck,
  Plus,
  Search,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Trophy,
  Users,
  Wallet,
} from 'lucide-react';

import type { DeliveryTime, OrderStatus } from '@te-pinta/shared';

import type {
  DashboardCalendarDay,
  DashboardRange,
  DashboardRecentOrder,
  DashboardStatusSummary,
  DashboardTopClient,
  DashboardTopVariety,
} from './dashboard-api';
import { useDailyDashboard } from './dashboard-hooks';

const deliveryTextLabels: Record<DeliveryTime, string> = {
  mediodia: 'Mediodía',
  tarde: 'Tarde',
  noche: 'Noche',
};

const statusLabels: Record<OrderStatus, string> = {
  confirmado: 'En producción',
  preparado: 'Listo',
  entregado: 'Entregado',
};

const statusChipClass: Record<OrderStatus, string> = {
  confirmado: 'bg-amber-50 text-amber-800 ring-amber-200',
  preparado: 'bg-sky-50 text-sky-800 ring-sky-200',
  entregado: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
};

const weekdayFormatter = new Intl.DateTimeFormat('es-AR', { weekday: 'short' });
const dateFormatter = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' });
const fullDateFormatter = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const toLocalIsoDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseLocalDate = (date: string): Date => {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year || 0, (month || 1) - 1, day || 1);
};

const today = (): string => toLocalIsoDate(new Date());

const formatMoney = (value: number): string => `ARS ${Math.round(value).toLocaleString('es-AR')}`;
const formatCompactMoney = (value: number): string =>
  value >= 1_000_000 ? `ARS ${(value / 1_000_000).toFixed(1)}M` : formatMoney(value);
const formatDateLabel = (date: string): string => dateFormatter.format(parseLocalDate(date));
const formatFullDateLabel = (date: string): string =>
  fullDateFormatter.format(parseLocalDate(date));

const getDashboardOrderCode = (id: string): string => {
  const lastSegment = id.split('-').at(-1) ?? id;
  return /^\d+$/.test(lastSegment)
    ? `#P-${lastSegment.padStart(5, '0')}`
    : `#${lastSegment.slice(-6).toUpperCase()}`;
};

const mockLastSevenDays: DashboardCalendarDay[] = [
  { date: '2026-05-13', count: 7, revenue: 362400, estimatedProfit: 181200 },
  { date: '2026-05-14', count: 9, revenue: 428900, estimatedProfit: 214450 },
  { date: '2026-05-15', count: 11, revenue: 512700, estimatedProfit: 256350 },
  { date: '2026-05-16', count: 8, revenue: 398500, estimatedProfit: 199250 },
  { date: '2026-05-17', count: 12, revenue: 586300, estimatedProfit: 293150 },
  { date: '2026-05-18', count: 10, revenue: 532800, estimatedProfit: 266400 },
  { date: '2026-05-19', count: 13, revenue: 654800, estimatedProfit: 327400 },
];

const mockNextSevenDays: DashboardCalendarDay[] = [
  { date: '2026-05-19', count: 8, revenue: 420600, estimatedProfit: 210300 },
  { date: '2026-05-20', count: 10, revenue: 532800, estimatedProfit: 266400 },
  { date: '2026-05-21', count: 9, revenue: 489200, estimatedProfit: 244600 },
  { date: '2026-05-22', count: 11, revenue: 615300, estimatedProfit: 307650 },
  { date: '2026-05-23', count: 7, revenue: 381600, estimatedProfit: 190800 },
  { date: '2026-05-24', count: 6, revenue: 298700, estimatedProfit: 149350 },
  { date: '2026-05-25', count: 4, revenue: 178200, estimatedProfit: 89100 },
];

const mockTopClients: DashboardTopClient[] = [
  { customerId: 'mock-1', name: 'María González', orderCount: 8, totalRevenue: 386600 },
  { customerId: 'mock-2', name: 'Carlos Ramírez', orderCount: 7, totalRevenue: 312450 },
  { customerId: 'mock-3', name: 'Lucía Fernández', orderCount: 6, totalRevenue: 298800 },
  { customerId: 'mock-4', name: 'Diego Morales', orderCount: 5, totalRevenue: 254300 },
  { customerId: 'mock-5', name: 'Ana Torres', orderCount: 5, totalRevenue: 236100 },
];

const mockTopProducts: DashboardTopVariety[] = [
  { menuItemId: 'mock-1', name: 'Torta Chocolate', quantity: 128 },
  { menuItemId: 'mock-2', name: 'Cheesecake Frutos Rojos', quantity: 96 },
  { menuItemId: 'mock-3', name: 'Brownie Clásico', quantity: 84 },
  { menuItemId: 'mock-4', name: 'Torta Zanahoria', quantity: 76 },
  { menuItemId: 'mock-5', name: 'Alfajor de Maicena', quantity: 64 },
];

const mockRecentOrders: DashboardRecentOrder[] = [
  {
    id: '1246',
    customerName: 'María González',
    deliveryDate: '2026-05-19',
    deliveryTime: 'mediodia',
    status: 'confirmado',
    isPaid: false,
    total: 86400,
  },
  {
    id: '1245',
    customerName: 'Carlos Ramírez',
    deliveryDate: '2026-05-18',
    deliveryTime: 'tarde',
    status: 'preparado',
    isPaid: true,
    total: 72800,
  },
  {
    id: '1244',
    customerName: 'Lucía Fernández',
    deliveryDate: '2026-05-18',
    deliveryTime: 'noche',
    status: 'entregado',
    isPaid: true,
    total: 59800,
  },
  {
    id: '1243',
    customerName: 'Diego Morales',
    deliveryDate: '2026-05-17',
    deliveryTime: 'mediodia',
    status: 'confirmado',
    isPaid: false,
    total: 68100,
  },
  {
    id: '1242',
    customerName: 'Ana Torres',
    deliveryDate: '2026-05-17',
    deliveryTime: 'tarde',
    status: 'entregado',
    isPaid: true,
    total: 48300,
  },
];

const mockStatusSummary: DashboardStatusSummary = {
  confirmed: 9,
  inProduction: 8,
  ready: 6,
  delivered: 5,
  total: 28,
};

const dashboardRangeLabels: Record<DashboardRange, string> = {
  all: 'Siempre',
  last30: 'Últimos 30 días',
  last7: 'Últimos 7 días',
};

const dashboardRangeDescriptions: Record<DashboardRange, string> = {
  all: 'Histórico completo',
  last30: 'Últimos 30 días',
  last7: 'Últimos 7 días',
};

const dashboardRangeOptions: DashboardRange[] = ['all', 'last30', 'last7'];

type RangePillsProps = {
  value: DashboardRange;
  onChange: (value: DashboardRange) => void;
  ariaLabel: string;
};

const RangePills = ({ value, onChange, ariaLabel }: RangePillsProps) => (
  <div
    className="grid w-full grid-cols-3 gap-1 rounded-full bg-background p-1 ring-1 ring-border/70 sm:w-auto sm:min-w-[24rem]"
    aria-label={ariaLabel}
  >
    {dashboardRangeOptions.map((option) => {
      const isSelected = value === option;
      return (
        <button
          aria-pressed={isSelected}
          className={
            isSelected
              ? 'rounded-full bg-sidebar px-3 py-1.5 text-xs font-black text-white shadow-card'
              : 'rounded-full px-3 py-1.5 text-xs font-black text-muted-foreground transition hover:bg-white hover:text-foreground'
          }
          key={option}
          onClick={() => onChange(option)}
          type="button"
        >
          {dashboardRangeLabels[option]}
        </button>
      );
    })}
  </div>
);

type KpiCardProps = {
  label: string;
  value: string;
  trend: string;
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  tone: string;
  sparkline: number[];
};

const MiniSparkline = ({ values, tone }: { values: number[]; tone: string }) => {
  const max = Math.max(...values, 1);
  const points = values
    .map((value, index) => `${(index / (values.length - 1)) * 86 + 4},${34 - (value / max) * 24}`)
    .join(' ');

  return (
    <svg className="h-10 w-24" role="img" aria-label="Tendencia decorativa" viewBox="0 0 94 40">
      <polyline
        fill="none"
        points={points}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3"
        className={tone}
      />
    </svg>
  );
};

const KpiCard = ({ label, value, trend, icon: Icon, tone, sparkline }: KpiCardProps) => (
  <article className="group relative overflow-hidden rounded-[1.65rem] border border-white/80 bg-white/90 p-5 shadow-card transition duration-200 hover:-translate-y-1 hover:shadow-premium">
    <div className="pointer-events-none absolute -right-10 -top-12 size-28 rounded-full bg-gradient-to-br from-primary/10 to-accent/10 blur-2xl transition group-hover:scale-125" />
    <div className="relative flex items-start justify-between gap-4">
      <span className={`flex size-12 items-center justify-center rounded-2xl ring-1 ${tone}`}>
        <Icon className="size-5" aria-hidden />
      </span>
      <MiniSparkline
        values={sparkline}
        tone={
          tone.includes('emerald')
            ? 'text-emerald-600'
            : tone.includes('sky')
              ? 'text-sky-600'
              : tone.includes('amber')
                ? 'text-amber-600'
                : 'text-primary'
        }
      />
    </div>
    <p className="relative mt-5 text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">
      {label}
    </p>
    <p className="relative mt-2 text-2xl font-black tracking-tight text-foreground tabular-nums xl:text-3xl">
      {value}
    </p>
    <p className="relative mt-3 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
      <ChevronUp className="size-3.5" aria-hidden />
      {trend}
    </p>
  </article>
);

const SectionCard = ({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <section
    className={`rounded-[1.75rem] border border-white/80 bg-white/90 p-5 shadow-card backdrop-blur ${className}`}
  >
    {children}
  </section>
);

type DashboardChartMetric = 'revenue' | 'profit';

const chartMetricLabels: Record<DashboardChartMetric, { title: string; chip: string }> = {
  revenue: { title: 'Ventas en pesos', chip: 'Ventas' },
  profit: { title: 'Ganancia estimada', chip: 'Ganancia' },
};

const LineChartCard = ({
  days,
  metric,
  range,
}: {
  days: DashboardCalendarDay[];
  metric: DashboardChartMetric;
  range: DashboardRange;
}) => {
  const values = days.map((day) =>
    metric === 'profit' ? (day.estimatedProfit ?? day.revenue) : day.revenue,
  );
  const maxValue = Math.max(...values, 1);
  const hasData = values.some((value) => value > 0);
  const points = values
    .map(
      (value, index) =>
        `${(index / Math.max(values.length - 1, 1)) * 100},${92 - (value / maxValue) * 72}`,
    )
    .join(' ');
  const labelInterval = Math.max(1, Math.ceil(days.length / 7));
  const visibleLabels = days.filter(
    (_day, index) => index % labelInterval === 0 || index === days.length - 1,
  );

  return (
    <div className="rounded-[1.5rem] border border-border/70 bg-gradient-to-br from-white to-crema-maiz/50 p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="font-black text-foreground">
            {chartMetricLabels[metric].title} · {dashboardRangeDescriptions[range]}
          </h3>
          <p className="text-xs font-semibold text-muted-foreground">
            Cada punto usa la fecha de entrega dentro del rango seleccionado.
          </p>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary ring-1 ring-primary/15">
          {chartMetricLabels[metric].chip}
        </span>
      </div>
      {days.length === 0 || !hasData ? (
        <div className="grid h-56 place-items-center rounded-2xl border border-dashed border-border bg-white/65 text-center text-sm font-bold text-muted-foreground">
          Sin datos para graficar en este rango.
        </div>
      ) : (
        <>
          <svg
            className="h-56 w-full overflow-visible"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            role="img"
            aria-label={`Gráfico de línea de ${chartMetricLabels[metric].chip.toLowerCase()} para ${dashboardRangeLabels[range]}`}
          >
            {[20, 40, 60, 80].map((y) => (
              <line
                key={y}
                x1="0"
                x2="100"
                y1={y}
                y2={y}
                stroke="rgba(234,216,193,.85)"
                strokeWidth="0.45"
              />
            ))}
            <polyline
              points={`0,96 ${points} 100,96`}
              fill="rgba(181,74,50,.10)"
              stroke="none"
            />
            <polyline
              points={points}
              fill="none"
              stroke="#b54a32"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.7"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <div className="mt-3 flex justify-between gap-2 text-center text-[0.65rem] font-black uppercase text-muted-foreground">
            {visibleLabels.map((day) => (
              <span key={day.date}>{formatDateLabel(day.date)}</span>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const DonutChart = ({ summary }: { summary: DashboardStatusSummary }) => {
  const total = Math.max(summary.total, 1);
  const segments = [
    { label: 'Confirmados', value: summary.confirmed, color: '#17325c' },
    { label: 'En producción', value: summary.inProduction, color: '#b54a32' },
    { label: 'Listos', value: summary.ready, color: '#d28a2d' },
    { label: 'Entregados', value: summary.delivered, color: '#657447' },
  ];
  let offset = 25;

  return (
    <div className="grid gap-5 sm:grid-cols-[11rem_minmax(0,1fr)] sm:items-center xl:grid-cols-1">
      <div className="relative mx-auto size-44">
        <svg
          className="size-44 -rotate-90"
          viewBox="0 0 42 42"
          role="img"
          aria-label="Estado de pedidos"
        >
          <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#f3e7d1" strokeWidth="7" />
          {segments.map((segment) => {
            const dash = (segment.value / total) * 100;
            const circle = (
              <circle
                key={segment.label}
                cx="21"
                cy="21"
                r="15.915"
                fill="transparent"
                stroke={segment.color}
                strokeDasharray={`${dash} ${100 - dash}`}
                strokeDashoffset={offset}
                strokeWidth="7"
              />
            );
            offset -= dash;
            return circle;
          })}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">
              Total
            </p>
            <p className="text-3xl font-black text-foreground tabular-nums">{summary.total}</p>
          </div>
        </div>
      </div>
      <div className="grid gap-2">
        {segments.map((segment) => (
          <div
            className="flex items-center justify-between rounded-2xl bg-background px-3 py-2 ring-1 ring-border/70"
            key={segment.label}
          >
            <span className="flex items-center gap-2 text-sm font-bold text-foreground">
              <span className="size-2.5 rounded-full" style={{ backgroundColor: segment.color }} />
              {segment.label}
            </span>
            <span className="font-black tabular-nums text-foreground">{segment.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const OrderStatusChip = ({ status }: { status: OrderStatus }) => (
  <span
    className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-black ring-1 ${statusChipClass[status]}`}
  >
    {statusLabels[status]}
  </span>
);

export const DashboardPage = () => {
  const [date, setDate] = useState(today);
  const [dashboardRange, setDashboardRange] = useState<DashboardRange>('all');
  const [chartMetric, setChartMetric] = useState<DashboardChartMetric>('revenue');
  const dashboardQuery = useDailyDashboard({ date });
  const dashboard = dashboardQuery.data;
  const totals = dashboard?.totals;
  const hasBusinessData = Boolean(totals && totals.orderCount > 0);

  const lastSevenDays = dashboard?.lastSevenDays?.length
    ? dashboard.lastSevenDays
    : mockLastSevenDays;
  const selectedRangeAnalytics = dashboard?.rangeAnalytics?.[dashboardRange];
  const nextSevenDays = dashboard?.nextSevenDays?.length
    ? dashboard.nextSevenDays
    : mockNextSevenDays;
  const upcomingOrders = dashboard?.upcomingOrders ?? [];
  const topClients = dashboard
    ? (selectedRangeAnalytics?.topClients ?? dashboard.topClients)
    : mockTopClients;
  const topProducts = dashboard
    ? (selectedRangeAnalytics?.topVarieties ?? dashboard.varietySales?.[dashboardRange] ?? [])
    : mockTopProducts;
  const selectedRangeTotals =
    selectedRangeAnalytics?.totals ?? dashboard?.rangeTotals?.[dashboardRange] ?? totals;
  const chartDays = dashboard
    ? (selectedRangeAnalytics?.chartDays ?? (dashboardRange === 'last7' ? lastSevenDays : []))
    : lastSevenDays;
  const recentOrders = dashboard
    ? (selectedRangeAnalytics?.recentOrders ?? dashboard.recentOrders)
    : mockRecentOrders;
  const statusSummary = dashboard
    ? (selectedRangeAnalytics?.statusSummary ?? dashboard.statusSummary)
    : mockStatusSummary;

  const monthSales = hasBusinessData ? (selectedRangeTotals?.grossRevenue ?? 0) : 2_786_400;
  const netProfit = hasBusinessData ? (selectedRangeTotals?.estimatedProfit ?? 0) : 1_243_850;
  const totalOrders = hasBusinessData ? (selectedRangeTotals?.orderCount ?? 0) : 28;
  const pendingRevenue = hasBusinessData ? (selectedRangeTotals?.pendingRevenue ?? 0) : 612_300;
  const averageTicket = hasBusinessData ? (selectedRangeTotals?.averageTicket ?? 0) : 39_805;

  const kpis = useMemo(
    () => [
      {
        label: 'Ventas',
        value: formatMoney(monthSales),
        trend: dashboardRangeLabels[dashboardRange],
        icon: CircleDollarSign,
        tone: 'bg-primary/10 text-primary ring-primary/15',
        sparkline: [12, 18, 16, 24, 22, 31, 38],
      },
      {
        label: 'Ganancia neta',
        value: formatMoney(netProfit),
        trend: dashboardRangeLabels[dashboardRange],
        icon: TrendingUp,
        tone: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
        sparkline: [8, 12, 14, 18, 17, 24, 29],
      },
      {
        label: 'Pedidos totales',
        value: String(totalOrders),
        trend: dashboardRangeLabels[dashboardRange],
        icon: ClipboardList,
        tone: 'bg-sky-50 text-sky-700 ring-sky-100',
        sparkline: [5, 8, 7, 11, 14, 13, 16],
      },
      {
        label: 'Pendiente de cobrar',
        value: formatMoney(pendingRevenue),
        trend: dashboardRangeLabels[dashboardRange],
        icon: Wallet,
        tone: 'bg-amber-50 text-amber-700 ring-amber-100',
        sparkline: [18, 17, 20, 16, 14, 15, 12],
      },
      {
        label: 'Ticket promedio',
        value: formatMoney(averageTicket),
        trend: dashboardRangeLabels[dashboardRange],
        icon: CreditCard,
        tone: 'bg-indigo-50 text-indigo-700 ring-indigo-100',
        sparkline: [9, 10, 13, 12, 15, 17, 19],
      },
    ],
    [averageTicket, dashboardRange, monthSales, netProfit, pendingRevenue, totalOrders],
  );

  return (
    <div className="animate-fade-in space-y-7 pb-4">
      <header className="relative overflow-hidden rounded-[2rem] border border-white/60 bg-sidebar p-5 text-white shadow-premium md:p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(210,138,45,.28),transparent_18rem),radial-gradient(circle_at_90%_20%,rgba(181,74,50,.22),transparent_16rem)]" />
        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-crema-maiz ring-1 ring-white/10">
              <Gauge className="size-3.5" aria-hidden /> Centro operativo
            </p>
            <h1 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">Dashboard</h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold text-sidebar-muted md:text-base">
              Resumen de tu negocio al día de hoy.
            </p>
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(12rem,.8fr)_minmax(18rem,1fr)_auto_auto] lg:items-center">
            <label className="grid gap-1.5 text-xs font-black uppercase tracking-wide text-sidebar-muted">
              Fecha del dashboard · rango de fechas
              <input
                className="min-h-11 rounded-2xl border border-white/15 bg-white px-4 text-sm font-black text-sidebar outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/25"
                onChange={(event) => setDate(event.target.value)}
                type="date"
                value={date}
              />
            </label>
            <label className="grid gap-1.5 text-xs font-black uppercase tracking-wide text-sidebar-muted">
              Buscar
              <span className="flex min-h-11 items-center gap-2 rounded-2xl border border-white/15 bg-white px-4 text-sidebar shadow-card">
                <Search className="size-4 text-muted-foreground" aria-hidden />
                <input
                  className="min-w-0 flex-1 border-0 bg-transparent text-sm font-semibold outline-none placeholder:text-muted-foreground"
                  placeholder="Buscar pedidos, clientes, productos…"
                  type="search"
                />
              </span>
            </label>
            <button
              className="relative inline-flex min-h-11 items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-4 text-white transition hover:bg-white/15"
              type="button"
              aria-label="Notificaciones"
            >
              <Bell className="size-5" aria-hidden />
              <span className="absolute -right-1 -top-1 rounded-full bg-primary px-1.5 text-[10px] font-black text-white">
                3
              </span>
            </button>
            <Link
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-black text-white shadow-primary-glow transition hover:bg-primary/90 active:scale-[0.98]"
              to="/orders"
            >
              <Plus className="size-4" aria-hidden /> Nuevo pedido
            </Link>
          </div>
        </div>
      </header>

      {dashboardQuery.isLoading ? (
        <p className="rounded-2xl border border-border/70 bg-white/85 px-4 py-3 text-sm font-semibold text-muted-foreground shadow-card">
          Cargando dashboard...
        </p>
      ) : null}
      {dashboardQuery.isError ? (
        <p className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
          No se pudo cargar el dashboard. Mostrando estructura de referencia para no frenar la
          operación.
        </p>
      ) : null}

      <section className="space-y-3" aria-label="Indicadores principales">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">
            Rango de análisis
          </p>
          <RangePills
            ariaLabel="Rango de análisis del dashboard"
            value={dashboardRange}
            onChange={setDashboardRange}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {kpis.map((kpi) => (
            <KpiCard key={kpi.label} {...kpi} />
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(22rem,.75fr)]">
        <div className="space-y-6">
          <SectionCard>
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-primary">
                  <LineChart className="size-4" aria-hidden /> Centro de decisión
                </p>
                <h2 className="mt-1 text-2xl font-black tracking-tight text-foreground">
                  Resumen general
                </h2>
                <p className="mt-1 text-sm font-semibold text-muted-foreground">
                  Ventas, ganancia y ritmo de pedidos.
                </p>
              </div>
              <div
                className="grid grid-cols-2 rounded-full bg-background p-1 ring-1 ring-border/70"
                aria-label="Métrica del gráfico"
              >
                {(['revenue', 'profit'] as DashboardChartMetric[]).map((metric) => {
                  const isSelected = chartMetric === metric;
                  return (
                    <button
                      aria-pressed={isSelected}
                      className={
                        isSelected
                          ? 'rounded-full bg-sidebar px-4 py-2 text-xs font-black text-white shadow-card'
                          : 'rounded-full px-4 py-2 text-xs font-black text-muted-foreground transition hover:bg-white hover:text-foreground'
                      }
                      key={metric}
                      onClick={() => setChartMetric(metric)}
                      type="button"
                    >
                      {metric === 'revenue' ? 'Ventas' : 'Ganancia'}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid gap-4">
              <LineChartCard days={chartDays} metric={chartMetric} range={dashboardRange} />
            </div>
          </SectionCard>

          <section className="grid gap-6 lg:grid-cols-2">
            <SectionCard>
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-primary">
                    <Trophy className="size-4" aria-hidden /> Top clientes
                  </p>
                  <h2 className="mt-1 text-xl font-black text-foreground">
                    Ranking por facturación
                  </h2>
                </div>
                <Users className="size-8 text-primary/30" aria-hidden />
              </div>
              <div className="grid gap-3">
                {topClients.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-border bg-background/70 p-4 text-center text-sm font-bold text-muted-foreground">
                    Sin clientes para {dashboardRangeLabels[dashboardRange].toLowerCase()}.
                  </p>
                ) : (
                  topClients.slice(0, 5).map((client, index) => (
                    <Link
                      className="flex items-center justify-between gap-3 rounded-2xl bg-background px-3 py-3 ring-1 ring-border/70 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-card"
                      key={client.customerId}
                      to={`/customers?customerId=${encodeURIComponent(client.customerId)}`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-sidebar text-xs font-black text-white">
                          #{index + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-black text-foreground">{client.name}</p>
                          <p className="text-xs font-bold text-muted-foreground">
                            {client.orderCount} pedidos
                          </p>
                        </div>
                      </div>
                      <span className="whitespace-nowrap rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
                        {formatMoney(client.totalRevenue)}
                      </span>
                    </Link>
                  ))
                )}
              </div>
            </SectionCard>

            <SectionCard>
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-primary">
                    <ShoppingBag className="size-4" aria-hidden /> Productos más vendidos
                  </p>
                  <h2 className="mt-1 text-xl font-black text-foreground">Ranking de productos</h2>
                </div>
                <span className="rounded-full bg-background px-3 py-1.5 text-xs font-black text-muted-foreground ring-1 ring-border/70">
                  {dashboardRangeLabels[dashboardRange]}
                </span>
              </div>
              <div className="grid gap-3">
                {topProducts.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-border bg-background/70 p-4 text-center text-sm font-bold text-muted-foreground">
                    Sin ventas para este rango.
                  </p>
                ) : (
                  topProducts.slice(0, 5).map((product, index) => (
                    <div
                      className="flex items-center justify-between gap-3 rounded-2xl bg-background px-3 py-3 ring-1 ring-border/70"
                      key={product.menuItemId}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary/15 to-accent/20 text-lg">
                          🍰
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-black text-foreground">{product.name}</p>
                          <p className="text-xs font-bold text-muted-foreground">
                            Puesto #{index + 1}
                          </p>
                        </div>
                      </div>
                      <span className="whitespace-nowrap rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary ring-1 ring-primary/15">
                        {product.quantity} unidades
                      </span>
                    </div>
                  ))
                )}
              </div>
            </SectionCard>
          </section>
        </div>

        <aside className="space-y-6">
          <SectionCard>
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-primary">
                  <PackageCheck className="size-4" aria-hidden /> Estado de pedidos
                </p>
                <h2 className="mt-1 text-xl font-black text-foreground">Producción y entregas</h2>
              </div>
            </div>
            <DonutChart summary={statusSummary} />
          </SectionCard>

          <SectionCard>
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-primary">
                  <Clock3 className="size-4" aria-hidden /> Próximas entregas
                </p>
                <h2 className="mt-1 text-xl font-black text-foreground">Agenda inmediata</h2>
              </div>
              <Link className="text-xs font-black text-primary" to="/orders">
                Ver todo
              </Link>
            </div>
            <div className="grid gap-3">
              {upcomingOrders.length ? (
                upcomingOrders.slice(0, 5).map((order) => (
                  <Link
                    className="block rounded-2xl bg-background p-3 ring-1 ring-border/70 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-card"
                    key={order.id}
                    to={`/orders?orderId=${encodeURIComponent(order.id)}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-black text-foreground">{order.customerName}</p>
                        <p className="mt-1 text-xs font-bold text-muted-foreground">
                          Pedido {getDashboardOrderCode(order.id)} ·{' '}
                          {formatDateLabel(order.deliveryDate)}
                        </p>
                      </div>
                      <OrderStatusChip status={order.status} />
                    </div>
                    <p className="mt-2 flex items-center gap-2 text-sm font-black text-sidebar">
                      <Clock3 className="size-4" aria-hidden />{' '}
                      {deliveryTextLabels[order.deliveryTime]}
                    </p>
                  </Link>
                ))
              ) : (
                <article className="rounded-2xl border border-dashed border-border bg-background/70 p-4 text-center">
                  <p className="font-black text-foreground">Sin próximas entregas reales</p>
                  <p className="mt-1 text-xs font-bold text-muted-foreground">
                    Cuando haya pedidos activos con fecha futura, van a aparecer acá
                    automáticamente.
                  </p>
                </article>
              )}
            </div>
          </SectionCard>
        </aside>
      </section>

      <SectionCard>
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-primary">
              <CalendarDays className="size-4" aria-hidden /> Calendario semanal
            </p>
            <h2 className="mt-1 text-2xl font-black text-foreground">Próximos 7 días</h2>
          </div>
          <p className="text-sm font-bold text-muted-foreground">Pedidos y venta estimada</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
          {nextSevenDays.map((day) => {
            const dateObj = parseLocalDate(day.date);
            const isToday = day.date === today();
            return (
              <article
                className={`rounded-2xl border p-4 ${isToday ? 'border-primary/30 bg-primary/10 ring-2 ring-primary/10' : 'border-border/70 bg-background'}`}
                key={day.date}
              >
                <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">
                  {isToday ? 'Hoy' : weekdayFormatter.format(dateObj)}
                </p>
                <p className="mt-1 font-black text-foreground">{formatDateLabel(day.date)}</p>
                <p className="mt-4 text-2xl font-black text-sidebar tabular-nums">{day.count}</p>
                <p className="text-xs font-bold text-muted-foreground">pedidos</p>
                <p className="mt-3 rounded-full bg-white px-3 py-1 text-xs font-black text-primary ring-1 ring-border/70">
                  {formatMoney(day.revenue)}
                </p>
              </article>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard>
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-primary">
              <Sparkles className="size-4" aria-hidden /> Últimos pedidos
            </p>
            <h2 className="mt-1 text-2xl font-black text-foreground">Actividad reciente</h2>
          </div>
          <Link
            className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-black text-primary transition hover:bg-muted"
            to="/orders"
          >
            Abrir pedidos <ArrowUpRight className="size-4" aria-hidden />
          </Link>
        </div>
        <div className="overflow-hidden rounded-2xl border border-border/70">
          <div className="overflow-x-auto">
            <table className="min-w-[720px] w-full border-collapse bg-white text-left text-sm">
              <thead className="bg-sidebar text-xs uppercase tracking-wide text-crema-maiz">
                <tr>
                  <th className="px-4 py-3 font-black">Pedido</th>
                  <th className="px-4 py-3 font-black">Cliente</th>
                  <th className="px-4 py-3 font-black">Fecha</th>
                  <th className="px-4 py-3 font-black">Total</th>
                  <th className="px-4 py-3 font-black">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {recentOrders.length === 0 ? (
                  <tr>
                    <td
                      className="px-4 py-6 text-center text-sm font-bold text-muted-foreground"
                      colSpan={5}
                    >
                      Sin pedidos recientes para {dashboardRangeLabels[dashboardRange].toLowerCase()}.
                    </td>
                  </tr>
                ) : (
                  recentOrders.slice(0, 8).map((order) => {
                    const orderHref = `/orders?orderId=${encodeURIComponent(order.id)}`;
                    return (
                      <tr className="transition hover:bg-background" key={order.id}>
                        <td className="p-0 font-black text-sidebar">
                          <Link className="block px-4 py-3" to={orderHref}>
                            {getDashboardOrderCode(order.id)}
                          </Link>
                        </td>
                        <td className="p-0 font-semibold text-foreground">
                          <Link className="block px-4 py-3" to={orderHref}>
                            {order.customerName}
                          </Link>
                        </td>
                        <td className="p-0 font-semibold text-muted-foreground">
                          <Link className="block px-4 py-3" to={orderHref}>
                            {formatFullDateLabel(order.deliveryDate)} ·{' '}
                            {deliveryTextLabels[order.deliveryTime]}
                          </Link>
                        </td>
                        <td className="p-0 font-black text-foreground tabular-nums">
                          <Link className="block px-4 py-3" to={orderHref}>
                            {formatCompactMoney(order.total)}
                          </Link>
                        </td>
                        <td className="p-0">
                          <Link className="block px-4 py-3" to={orderHref}>
                            <OrderStatusChip status={order.status} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
        {hasBusinessData ? null : (
          <p className="mt-3 flex items-center gap-2 text-xs font-bold text-muted-foreground">
            <CheckCircle2 className="size-4 text-success" aria-hidden /> Algunos bloques usan datos
            de muestra ordenados para reemplazarlos fácilmente cuando exista más información real.
          </p>
        )}
      </SectionCard>
    </div>
  );
};
