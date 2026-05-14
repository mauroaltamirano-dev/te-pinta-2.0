import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  PackagePlus,
  Search,
  ShoppingBasket,
  Sparkles,
  TrendingUp,
  Truck,
  Users,
  Wheat,
} from 'lucide-react';

import type { DeliveryTime, OrderStatus } from '@te-pinta/shared';

import { useCustomers } from '../customers/customers-hooks';
import { useIngredients } from '../ingredients/ingredients-hooks';
import { useMenuItems } from '../menu/menu-hooks';
import { useOrders } from '../orders/orders-hooks';
import { useDailyDashboard } from './dashboard-hooks';

const deliveryLabels: Record<DeliveryTime, string> = {
  mediodia: 'Mediodía',
  tarde: 'Tarde',
  noche: 'Noche',
};

const statusLabels: Record<OrderStatus, string> = {
  confirmado: 'Confirmado',
  preparado: 'Preparado',
  entregado: 'Entregado',
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

const addDays = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const today = (): string => toLocalIsoDate(new Date());

const formatMoney = (value: number): string => `$ ${Math.round(value).toLocaleString('es-AR')}`;

const formatDateLabel = (date: string): string => dateFormatter.format(parseLocalDate(date));

const isFinalized = (order: { status: OrderStatus; isPaid: boolean }) =>
  order.status === 'entregado' && order.isPaid;

const kpiCardClassName =
  'rounded-2xl border border-border/70 bg-white/85 p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-soft';

export const DashboardPage = () => {
  const [date, setDate] = useState(today);
  const dashboardQuery = useDailyDashboard({ date });
  const ordersQuery = useOrders();
  const customersQuery = useCustomers();
  const menuQuery = useMenuItems();
  const ingredientsQuery = useIngredients();

  const dashboard = dashboardQuery.data;
  const orders = ordersQuery.data ?? [];
  const customers = customersQuery.data ?? [];
  const menuItems = menuQuery.data ?? [];
  const ingredients = ingredientsQuery.data ?? [];
  const todayIso = today();
  const tomorrowIso = toLocalIsoDate(addDays(new Date(), 1));

  const operations = useMemo(() => {
    const activeOrders = orders.filter((order) => !isFinalized(order));
    const unpaidOrders = orders.filter((order) => !order.isPaid);
    const overdueOrders = activeOrders.filter((order) => order.deliveryDate < todayIso);
    const todayOrders = orders.filter((order) => order.deliveryDate === todayIso);
    const tomorrowOrders = orders.filter((order) => order.deliveryDate === tomorrowIso);
    const selectedDateOrders = orders.filter((order) => order.deliveryDate === date);
    const nextSevenDays = Array.from({ length: 7 }, (_, index) => {
      const currentDate = toLocalIsoDate(addDays(new Date(), index));
      const dayOrders = orders.filter((order) => order.deliveryDate === currentDate);
      return {
        date: currentDate,
        count: dayOrders.length,
        revenue: dayOrders.reduce((total, order) => total + order.total, 0),
      };
    });
    const maxCalendarCount = Math.max(1, ...nextSevenDays.map((day) => day.count));
    const unpaidTotal = unpaidOrders.reduce((total, order) => total + order.total, 0);
    const selectedDateUnits = selectedDateOrders.reduce(
      (total, order) => total + order.totalQuantity,
      0,
    );

    return {
      activeOrders,
      overdueOrders,
      selectedDateOrders,
      selectedDateUnits,
      todayOrders,
      tomorrowOrders,
      unpaidOrders,
      unpaidTotal,
      nextSevenDays,
      maxCalendarCount,
    };
  }, [date, orders, todayIso, tomorrowIso]);

  const alerts = useMemo(() => {
    const items: { label: string; detail: string; tone: string }[] = [];

    if (operations.overdueOrders.length > 0) {
      items.push({
        label: `${operations.overdueOrders.length} pedido(s) vencidos`,
        detail: 'Revisar entregas pendientes de fechas anteriores.',
        tone: 'border-red-200 bg-red-50 text-red-700',
      });
    }
    if (operations.unpaidOrders.length > 0) {
      items.push({
        label: `${operations.unpaidOrders.length} pedido(s) sin pagar`,
        detail: `${formatMoney(operations.unpaidTotal)} pendientes de cobrar.`,
        tone: 'border-amber-200 bg-amber-50 text-amber-800',
      });
    }
    if (operations.todayOrders.length > 0) {
      items.push({
        label: `${operations.todayOrders.length} pedido(s) para hoy`,
        detail: 'Prioridad operativa del día.',
        tone: 'border-primary/20 bg-primary/8 text-primary',
      });
    }
    if (ingredients.length === 0) {
      items.push({
        label: 'Sin ingredientes cargados',
        detail: 'Completá insumos para controlar costos.',
        tone: 'border-sky-200 bg-sky-50 text-sky-800',
      });
    }

    return items.slice(0, 4);
  }, [ingredients.length, operations]);

  const topUpcomingOrders = operations.activeOrders
    .slice()
    .sort(
      (a, b) =>
        a.deliveryDate.localeCompare(b.deliveryDate) ||
        a.deliveryTime.localeCompare(b.deliveryTime) ||
        a.customer.name.localeCompare(b.customer.name, 'es-AR'),
    )
    .slice(0, 5);

  const quickActions = [
    { label: 'Nuevo pedido', href: '/orders', icon: PackagePlus, hint: 'Cargar venta' },
    {
      label: 'Ver pedidos',
      href: '/orders',
      icon: ClipboardList,
      hint: 'Agenda y estados',
    },
    { label: 'Menú', href: '/menu', icon: ShoppingBasket, hint: 'Variedades' },
    { label: 'Clientes', href: '/customers', icon: Users, hint: 'Historial' },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-border/70 bg-sidebar p-5 text-card shadow-premium sm:p-6">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 12% -20%, rgba(210, 138, 45, 0.34), transparent 16rem), radial-gradient(circle at 92% 10%, rgba(181, 74, 50, 0.24), transparent 14rem), linear-gradient(135deg, rgba(255,248,239,0.08), rgba(0,0,0,0.12))',
          }}
        />
        <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-sidebar-muted ring-1 ring-white/10">
              <Sparkles className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
              Centro operativo
            </p>
            <h1 className="mt-3 font-display text-3xl font-black tracking-tight text-white sm:text-4xl">
              Dashboard
            </h1>
            <p className="mt-2 max-w-3xl text-sm font-semibold text-sidebar-muted sm:text-base">
              Ventas, pedidos críticos, calendario cercano y accesos rápidos para operar sin perder
              contexto.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-[auto_auto] sm:items-end">
            <label className="text-sm font-black text-white">
              Fecha del dashboard
              <input
                className="mt-2 w-full rounded-full border border-white/10 bg-white px-4 py-3 text-sm font-black text-sidebar outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/20 sm:w-52"
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
      </section>

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
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ClipboardList className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">
                Pedidos del día
              </p>
              <p className="text-2xl font-black text-foreground tabular-nums">
                {dashboard?.orderCount ?? operations.selectedDateOrders.length}
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs font-bold text-muted-foreground">
            {operations.selectedDateUnits} unidades para {formatDateLabel(date)}.
          </p>
        </article>

        <article className={kpiCardClassName}>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <CircleDollarSign className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">
                Facturación
              </p>
              <p className="text-2xl font-black text-foreground tabular-nums">
                {formatMoney(dashboard?.totalRevenue ?? 0)}
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs font-bold text-muted-foreground">
            Total estimado del día seleccionado.
          </p>
        </article>

        <article className={kpiCardClassName}>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-800">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">
                Alertas
              </p>
              <p className="text-2xl font-black text-foreground tabular-nums">{alerts.length}</p>
            </div>
          </div>
          <p className="mt-3 text-xs font-bold text-muted-foreground">
            {operations.unpaidOrders.length} sin pagar · {operations.overdueOrders.length} vencidos.
          </p>
        </article>

        <article className={kpiCardClassName}>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-700">
              <TrendingUp className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">
                Base activa
              </p>
              <p className="text-2xl font-black text-foreground tabular-nums">
                {customers.length +
                  menuItems.filter((item) => item.isActive).length +
                  ingredients.length}
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs font-bold text-muted-foreground">
            Clientes, variedades activas e insumos.
          </p>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(22rem,0.75fr)]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-border/70 bg-white/85 p-4 shadow-card sm:p-5">
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
              {operations.nextSevenDays.map((day, index) => {
                const isToday = day.date === todayIso;
                const height = Math.max(
                  10,
                  Math.round((day.count / operations.maxCalendarCount) * 58),
                );

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
            <article className="rounded-2xl border border-border/70 bg-white/85 p-4 shadow-card sm:p-5">
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" aria-hidden="true" />
                <h2 className="text-lg font-black text-foreground">Franjas del día</h2>
              </div>
              <div className="mt-5 grid gap-3">
                {(['mediodia', 'tarde', 'noche'] as DeliveryTime[]).map((shift) => {
                  const count = dashboard?.deliveryShifts[shift] ?? 0;
                  const max = Math.max(
                    1,
                    ...(dashboard ? Object.values(dashboard.deliveryShifts) : [0]),
                  );
                  return (
                    <div
                      className="rounded-2xl bg-background p-3 ring-1 ring-border/70"
                      key={shift}
                    >
                      <div className="flex items-center justify-between text-sm font-black">
                        <span className="text-foreground">{deliveryLabels[shift]}</span>
                        <span className="text-primary">{count}</span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-white ring-1 ring-border/60">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${Math.round((count / max) * 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>

            <article className="rounded-2xl border border-border/70 bg-white/85 p-4 shadow-card sm:p-5">
              <div className="flex items-center gap-2">
                <ShoppingBasket className="h-5 w-5 text-primary" aria-hidden="true" />
                <h2 className="text-lg font-black text-foreground">Top variedades</h2>
              </div>
              <div className="mt-5 grid gap-3">
                {dashboard?.topVarieties.length ? (
                  dashboard.topVarieties.slice(0, 5).map((variety, index) => (
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
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-border/70 bg-white/85 p-4 shadow-card sm:p-5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-primary" aria-hidden="true" />
              <h2 className="text-lg font-black text-foreground">Alertas operativas</h2>
            </div>
            <div className="mt-5 grid gap-3">
              {alerts.length ? (
                alerts.map((alert) => (
                  <article
                    className={`rounded-2xl border px-3 py-3 ${alert.tone}`}
                    key={alert.label}
                  >
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

          <section className="rounded-2xl border border-border/70 bg-white/85 p-4 shadow-card sm:p-5">
            <div className="flex items-center gap-2">
              <Clock3 className="h-5 w-5 text-primary" aria-hidden="true" />
              <h2 className="text-lg font-black text-foreground">Próximos pedidos</h2>
            </div>
            <div className="mt-5 grid gap-3">
              {topUpcomingOrders.length ? (
                topUpcomingOrders.map((order) => (
                  <article
                    className="rounded-2xl bg-background px-3 py-3 ring-1 ring-border/70"
                    key={order.id}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="min-w-0 truncate font-black text-foreground">
                        {order.customer.name}
                      </p>
                      <p className="font-black tabular-nums text-foreground">
                        {formatMoney(order.total)}
                      </p>
                    </div>
                    <p className="mt-1 text-xs font-bold text-muted-foreground">
                      {formatDateLabel(order.deliveryDate)} · {deliveryLabels[order.deliveryTime]} ·{' '}
                      {statusLabels[order.status]}
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

          <section className="relative overflow-hidden rounded-2xl border border-border/70 bg-sidebar p-4 text-card shadow-premium sm:p-5">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'radial-gradient(circle at 10% -20%, rgba(210, 138, 45, 0.22), transparent 12rem), radial-gradient(circle at 100% 20%, rgba(181, 74, 50, 0.2), transparent 11rem)',
              }}
            />
            <div className="relative">
            <h2 className="text-lg font-black text-white">Accesos rápidos</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {quickActions.map(({ label, href, icon: Icon, hint }) => (
                <Link
                  className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/10 px-3 py-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:bg-white/15"
                  key={label}
                  to={href}
                >
                  <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/70 to-transparent" />
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-primary shadow-card transition group-hover:scale-105">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="mt-3 block text-sm font-black text-white">{label}</span>
                  <span className="mt-1 block text-[0.68rem] font-bold uppercase tracking-wide text-sidebar-muted">
                    {hint}
                  </span>
                </Link>
              ))}
            </div>
            </div>
          </section>

          <section className="grid grid-cols-3 gap-3">
            <article className="rounded-2xl border border-border/70 bg-white/85 p-3 text-center shadow-card">
              <Users className="mx-auto h-5 w-5 text-primary" aria-hidden="true" />
              <p className="mt-2 text-xl font-black text-foreground">{customers.length}</p>
              <p className="text-[0.68rem] font-black uppercase text-muted-foreground">Clientes</p>
            </article>
            <article className="rounded-2xl border border-border/70 bg-white/85 p-3 text-center shadow-card">
              <ShoppingBasket className="mx-auto h-5 w-5 text-primary" aria-hidden="true" />
              <p className="mt-2 text-xl font-black text-foreground">
                {menuItems.filter((item) => item.isActive).length}
              </p>
              <p className="text-[0.68rem] font-black uppercase text-muted-foreground">Activas</p>
            </article>
            <article className="rounded-2xl border border-border/70 bg-white/85 p-3 text-center shadow-card">
              <Wheat className="mx-auto h-5 w-5 text-primary" aria-hidden="true" />
              <p className="mt-2 text-xl font-black text-foreground">{ingredients.length}</p>
              <p className="text-[0.68rem] font-black uppercase text-muted-foreground">Insumos</p>
            </article>
          </section>
        </aside>
      </section>
    </div>
  );
};
