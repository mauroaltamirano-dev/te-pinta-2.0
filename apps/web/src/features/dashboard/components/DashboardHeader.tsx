import { Link } from 'react-router-dom';
import { CalendarDays, Clock3, Gauge, Plus, ReceiptText } from 'lucide-react';

import { formatHeaderDate } from '../dashboard-utils';

const timeFormatter = new Intl.DateTimeFormat('es-AR', {
  hour: '2-digit',
  minute: '2-digit',
});

export const DashboardHeader = ({ date }: { date: string }) => (
  <header className="relative overflow-hidden rounded-[1.75rem] border border-white/70 bg-sidebar p-5 text-white shadow-card">
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(210,138,45,.24),transparent_16rem),radial-gradient(circle_at_90%_20%,rgba(181,74,50,.18),transparent_14rem)]" />
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-primary via-accent to-success" />

    <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-crema-maiz ring-1 ring-white/10">
          <Gauge className="size-3.5" aria-hidden /> Centro operativo
        </p>
        <h1 className="mt-3 font-display text-3xl font-black tracking-tight md:text-4xl">
          Dashboard general
        </h1>
        <p className="mt-1 max-w-2xl text-sm font-semibold text-sidebar-muted">
          Resumen operativo y financiero del emprendimiento.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-sm font-black text-white">
          <span className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-3 py-2 ring-1 ring-white/10">
            <CalendarDays className="size-4 text-accent" aria-hidden /> {formatHeaderDate(date)}
          </span>
          <span className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-3 py-2 ring-1 ring-white/10">
            <Clock3 className="size-4 text-accent" aria-hidden /> Actualizado{' '}
            {timeFormatter.format(new Date())}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row lg:items-center">
        <Link
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-black text-white shadow-primary-glow transition-colors hover:bg-primary/90"
          to="/orders"
        >
          <Plus className="size-4" aria-hidden /> Nuevo pedido
        </Link>
        <Link
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 text-sm font-black text-white transition-colors hover:bg-white/15"
          to="/finanzas?section=purchases"
        >
          <ReceiptText className="size-4" aria-hidden /> Registrar gasto
        </Link>
      </div>
    </div>
  </header>
);
