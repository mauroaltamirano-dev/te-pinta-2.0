import { type ComponentType } from 'react';
import { AlertTriangle, CheckCircle2, ChevronRight, Info } from 'lucide-react';

import { cn } from '@/lib/utils';

import type { DashboardAlert, DashboardAlertLevel } from '../dashboard.mock';

const alertClasses: Record<DashboardAlertLevel, string> = {
  critical: 'border-red-200 bg-red-50 text-red-950 ring-red-100',
  warning: 'border-amber-200 bg-amber-50 text-amber-950 ring-amber-100',
  info: 'border-border bg-white text-foreground ring-border/80',
};

const alertIconClasses: Record<DashboardAlertLevel, string> = {
  critical: 'bg-red-100 text-red-700',
  warning: 'bg-amber-100 text-amber-700',
  info: 'bg-muted text-sidebar',
};

const alertIcons: Record<
  DashboardAlertLevel,
  ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
> = {
  critical: AlertTriangle,
  warning: AlertTriangle,
  info: Info,
};

export const AlertPill = ({ alert }: { alert: DashboardAlert }) => {
  const Icon = alertIcons[alert.level];

  return (
    <article
      className={cn(
        'flex items-start gap-3 rounded-[1.35rem] border px-4 py-3 shadow-card ring-1',
        alertClasses[alert.level],
      )}
    >
      <span
        className={cn(
          'mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl',
          alertIconClasses[alert.level],
        )}
      >
        <Icon className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-black leading-snug">{alert.title}</p>
        <p className="mt-0.5 text-sm font-semibold opacity-80">{alert.detail}</p>
      </div>
      <ChevronRight className="mt-2 size-4 shrink-0 opacity-55" aria-hidden />
    </article>
  );
};

export const CriticalAlertsBar = ({ alerts }: { alerts: DashboardAlert[] }) => (
  <section className="order-1 md:order-2" aria-label="Alertas críticas">
    {alerts.length === 0 ? (
      <div className="rounded-[1.5rem] border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-800 shadow-card">
        <CheckCircle2 className="mr-2 inline size-4" aria-hidden /> No hay alertas críticas en este
        momento.
      </div>
    ) : (
      <div className="grid gap-3 lg:grid-cols-3">
        {alerts.slice(0, 3).map((alert) => (
          <AlertPill alert={alert} key={alert.id} />
        ))}
      </div>
    )}
  </section>
);
