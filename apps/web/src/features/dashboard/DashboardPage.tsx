import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  ReceiptText,
  Search,
  ShoppingBasket,
  TrendingUp,
  Trophy,
  Truck,
  Wallet,
} from 'lucide-react';

import type { DeliveryTime } from '@te-pinta/shared';

import { PageHero } from '@/components/layout/PageHero';

import { useDailyDashboard } from './dashboard-hooks';

const deliveryLabels: Record<DeliveryTime, string> = {
  mediodia: 'Mediodía',
  tarde: 'Tarde',
  noche: 'Noche',
};

const weekdayFormatter = new Intl.DateTimeFormat('es-AR', { weekday: 'short' });
const dateFormatter = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' });

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

const formatMoney = (value: number): string => `$ ${Math.round(value).toLocaleString('es-AR')}`;
const formatDateLabel = (date: string): string => dateFormatter.format(parseLocalDate(date));

const kpiCardClassName =
  'relative overflow-hidden rounded-3xl border border-border/70 bg-white/90 p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-soft';

export const DashboardPage = () => {
  const [date, setDate] = useState(today);
  const dashboardQuery = useDailyDashboard({ date });
  const dashboard = dashboardQuery.data;
  const totals = dashboard?.totals;
  const maxCalendarCount = Math.max(1, ...(dashboard?.nextSevenDays?.map((day) => day.count) ?? [0]));
  const maxShiftCount = Math.max(1, ...(dashboard ? Object.values(dashboard.deliveryShifts) : [0]));

  const alerts = [
    ...(totals && totals.unpaidOrderCount > 0
      ? [
          {
            label: `${totals.unpaidOrderCount} pedido(s) sin pagar`,
            detail: `${formatMoney(totals.pendingRevenue)} pendientes de cobrar.`,
            tone: 'border-amber-200 bg-amber-50 text-amber-800',
          },
        ]
      : []),
    ...(totals && totals.activeOrderCount > 0
      ? [
          {
            label: `${totals.activeOrderCount} pedido(s) activos`,
            detail: 'Seguimiento de producción, entregas y cobros pendientes.',
            tone: 'border-primary/20 bg-primary/8 text-primary',
          },
        ]
      : []),
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <PageHero
        eyebrow="Centro operativo"
        title="Dashboard"
        description="Ventas, costos, ganancias, clientes principales y agenda real de Te Pinta."
      >
        <div className="w-full rounded-3xl border border-white/10 bg-white/10 p-2 shadow-inner backdrop-blur sm:w-auto">
          <div className="grid gap-2 sm:grid-cols-[minmax(13rem,1fr)_auto] sm:items-center">
            <label className="grid gap-1.5 rounded-2xl bg-sidebar/20 px-3 py-2 text-xs font-black uppercase tracking-wide text-sidebar-muted sm:grid-cols-[auto_minmax(11rem,1fr)] sm:items-center sm:gap-3">
              <span className="whitespace-nowrap">Fecha del dashboard</span>
              <input
                className="w-full min-w-0 rounded-full border border-white/15 bg-white px-4 py-2.5 text-sm font-black text-sidebar outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/20"
                onChange={(event) => setDate(event.target.value)}
                type="date"
                value={date}
              />
            </label>
            <Link
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-black text-white shadow-primary-glow transition hover:bg-primary/90 active:scale-[0.98]"
              to="/orders"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              Buscar pedido
            </Link>
          </div>
        </div>
      </PageHero>

      {dashboardQuery.isLoading ? (
        <p className="rounded-2xl border border-border/70 bg-white/85 px-4 py-3 text-sm font-semibold text-muted-foreground shadow-card">
          Cargando dashboard...
        </p>
      ) : null}

      {dashboardQuery.isError ? (
        <p className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
          No se pudo cargar el dashboard.
        </p>
      ) : null}

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <article className={kpiCardClassName}>
          <ClipboardList className="h-6 w-6 text-primary" aria-hidden="true" />
          <p className="mt-4 text-xs font-black uppercase tracking-wide text-muted-foreground">
            Pedidos totales
          </p>
          <p className="mt-1 text-3xl font-black tabular-nums text-foreground">
            {totals?.orderCount ?? 0}
          </p>
          <p className="mt-2 text-xs font-bold text-muted-foreground">
            {dashboard?.orderCount ?? 0} para {formatDateLabel(date)}.
          </p>
        </article>

        <article className={kpiCardClassName}>
          <CircleDollarSign className="h-6 w-6 text-emerald-700" aria-hidden="true" />
          <p className="mt-4 text-xs font-black uppercase tracking-wide text-muted-foreground">
            Bruto vendido
          </p>
          <p className="mt-1 text-3xl font-black tabular-nums text-foreground">
            {formatMoney(totals?.grossRevenue ?? 0)}
          </p>
          <p className="mt-2 text-xs font-bold text-muted-foreground">
            Cobrado: {formatMoney(totals?.paidRevenue ?? 0)}.
          </p>
        </article>

        <article className={kpiCardClassName}>
          <TrendingUp className="h-6 w-6 text-primary" aria-hidden="true" />
          <p className="mt-4 text-xs font-black uppercase tracking-wide text-muted-foreground">
            Ganancia estimada
          </p>
          <p className="mt-1 text-3xl font-black tabular-nums text-foreground">
            {formatMoney(totals?.estimatedProfit ?? 0)}
          </p>
          <p className="mt-2 text-xs font-bold text-muted-foreground">
            Costos: {formatMoney(totals?.estimatedCosts ?? 0)}.
          </p>
        </article>

        <article className={kpiCardClassName}>
          <Wallet className="h-6 w-6 text-amber-700" aria-hidden="true" />
          <p className="mt-4 text-xs font-black uppercase tracking-wide text-muted-foreground">
            Pendiente de cobrar
          </p>
          <p className="mt-1 text-3xl font-black tabular-nums text-foreground">
            {formatMoney(totals?.pendingRevenue ?? 0)}
          </p>
          <p className="mt-2 text-xs font-bold text-muted-foreground">
            Ticket prom.: {formatMoney(totals?.averageTicket ?? 0)}.
          </p>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(22rem,0.65fr)]">
        <div className="space-y-6">
          <section className="grid gap-6 lg:grid-cols-3">
            <article className="rounded-3xl border border-border/70 bg-white/90 p-5 shadow-card lg:col-span-2">
              <div className="flex items-center gap-2">
                <ReceiptText className="h-5 w-5 text-primary" aria-hidden="true" />
                <h2 className="text-lg font-black text-foreground">Resumen financiero</h2>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {[
                  ['Venta bruta', totals?.grossRevenue ?? 0],
                  ['Cobrado', totals?.paidRevenue ?? 0],
                  ['Costos estimados', totals?.estimatedCosts ?? 0],
                  ['Ganancia estimada', totals?.estimatedProfit ?? 0],
                ].map(([label, value]) => (
                  <div className="rounded-2xl bg-background px-4 py-3 ring-1 ring-border/70" key={label}>
                    <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">
                      {label}
                    </p>
                    <p className="mt-1 text-xl font-black tabular-nums text-foreground">
                      {formatMoney(Number(value))}
                    </p>
                  </div>
                ))}
              </div>
              <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-xs font-bold text-amber-800 ring-1 ring-amber-100">
                Los costos se estiman con el costo por docena de cada variedad. Gastos manuales o compras todavía no están cargados en la app nueva.
              </p>
            </article>

            <article className="rounded-3xl border border-border/70 bg-white/90 p-5 shadow-card">
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" aria-hidden="true" />
                <h2 className="text-lg font-black text-foreground">Franjas</h2>
              </div>
              <div className="mt-5 grid gap-3">
                {(['mediodia', 'tarde', 'noche'] as DeliveryTime[]).map((shift) => {
                  const count = dashboard?.deliveryShifts[shift] ?? 0;
                  return (
                    <div className="rounded-2xl bg-background p-3 ring-1 ring-border/70" key={shift}>
                      <div className="flex items-center justify-between text-sm font-black">
                        <span className="text-foreground">{deliveryLabels[shift]}</span>
                        <span className="text-primary">{count}</span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-white ring-1 ring-border/60">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${Math.round((count / maxShiftCount) * 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          </section>

          <section className="rounded-3xl border border-border/70 bg-white/90 p-5 shadow-card">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-black text-foreground">Calendario cercano</h2>
                <p className="mt-1 text-sm font-medium text-muted-foreground">
                  Próximos 7 días con volumen y venta estimada.
                </p>
              </div>
              <Link
                className="rounded-full border border-border bg-card px-4 py-2 text-sm font-black text-primary transition hover:bg-muted/50"
                to="/orders"
              >
                Ver agenda
              </Link>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
              {(dashboard?.nextSevenDays ?? []).map((day, index) => {
                const isToday = day.date === today();
                const height = Math.max(10, Math.round((day.count / maxCalendarCount) * 58));

                return (
                  <article
                    className={`rounded-2xl border p-3 shadow-sm ${
                      isToday
                        ? 'border-primary/30 bg-primary/8 ring-2 ring-primary/10'
                        : 'border-border/70 bg-background'
                    }`}
                    key={day.date}
                  >
                    <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">
                      {isToday ? 'Hoy' : weekdayFormatter.format(parseLocalDate(day.date))}
                    </p>
                    <p className="mt-1 text-sm font-black text-foreground">
                      {formatDateLabel(day.date)}
                    </p>
                    <div className="mt-3 flex h-16 items-end rounded-2xl bg-white/70 p-1 ring-1 ring-border/60">
                      <div
                        className={`w-full rounded-xl ${isToday ? 'bg-primary' : 'bg-sky-500'}`}
                        style={{ height }}
                      />
                    </div>
                    <p className="mt-2 text-sm font-black text-foreground">
                      {day.count} pedido{day.count === 1 ? '' : 's'}
                    </p>
                    <p className="text-xs font-bold text-muted-foreground">
                      {formatMoney(day.revenue)}
                    </p>
                    {index === 1 && day.count > 0 ? (
                      <span className="mt-2 inline-flex rounded-full bg-amber-500 px-2 py-1 text-[0.65rem] font-black text-white">
                        Mañana
                      </span>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <article className="rounded-3xl border border-border/70 bg-white/90 p-5 shadow-card">
              <div className="flex items-center gap-2">
                <ShoppingBasket className="h-5 w-5 text-primary" aria-hidden="true" />
                <h2 className="text-lg font-black text-foreground">Top variedades del día</h2>
              </div>
              <div className="mt-5 grid gap-3">
                {dashboard?.topVarieties.length ? (
                  dashboard.topVarieties.slice(0, 6).map((variety, index) => (
                    <div
                      className="flex items-center justify-between gap-3 rounded-2xl bg-background px-3 py-2 ring-1 ring-border/70"
                      key={variety.menuItemId}
                    >
                      <div className="min-w-0">
                        <p className="truncate font-black text-foreground">{variety.name}</p>
                        <p className="text-xs font-bold text-muted-foreground">#{index + 1}</p>
                      </div>
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary">
                        {variety.quantity} u.
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="rounded-2xl bg-background px-4 py-3 text-sm font-semibold text-muted-foreground ring-1 ring-border/70">
                    No hay variedades para esta fecha.
                  </p>
                )}
              </div>
            </article>

            <article className="rounded-3xl border border-border/70 bg-white/90 p-5 shadow-card">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" aria-hidden="true" />
                <h2 className="text-lg font-black text-foreground">Mejores clientes</h2>
              </div>
              <div className="mt-5 grid gap-3">
                {dashboard?.topClients?.length ? (
                  dashboard.topClients.map((client, index) => (
                    <div
                      className="flex items-center justify-between gap-3 rounded-2xl bg-background px-3 py-2 ring-1 ring-border/70"
                      key={client.customerId}
                    >
                      <div className="min-w-0">
                        <p className="truncate font-black text-foreground">{client.name}</p>
                        <p className="text-xs font-bold text-muted-foreground">
                          #{index + 1} · {client.orderCount} pedidos
                        </p>
                      </div>
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
                        {formatMoney(client.totalRevenue)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="rounded-2xl bg-background px-4 py-3 text-sm font-semibold text-muted-foreground ring-1 ring-border/70">
                    Todavía no hay clientes con ventas.
                  </p>
                )}
              </div>
            </article>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-3xl border border-border/70 bg-white/90 p-5 shadow-card">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-primary" aria-hidden="true" />
              <h2 className="text-lg font-black text-foreground">Alertas operativas</h2>
            </div>
            <div className="mt-5 grid gap-3">
              {alerts.length ? (
                alerts.map((alert) => (
                  <article className={`rounded-2xl border px-3 py-3 ${alert.tone}`} key={alert.label}>
                    <p className="font-black">{alert.label}</p>
                    <p className="mt-1 text-xs font-bold opacity-80">{alert.detail}</p>
                  </article>
                ))
              ) : (
                <article className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-emerald-700">
                  <p className="flex items-center gap-2 font-black">
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    Sin alertas críticas
                  </p>
                  <p className="mt-1 text-xs font-bold opacity-80">Todo listo para operar.</p>
                </article>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-border/70 bg-white/90 p-5 shadow-card">
            <div className="flex items-center gap-2">
              <Clock3 className="h-5 w-5 text-primary" aria-hidden="true" />
              <h2 className="text-lg font-black text-foreground">Próximos pedidos</h2>
            </div>
            <div className="mt-5 grid gap-3">
              {dashboard?.upcomingOrders?.length ? (
                dashboard.upcomingOrders.map((order) => (
                  <article className="rounded-2xl bg-background px-3 py-3 ring-1 ring-border/70" key={order.id}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="min-w-0 truncate font-black text-foreground">
                        {order.customerName}
                      </p>
                      <p className="font-black tabular-nums text-foreground">
                        {formatMoney(order.total)}
                      </p>
                    </div>
                    <p className="mt-1 text-xs font-bold text-muted-foreground">
                      {formatDateLabel(order.deliveryDate)} · {deliveryLabels[order.deliveryTime]}
                    </p>
                  </article>
                ))
              ) : (
                <p className="rounded-2xl bg-background px-4 py-3 text-sm font-semibold text-muted-foreground ring-1 ring-border/70">
                  No hay pedidos activos próximos.
                </p>
              )}
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
};
