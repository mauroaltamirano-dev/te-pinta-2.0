import { type ComponentType } from 'react';
import { Info, TrendingDown, TrendingUp } from 'lucide-react';

import { cn } from '@/lib/utils';

import type { DashboardTrendDirection } from '../dashboard.mock';
import type { KpiCardData } from '../dashboard-utils';

const trendClasses: Record<DashboardTrendDirection, string> = {
  positive: 'bg-emerald-50 text-emerald-800 ring-emerald-100',
  negative: 'bg-red-50 text-red-800 ring-red-100',
  neutral: 'bg-stone-100 text-muted-foreground ring-border/80',
};

const trendIcons: Record<
  DashboardTrendDirection,
  ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
> = {
  positive: TrendingUp,
  negative: TrendingDown,
  neutral: Info,
};

const kpiAccentClasses: Record<KpiCardData['accent'], string> = {
  primary: 'from-primary/12 to-accent/10 text-primary ring-primary/15',
  success: 'from-emerald-500/10 to-verde-yerba/10 text-emerald-700 ring-emerald-100',
  warning: 'from-amber-500/12 to-oro-horno/10 text-amber-700 ring-amber-100',
  danger: 'from-red-500/10 to-primary/10 text-red-700 ring-red-100',
  olive: 'from-verde-yerba/12 to-emerald-500/10 text-success ring-success/15',
  neutral: 'from-sidebar/10 to-primary/5 text-sidebar ring-sidebar/10',
};

export const KpiCard = ({ kpi, className }: { kpi: KpiCardData; className?: string }) => {
  const Icon = kpi.icon;
  const TrendIcon = trendIcons[kpi.comparison.direction];

  return (
    <article
      aria-label={`${kpi.title}: ${kpi.value}`}
      className={cn(
        'relative overflow-hidden rounded-[1.65rem] border border-white/80 bg-white p-4 shadow-card sm:p-5',
        className,
      )}
    >
      <div className="pointer-events-none absolute -right-10 -top-10 size-28 rounded-full bg-primary/5" />
      <div className="relative flex items-start justify-between gap-4">
        <span
          className={cn(
            'grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ring-1',
            kpiAccentClasses[kpi.accent],
          )}
        >
          <Icon className="size-5" aria-hidden />
        </span>
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black ring-1',
            trendClasses[kpi.comparison.direction],
          )}
        >
          <TrendIcon className="size-3.5" aria-hidden />
          {kpi.comparison.value}
        </span>
      </div>
      <h3 className="relative mt-5 text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">
        {kpi.title}
      </h3>
      <p className="relative mt-2 font-display text-3xl font-black tracking-tight text-foreground tabular-nums">
        {kpi.value}
      </p>
      <p className="relative mt-2 text-xs font-bold text-muted-foreground">
        {kpi.comparison.label}
      </p>
      {kpi.helpText ? (
        <p className="relative mt-3 text-xs font-semibold text-muted-foreground">{kpi.helpText}</p>
      ) : null}
    </article>
  );
};
