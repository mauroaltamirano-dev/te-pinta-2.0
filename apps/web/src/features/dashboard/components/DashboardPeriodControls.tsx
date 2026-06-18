import { cn } from '@/lib/utils';

import {
  periodOptions,
  type DashboardPeriod,
  type PeriodRange,
} from '../dashboard-utils';

type DashboardPeriodControlsProps = {
  ariaLabel: string;
  customEndDate: string;
  customStartDate: string;
  date: string;
  onCustomEndDateChange: (value: string) => void;
  onCustomStartDateChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onPeriodChange: (value: DashboardPeriod) => void;
  period: DashboardPeriod;
  periodRange: PeriodRange;
  showDateControls?: boolean;
};

export const DashboardPeriodControls = ({
  ariaLabel,
  customEndDate,
  customStartDate,
  date,
  onCustomEndDateChange,
  onCustomStartDateChange,
  onDateChange,
  onPeriodChange,
  period,
  periodRange,
  showDateControls = false,
}: DashboardPeriodControlsProps) => (
  <fieldset
    aria-label={ariaLabel}
    className="rounded-[1.35rem] border border-white/80 bg-white p-4 shadow-card"
  >
    <legend className="sr-only">{ariaLabel}</legend>
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">{ariaLabel}</p>
        <p className="mt-1 text-sm font-bold text-muted-foreground">{periodRange.label}</p>
      </div>
      <div className="grid gap-3 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-end">
        {showDateControls ? (
          <label className="grid gap-1.5 text-xs font-black uppercase tracking-wide text-muted-foreground">
            Fecha de referencia
            <input
              className="min-h-10 rounded-2xl border border-border bg-background px-4 text-sm font-black text-sidebar outline-none transition-colors focus:border-accent focus:ring-4 focus:ring-accent/25"
              onChange={(event) => onDateChange(event.target.value)}
              type="date"
              value={date}
            />
          </label>
        ) : null}
        <div className="inline-grid min-h-10 grid-cols-2 overflow-hidden rounded-2xl bg-muted p-1 ring-1 ring-border/70 sm:grid-cols-4">
          {periodOptions.map((option) => {
            const isSelected = option.value === period;

            return (
              <button
                aria-pressed={isSelected}
                className={cn(
                  'rounded-xl px-3 py-2 text-xs font-black transition-colors',
                  isSelected
                    ? 'bg-sidebar text-white shadow-sm'
                    : 'text-muted-foreground hover:bg-white hover:text-foreground',
                )}
                key={option.value}
                onClick={() => onPeriodChange(option.value)}
                type="button"
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>

    {showDateControls && period === 'custom' ? (
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <label className="text-xs font-black uppercase tracking-wide text-muted-foreground">
          Desde
          <input
            className="mt-1 min-h-10 w-full rounded-2xl border border-border bg-background px-4 text-sm font-black text-sidebar outline-none transition-colors focus:border-accent focus:ring-4 focus:ring-accent/25"
            onChange={(event) => onCustomStartDateChange(event.target.value)}
            type="date"
            value={customStartDate}
          />
        </label>
        <label className="text-xs font-black uppercase tracking-wide text-muted-foreground">
          Hasta
          <input
            className="mt-1 min-h-10 w-full rounded-2xl border border-border bg-background px-4 text-sm font-black text-sidebar outline-none transition-colors focus:border-accent focus:ring-4 focus:ring-accent/25"
            onChange={(event) => onCustomEndDateChange(event.target.value)}
            type="date"
            value={customEndDate}
          />
        </label>
      </div>
    ) : null}
  </fieldset>
);
