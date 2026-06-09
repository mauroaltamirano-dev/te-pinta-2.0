import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, BarChart3, ShoppingBag, Users } from 'lucide-react';

import { cn } from '@/lib/utils';

import { formatMoney, getMoneyAxisTicks, type DashboardMoneyChartPoint } from '../dashboard-utils';
import type {
  DashboardCustomerSummary,
  DashboardVarietySale,
  DashboardWeeklySale,
} from '../dashboard.mock';
import { EmptyState, SectionCard, StatusBadge } from './shared';

type MoneyChartMode = 'sales' | 'purchases';

type MoneyChartConfig = {
  label: string;
  eyebrow: string;
  totalLabel: string;
  emptyTitle: string;
  emptyDescription: string;
  toneClassName: string;
  points: DashboardMoneyChartPoint[];
};

const MoneyChart = ({ config }: { config: MoneyChartConfig }) => {
  const total = config.points.reduce((sum, point) => sum + point.value, 0);
  const maxValue = Math.max(...config.points.map((point) => point.value), 0);
  const axisTicks = getMoneyAxisTicks(maxValue);
  const peak = config.points.reduce<DashboardMoneyChartPoint | null>(
    (best, point) => (!best || point.value > best.value ? point : best),
    null,
  );

  if (config.points.length === 0 || total === 0) {
    return <EmptyState title={config.emptyTitle} description={config.emptyDescription} />;
  }

  return (
    <>
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <p className="rounded-2xl bg-background px-3 py-2 text-sm font-black text-sidebar ring-1 ring-border/70">
          {config.totalLabel}: {formatMoney(total)}
        </p>
        <p className="rounded-2xl bg-muted px-3 py-2 text-sm font-black text-muted-foreground ring-1 ring-border/70">
          Pico: {peak?.day ?? 'Sin dato'} · {formatMoney(peak?.value ?? 0)}
        </p>
      </div>

      <div className="grid grid-cols-[4.25rem_minmax(0,1fr)] gap-3 rounded-[1.35rem] border border-border/70 bg-gradient-to-br from-white to-crema-maiz/55 p-4">
        <div className="flex h-72 flex-col justify-between text-right text-[0.7rem] font-black tabular-nums text-muted-foreground sm:h-56">
          {axisTicks.map((tick) => (
            <span key={tick}>{formatMoney(tick)}</span>
          ))}
        </div>
        <div className="flex h-72 min-w-0 items-end gap-1.5 sm:h-56 sm:gap-3">
          {config.points.map((point) => (
            <div className="flex h-full min-w-0 flex-1 flex-col justify-end gap-2" key={point.date}>
              <div className="flex min-h-0 items-end">
                <div
                  aria-label={`${point.day}: ${formatMoney(point.value)} en ${config.label.toLowerCase()}`}
                  className={cn('w-full rounded-t-2xl', config.toneClassName)}
                  style={{ height: `${Math.max((point.value / Math.max(maxValue, 1)) * 100, 8)}%` }}
                />
              </div>
              <span className="truncate text-center text-[0.65rem] font-black uppercase text-muted-foreground sm:text-[0.7rem]">
                {point.day}
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export const GeneralSummaryChart = ({
  purchaseSeries,
  salesSeries,
}: {
  purchaseSeries: DashboardMoneyChartPoint[];
  salesSeries: DashboardMoneyChartPoint[];
}) => {
  const [mode, setMode] = useState<MoneyChartMode>('sales');
  const configs: Record<MoneyChartMode, MoneyChartConfig> = {
    sales: {
      label: 'Ventas',
      eyebrow: 'Ingresos',
      totalLabel: 'Ventas registradas',
      emptyTitle: 'No hay ventas en el período',
      emptyDescription: 'El gráfico se completa con ventas por fecha de entrega.',
      toneClassName: 'bg-primary',
      points: salesSeries,
    },
    purchases: {
      label: 'Compras',
      eyebrow: 'Gastos',
      totalLabel: 'Compras registradas',
      emptyTitle: 'No hay compras en el período',
      emptyDescription:
        'El gráfico toma compras activas registradas en Gestión y excluye anuladas.',
      toneClassName: 'bg-accent/80',
      points: purchaseSeries,
    },
  };
  const activeConfig = configs[mode];

  return (
    <SectionCard className="order-4" aria-label="Resumen general">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-primary">
            <BarChart3 className="size-4" aria-hidden /> {activeConfig.eyebrow}
          </p>
          <h2 className="mt-1 text-xl font-black text-foreground">Resumen general</h2>
        </div>
        <div className="inline-flex rounded-full bg-muted p-1 ring-1 ring-border/70">
          {(['sales', 'purchases'] as const).map((option) => {
            const isActive = mode === option;

            return (
              <button
                aria-pressed={isActive}
                className={cn(
                  'rounded-full px-3 py-2 text-xs font-black transition-colors',
                  isActive
                    ? 'bg-sidebar text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                key={option}
                onClick={() => setMode(option)}
                type="button"
              >
                {configs[option].label}
              </button>
            );
          })}
        </div>
      </div>

      <MoneyChart config={activeConfig} />
    </SectionCard>
  );
};

export const VarietySalesChart = ({ varieties }: { varieties: DashboardVarietySale[] }) => {
  const bestSeller = varieties.reduce<DashboardVarietySale | null>(
    (best, variety) => (!best || variety.units > best.units ? variety : best),
    null,
  );

  return (
    <SectionCard>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-primary">
            <ShoppingBag className="size-4" aria-hidden /> Ventas por variedad
          </p>
          <h2 className="mt-1 text-xl font-black text-foreground">Más elegidas</h2>
        </div>
        {bestSeller ? (
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary ring-1 ring-primary/15">
            Top: {bestSeller.name}
          </span>
        ) : null}
      </div>
      {varieties.length === 0 ? (
        <EmptyState
          title="No hay ventas en el período"
          description="Las variedades vendidas van a aparecer cuando existan pedidos."
        />
      ) : (
        <div className="grid gap-3">
          {varieties.slice(0, 8).map((variety) => {
            const isBest = bestSeller?.name === variety.name;

            return (
              <div key={variety.name}>
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <span className="truncate text-sm font-black text-foreground">
                    {variety.name}
                  </span>
                  <span className="whitespace-nowrap text-xs font-black text-muted-foreground">
                    {variety.units} unidades · {variety.percent}%
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-muted ring-1 ring-border/70">
                  <div
                    className={cn('h-full rounded-full', isBest ? 'bg-primary' : 'bg-success/75')}
                    style={{ width: `${Math.max(variety.percent, 4)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
};

const CustomerAnalyticsPanel = ({ summary }: { summary: DashboardCustomerSummary | null }) => (
  <article className="rounded-[1.35rem] border border-border/70 bg-background/80 p-4">
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-primary">
          <Users className="size-4" aria-hidden /> Clientes
        </p>
        <h3 className="mt-1 text-xl font-black text-foreground">Top clientes</h3>
      </div>
      <Link
        aria-label="Ver clientes"
        className="grid size-10 shrink-0 place-items-center rounded-full border border-border bg-white text-primary transition-colors hover:bg-muted"
        to="/customers"
      >
        <ArrowUpRight className="size-4" aria-hidden />
      </Link>
    </div>

    {!summary ? (
      <EmptyState
        title="No hay clientes para este período"
        description="El resumen se activa cuando existan pedidos asociados a clientes."
      />
    ) : (
      <div className="space-y-4">
        <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
          <p className="text-xs font-black uppercase tracking-wide text-primary">
            Mejor cliente del período
          </p>
          <h4 className="mt-2 text-lg font-black text-foreground">{summary.topCustomer.name}</h4>
          <p className="mt-1 text-sm font-bold text-muted-foreground">
            {formatMoney(summary.topCustomer.revenue)} · {summary.topCustomer.orders} pedidos
          </p>
        </div>
        <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <div className="rounded-2xl bg-white p-3 ring-1 ring-border/70">
            <dt className="text-xs font-black uppercase tracking-wide text-muted-foreground">
              Nuevos
            </dt>
            <dd className="mt-1 text-2xl font-black text-primary">{summary.newCustomers}</dd>
          </div>
          <div className="rounded-2xl bg-white p-3 ring-1 ring-border/70">
            <dt className="text-xs font-black uppercase tracking-wide text-muted-foreground">
              Recurrentes
            </dt>
            <dd className="mt-1 text-2xl font-black text-success">{summary.recurringCustomers}</dd>
          </div>
        </dl>
      </div>
    )}
  </article>
);

const TopProductsPanel = ({ varieties }: { varieties: DashboardVarietySale[] }) => {
  const bestSeller = varieties.reduce<DashboardVarietySale | null>(
    (best, variety) => (!best || variety.units > best.units ? variety : best),
    null,
  );

  return (
    <article className="rounded-[1.35rem] border border-border/70 bg-background/80 p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-primary">
            <ShoppingBag className="size-4" aria-hidden /> Ventas por variedad
          </p>
          <h3 className="mt-1 text-xl font-black text-foreground">Productos más vendidos</h3>
        </div>
        {bestSeller ? <StatusBadge tone="info">Top: {bestSeller.name}</StatusBadge> : null}
      </div>

      {varieties.length === 0 ? (
        <EmptyState
          title="No hay ventas en el período"
          description="Las variedades vendidas van a aparecer cuando existan pedidos."
        />
      ) : (
        <div className="grid gap-2">
          {varieties.slice(0, 5).map((variety, index) => (
            <div
              className="flex items-center justify-between gap-3 rounded-2xl bg-white px-3 py-2 ring-1 ring-border/70"
              key={variety.name}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-foreground">
                  {index + 1}. {variety.name}
                </p>
                <p className="text-xs font-bold text-muted-foreground">{variety.percent}% mix</p>
              </div>
              <p className="shrink-0 text-sm font-black tabular-nums text-sidebar">
                {variety.units} u.
              </p>
            </div>
          ))}
        </div>
      )}
    </article>
  );
};

const VarietyPerformancePanel = ({ varieties }: { varieties: DashboardVarietySale[] }) => {
  const maxUnits = Math.max(...varieties.map((variety) => variety.units), 1);

  return (
    <article className="rounded-[1.35rem] border border-border/70 bg-background/80 p-4">
      <div className="mb-4">
        <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-primary">
          <BarChart3 className="size-4" aria-hidden /> Performance
        </p>
        <h3 className="mt-1 text-xl font-black text-foreground">Desempeño por variedad</h3>
      </div>

      {varieties.length === 0 ? (
        <EmptyState
          title="No hay desempeño para mostrar"
          description="El ranking se completa con las variedades vendidas en el período."
        />
      ) : (
        <div className="grid gap-3">
          {varieties.slice(0, 6).map((variety) => (
            <div key={variety.name}>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <span className="truncate text-sm font-black text-foreground">{variety.name}</span>
                <span className="whitespace-nowrap text-xs font-black text-muted-foreground">
                  {variety.units} unidades
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-white ring-1 ring-border/70">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.max((variety.units / maxUnits) * 100, 6)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </article>
  );
};

export const CommercialAnalyticsSection = ({
  filterControls,
  summary,
  varieties,
}: {
  filterControls?: ReactNode;
  summary: DashboardCustomerSummary | null;
  varieties: DashboardVarietySale[];
}) => (
  <SectionCard className="order-6" aria-label="Analítica comercial">
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">
          Analítica comercial
        </p>
        <h2 className="mt-1 text-2xl font-black text-foreground">
          Clientes, productos y desempeño
        </h2>
      </div>
      {filterControls}
    </div>

    <div className="grid gap-4 xl:grid-cols-3">
      <CustomerAnalyticsPanel summary={summary} />
      <TopProductsPanel varieties={varieties} />
      <VarietyPerformancePanel varieties={varieties} />
    </div>
  </SectionCard>
);

export const WeeklySalesChart = ({ weeklySales }: { weeklySales: DashboardWeeklySale[] }) => {
  const total = weeklySales.reduce((sum, day) => sum + day.value, 0);
  const maxValue = Math.max(...weeklySales.map((day) => day.value), 1);
  const peak = weeklySales.reduce<DashboardWeeklySale | null>(
    (best, day) => (!best || day.value > best.value ? day : best),
    null,
  );

  return (
    <SectionCard>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-primary">
            <BarChart3 className="size-4" aria-hidden /> Ventas semanales
          </p>
          <h2 className="mt-1 text-xl font-black text-foreground">Ritmo de venta</h2>
        </div>
        <div className="rounded-2xl bg-background px-3 py-2 text-sm font-black text-sidebar ring-1 ring-border/70">
          Total semanal: {formatMoney(total)}
        </div>
      </div>

      {weeklySales.length === 0 || total === 0 ? (
        <EmptyState
          title="No hay ventas en el período"
          description="El gráfico semanal se completa con ventas por fecha de entrega."
        />
      ) : (
        <>
          <div className="flex h-56 items-end gap-2 rounded-[1.35rem] border border-border/70 bg-gradient-to-br from-white to-crema-maiz/55 p-4 sm:gap-3">
            {weeklySales.map((day) => {
              const isPeak = peak?.day === day.day;

              return (
                <div
                  className="flex h-full min-w-0 flex-1 flex-col justify-end gap-2"
                  key={day.day}
                >
                  <div className="flex min-h-0 items-end">
                    <div
                      aria-label={`${day.day}: ${formatMoney(day.value)}`}
                      className={cn('w-full rounded-t-2xl', isPeak ? 'bg-primary' : 'bg-accent/75')}
                      style={{ height: `${Math.max((day.value / maxValue) * 100, 8)}%` }}
                    />
                  </div>
                  <span className="truncate text-center text-[0.7rem] font-black uppercase text-muted-foreground">
                    {day.day}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <p className="rounded-2xl bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-800 ring-1 ring-emerald-100">
              +12,4% vs semana anterior
            </p>
            <p className="rounded-2xl bg-background px-3 py-2 text-sm font-black text-sidebar ring-1 ring-border/70">
              Pico de ventas: {peak?.day ?? 'Sin dato'}
            </p>
          </div>
        </>
      )}
    </SectionCard>
  );
};
