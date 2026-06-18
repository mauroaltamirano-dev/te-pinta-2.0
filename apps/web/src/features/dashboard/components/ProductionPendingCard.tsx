import { AlertTriangle, CheckCircle2, Factory, PackageOpen } from 'lucide-react';

import { formatDozens, formatQuantity } from '../dashboard-utils';
import type { DashboardProductionItem, DashboardProductionSummary } from '../dashboard.mock';
import { EmptyState, SectionCard } from './shared';

const ProductionChip = ({ item }: { item: DashboardProductionItem }) => (
  <div className="flex items-center justify-between rounded-2xl bg-white px-3 py-2 ring-1 ring-border/70">
    <span className="min-w-0 truncate text-sm font-bold text-foreground">{item.name}</span>
    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-black text-primary ring-1 ring-primary/15">
      {formatDozens(item.dozens)}
    </span>
  </div>
);

export const ProductionPendingCard = ({ summary }: { summary: DashboardProductionSummary }) => (
  <SectionCard className="bg-gradient-to-br from-white via-card to-crema-maiz/55">
    <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div>
        <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-primary">
          <Factory className="size-4" aria-hidden /> Producción pendiente
        </p>
        <h2 className="mt-1 text-2xl font-black tracking-tight text-foreground">
          Qué hay que producir
        </h2>
        <p className="mt-1 text-sm font-semibold text-muted-foreground">
          Hoy, mañana, variedades y packaging necesario para operar sin improvisar.
        </p>
      </div>
      <div className="rounded-[1.35rem] bg-sidebar px-4 py-3 text-white shadow-card">
        <p className="text-xs font-black uppercase tracking-wide text-sidebar-muted">
          Total pendiente
        </p>
        <p className="font-sans text-3xl font-black tabular-nums">
          {formatDozens(summary.totalDozens)}
        </p>
      </div>
    </div>

    {summary.totalDozens <= 0 ? (
      <EmptyState
        title="No hay producción pendiente"
        description="Los pedidos confirmados por producir van a aparecer acá."
      />
    ) : (
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(16rem,.65fr)]">
        <div className="grid gap-4">
          <dl className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-white/85 p-4 ring-1 ring-border/70">
              <dt className="text-xs font-black uppercase tracking-wide text-muted-foreground">
                Hoy
              </dt>
              <dd className="mt-1 font-sans text-3xl font-black text-primary">
                {formatDozens(summary.todayDozens)}
              </dd>
            </div>
            <div className="rounded-2xl bg-white/85 p-4 ring-1 ring-border/70">
              <dt className="text-xs font-black uppercase tracking-wide text-muted-foreground">
                Mañana
              </dt>
              <dd className="mt-1 font-sans text-3xl font-black text-success">
                {formatDozens(summary.tomorrowDozens)}
              </dd>
            </div>
          </dl>

          <div>
            <h3 className="text-sm font-black text-foreground">Variedades necesarias</h3>
            {summary.varieties.length === 0 ? (
              <p className="mt-2 rounded-2xl border border-dashed border-border bg-white/70 p-4 text-sm font-bold text-muted-foreground">
                Hay docenas pendientes, pero la API de listado no trajo detalle de variedades.
              </p>
            ) : (
              <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {summary.varieties.map((item) => (
                  <ProductionChip item={item} key={item.name} />
                ))}
              </div>
            )}
          </div>
        </div>

        <aside className="rounded-[1.35rem] border border-border/70 bg-white/85 p-4">
          <h3 className="flex items-center gap-2 text-sm font-black text-foreground">
            <PackageOpen className="size-4 text-primary" aria-hidden /> Packaging necesario
          </h3>
          <div className="mt-3 grid gap-2">
            {summary.packaging.length === 0 ? (
              <p className="text-sm font-bold text-muted-foreground">Sin packaging pendiente.</p>
            ) : (
              summary.packaging.map((item) => (
                <div
                  className="flex items-center justify-between rounded-2xl bg-background px-3 py-2 ring-1 ring-border/70"
                  key={item.name}
                >
                  <span className="text-sm font-bold text-foreground">{item.name}</span>
                  <span className="font-black text-sidebar tabular-nums">
                    {formatQuantity(item.dozens)}
                  </span>
                </div>
              ))
            )}
          </div>
          {summary.stockAlert ? (
            <p className="mt-4 rounded-2xl bg-amber-50 px-3 py-2 text-sm font-black text-amber-900 ring-1 ring-amber-100">
              <AlertTriangle className="mr-2 inline size-4" aria-hidden /> {summary.stockAlert}
            </p>
          ) : (
            <p className="mt-4 rounded-2xl bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-800 ring-1 ring-emerald-100">
              <CheckCircle2 className="mr-2 inline size-4" aria-hidden /> Stock sin alertas
              registradas.
            </p>
          )}
        </aside>
      </div>
    )}
  </SectionCard>
);
