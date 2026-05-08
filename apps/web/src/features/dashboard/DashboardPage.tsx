import { useState } from 'react';

import type { DeliveryTime } from '@te-pinta/shared';

import { useDailyDashboard } from './dashboard-hooks';

const deliveryLabels: Record<DeliveryTime, string> = {
  mediodia: 'Mediodía',
  tarde: 'Tarde',
  noche: 'Noche',
};

const today = (): string => new Date().toISOString().slice(0, 10);

const formatMoney = (value: number): string => `$ ${Math.round(value).toLocaleString('es-AR')}`;

export const DashboardPage = () => {
  const [date, setDate] = useState(today);
  const dashboardQuery = useDailyDashboard({ date });
  const dashboard = dashboardQuery.data;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">Phase 4.6</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-foreground md:text-3xl">
              Dashboard
            </h2>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Resumen operativo diario basado solamente en pedidos del MVP.
            </p>
          </div>
          <label className="w-full max-w-xs text-sm font-bold text-foreground">
            Fecha del dashboard
            <input
              className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-ring focus:ring-4 focus:ring-ring/20"
              onChange={(event) => setDate(event.target.value)}
              type="date"
              value={date}
            />
          </label>
        </div>
      </section>

      {dashboardQuery.isLoading ? (
        <p className="rounded-3xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Cargando dashboard...
        </p>
      ) : null}

      {dashboardQuery.isError ? (
        <p className="rounded-3xl border border-destructive/20 bg-destructive/10 p-6 text-sm font-semibold text-destructive">
          No se pudo cargar el dashboard.
        </p>
      ) : null}

      {dashboard ? (
        <>
          <section className="grid gap-4 md:grid-cols-3">
            <article className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <p className="text-sm font-bold text-muted-foreground">Pedidos</p>
              <p className="mt-3 text-4xl font-black text-foreground">{dashboard.orderCount}</p>
            </article>
            <article className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <p className="text-sm font-bold text-muted-foreground">Facturación</p>
              <p className="mt-3 text-4xl font-black text-foreground">
                {formatMoney(dashboard.totalRevenue)}
              </p>
            </article>
            <article className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <p className="text-sm font-bold text-muted-foreground">Fecha</p>
              <p className="mt-3 text-4xl font-black text-foreground">{dashboard.date}</p>
            </article>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <article className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <h3 className="text-lg font-black text-foreground">Franjas de entrega</h3>
              <div className="mt-5 grid gap-3">
                {(Object.keys(dashboard.deliveryShifts) as DeliveryTime[]).map((shift) => (
                  <p
                    className="flex items-center justify-between rounded-2xl border border-border bg-background px-4 py-3 text-sm font-bold text-foreground"
                    key={shift}
                  >
                    <span>{deliveryLabels[shift]}</span>
                    <span>{dashboard.deliveryShifts[shift]}</span>
                  </p>
                ))}
              </div>
            </article>

            <article className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <h3 className="text-lg font-black text-foreground">Top variedades</h3>
              <div className="mt-5 grid gap-3">
                {dashboard.topVarieties.length > 0 ? (
                  dashboard.topVarieties.map((variety) => (
                    <div
                      className="rounded-2xl border border-border bg-background px-4 py-3"
                      key={variety.menuItemId}
                    >
                      <p className="font-black text-foreground">{variety.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {variety.quantity} unidades
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No hay variedades para esta fecha.
                  </p>
                )}
              </div>
            </article>
          </section>
        </>
      ) : null}
    </div>
  );
};
