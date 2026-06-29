import { type ComponentType } from 'react';
import { Info, TrendingDown, TrendingUp } from 'lucide-react';

import { cn } from '@/lib/utils';

import type { DashboardTrendDirection } from '../dashboard-api';
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

export const KpiCard = ({
  kpi,
  className,
  compactOnMobile = false,
}: {
  kpi: KpiCardData;
  className?: string;
  compactOnMobile?: boolean;
}) => {
  const Icon = kpi.icon;
  const TrendIcon = trendIcons[kpi.comparison.direction];

  return (
    <article
      aria-label={`${kpi.title}: ${kpi.value}`}
      className={cn(
        'relative overflow-hidden border border-white/80 bg-white shadow-card',
        compactOnMobile
          ? 'rounded-[1.35rem] p-3 lg:rounded-[1.65rem] lg:p-5'
          : 'rounded-[1.65rem] p-4 sm:p-5',
        className,
      )}
    >
      <div className="pointer-events-none absolute -right-10 -top-10 size-28 rounded-full bg-primary/5" />
      <div
        className={cn(
          'relative flex items-start justify-between',
          compactOnMobile ? 'gap-1.5 lg:gap-4' : 'gap-4',
        )}
      >
        <span
          className={cn(
            'grid shrink-0 place-items-center bg-gradient-to-br ring-1',
            compactOnMobile ? 'size-8 rounded-xl lg:size-12 lg:rounded-2xl' : 'size-12 rounded-2xl',
            kpiAccentClasses[kpi.accent],
          )}
        >
          <Icon className={cn(compactOnMobile ? 'size-4 lg:size-5' : 'size-5')} aria-hidden />
        </span>
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black ring-1',
            compactOnMobile &&
              'max-w-[4.75rem] px-2 text-[0.62rem] lg:max-w-none lg:px-2.5 lg:text-xs',
            trendClasses[kpi.comparison.direction],
          )}
        >
          <TrendIcon className="size-3.5" aria-hidden />
          {kpi.comparison.value}
        </span>
      </div>
      <h3
        className={cn(
          'relative font-black uppercase text-muted-foreground',
          compactOnMobile
            ? 'mt-3 min-h-8 text-[0.64rem] leading-4 tracking-[0.12em] lg:mt-5 lg:min-h-0 lg:text-xs lg:leading-normal lg:tracking-[0.18em]'
            : 'mt-5 text-xs tracking-[0.18em]',
        )}
      >
        {kpi.title}
      </h3>
      <p
        className={cn(
          'relative font-sans font-black tracking-tight text-foreground tabular-nums',
          compactOnMobile ? 'mt-1 text-[1.35rem] lg:mt-2 lg:text-3xl' : 'mt-2 text-3xl',
        )}
      >
        {kpi.value}
      </p>
      <p
        className={cn(
          'relative mt-2 text-xs font-bold text-muted-foreground',
          compactOnMobile && 'hidden lg:block',
        )}
      >
        {kpi.comparison.label}
      </p>
      {kpi.helpText ? (
        <p
          className={cn(
            'relative mt-3 text-xs font-semibold text-muted-foreground',
            compactOnMobile && 'hidden lg:block',
          )}
        >
          {kpi.helpText}
        </p>
      ) : null}
    </article>
  );
};
