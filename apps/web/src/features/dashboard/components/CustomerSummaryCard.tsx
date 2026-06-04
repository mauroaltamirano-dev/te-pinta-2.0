import { Link } from 'react-router-dom';
import { ArrowUpRight, Users } from 'lucide-react';

import { formatMoney } from '../dashboard-utils';
import type { DashboardCustomerSummary } from '../dashboard.mock';
import { EmptyState, SectionCard } from './shared';

export const CustomerSummaryCard = ({ summary }: { summary: DashboardCustomerSummary | null }) => (
  <SectionCard className="order-7">
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-primary">
          <Users className="size-4" aria-hidden /> Clientes
        </p>
        <h2 className="mt-1 text-2xl font-black text-foreground">Movimiento comercial</h2>
      </div>
      <Link
        className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-black text-primary transition-colors hover:bg-muted"
        to="/customers"
      >
        Ver clientes <ArrowUpRight className="size-4" aria-hidden />
      </Link>
    </div>

    {!summary ? (
      <EmptyState
        title="No hay clientes para este período"
        description="El resumen se activa cuando existan pedidos asociados a clientes."
      />
    ) : (
      <div className="grid gap-4 lg:grid-cols-[minmax(0,.75fr)_minmax(0,1fr)_minmax(0,.75fr)]">
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <div className="rounded-2xl bg-background p-4 ring-1 ring-border/70">
            <dt className="text-xs font-black uppercase tracking-wide text-muted-foreground">
              Clientes nuevos
            </dt>
            <dd className="mt-1 font-display text-3xl font-black text-primary">
              {summary.newCustomers}
            </dd>
          </div>
          <div className="rounded-2xl bg-background p-4 ring-1 ring-border/70">
            <dt className="text-xs font-black uppercase tracking-wide text-muted-foreground">
              Recurrentes
            </dt>
            <dd className="mt-1 font-display text-3xl font-black text-success">
              {summary.recurringCustomers}
            </dd>
          </div>
        </dl>

        <div className="rounded-[1.35rem] border border-primary/15 bg-primary/5 p-4">
          <p className="text-xs font-black uppercase tracking-wide text-primary">
            Top cliente del período
          </p>
          <h3 className="mt-2 text-xl font-black text-foreground">{summary.topCustomer.name}</h3>
          <p className="mt-2 text-sm font-bold text-muted-foreground">
            {formatMoney(summary.topCustomer.revenue)} · {summary.topCustomer.orders} pedidos
          </p>
        </div>

        <div className="rounded-[1.35rem] border border-border/70 bg-background p-4">
          <p className="text-sm font-black text-foreground">Últimos clientes</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {summary.latestCustomers.map((client) => (
              <span
                className="rounded-full bg-white px-3 py-1 text-xs font-black text-sidebar ring-1 ring-border/70"
                key={client}
              >
                {client}
              </span>
            ))}
          </div>
        </div>
      </div>
    )}
  </SectionCard>
);
