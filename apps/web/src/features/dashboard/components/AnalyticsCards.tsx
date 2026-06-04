import { BarChart3, ShoppingBag } from 'lucide-react';

import { cn } from '@/lib/utils';

import { formatMoney } from '../dashboard-utils';
import type { DashboardVarietySale, DashboardWeeklySale } from '../dashboard.mock';
import { EmptyState, SectionCard } from './shared';

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
                      className={cn(
                        'w-full rounded-t-2xl',
                        isPeak ? 'bg-primary' : 'bg-accent/75',
                      )}
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
